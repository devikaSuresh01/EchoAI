import asyncio
import sys
import time
import types

from sqlalchemy import select

from constants.echoai import (
    AUDIO_UPLOAD_TOO_LARGE_MESSAGE,
    MAX_AUDIO_UPLOAD_BYTES,
    MAX_TRANSCRIPT_UPLOAD_BYTES,
    TRANSCRIPT_UPLOAD_TOO_LARGE_MESSAGE,
)
from echo_backend.models import DeviceToken, Meeting
from echo_backend.services.fcm import send_high_risk_notification


def auth_headers(token: str = "valid-token") -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def wait_for_job_completion(client, queued_response, *, headers=None) -> dict:
    job_id = queued_response.json()["job_id"]

    for _ in range(200):
        response = client.get(f"/upload-jobs/{job_id}", headers=headers)
        assert response.status_code == 200
        payload = response.json()
        if payload["status"] in {"completed", "failed"}:
            return payload
        time.sleep(0.01)

    raise AssertionError(f"upload job {job_id} did not finish in time")


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_transcribe_audio_rejects_unsupported_format(client):
    response = client.post(
        "/transcribe-audio",
        files={"audio_file": ("bad.txt", b"nope", "text/plain")},
        data={"meeting_id": "mtg_1"},
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "unsupported audio format"}


def test_transcribe_audio_rejects_mp4_upload(client):
    response = client.post(
        "/transcribe-audio",
        files={"audio_file": ("meeting.mp4", b"nope", "audio/mp4")},
        data={"meeting_id": "mtg_mp4"},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "unsupported audio format"}


def test_process_file_rejects_unsupported_type(client):
    response = client.post(
        "/process-file",
        files={"file": ("bad.csv", b"bad,data", "text/csv")},
        data={"meeting_id": "mtg_1"},
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "unsupported file type"}


def test_process_file_persists_meeting_and_items(client, sessionmaker_fixture):
    queued = client.post(
        "/process-file",
        files={"file": ("meeting.txt", b"Alice will review privacy controls next sprint.", "text/plain")},
        data={
            "meeting_id": "mtg_1",
            "title": "Sprint Review",
            "meeting_date": "2026-04-17",
            "participants": "Alice, Bob",
        },
    )

    assert queued.status_code == 200
    assert queued.json()["status"] == "queued"
    payload = wait_for_job_completion(client, queued)["result"]
    assert payload["meeting_id"] == "mtg_1"
    assert payload["items"]
    assert any(item["needs_confirmation"] for item in payload["items"])
    assert payload["items"][0]["created_at"]

    meetings = client.get("/get-meetings")
    assert meetings.status_code == 200
    assert meetings.json()[0]["title"] == "Sprint Review"
    assert meetings.json()[0]["participants"] == ["Alice", "Bob"]

    items = client.get("/get-items", params={"meeting_id": "mtg_1"})
    assert items.status_code == 200
    assert items.json()[0]["id"]

    async def fetch_meeting():
        async with sessionmaker_fixture() as session:
            return await session.get(Meeting, "mtg_1")

    meeting = asyncio.run(fetch_meeting())
    assert meeting is not None
    assert meeting.firebase_uid == "test-user"


def test_get_dashboard_returns_meetings_with_items(client):
    first = client.post(
        "/process-file",
        files={"file": ("meeting.txt", b"Alice will review privacy controls next sprint.", "text/plain")},
        data={"meeting_id": "mtg_dash_1", "title": "First"},
    )
    second = client.post(
        "/process-file",
        files={"file": ("meeting.txt", b"Bob is working on security fixes.", "text/plain")},
        data={"meeting_id": "mtg_dash_2", "title": "Second"},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    wait_for_job_completion(client, first)
    wait_for_job_completion(client, second)

    dashboard = client.get("/get-dashboard")
    assert dashboard.status_code == 200
    payload = dashboard.json()
    assert len(payload) == 2
    assert payload[0]["meeting_id"] == "mtg_dash_2"
    assert payload[0]["items"]
    assert payload[1]["meeting_id"] == "mtg_dash_1"
    assert payload[1]["items"]


def test_meeting_reads_require_auth(raw_client):
    meetings = raw_client.get("/get-meetings")
    dashboard = raw_client.get("/get-dashboard")
    items = raw_client.get("/get-items", params={"meeting_id": "mtg_1"})

    assert meetings.status_code == 401
    assert meetings.json() == {"detail": "missing authorization token"}
    assert dashboard.status_code == 401
    assert dashboard.json() == {"detail": "missing authorization token"}
    assert items.status_code == 401
    assert items.json() == {"detail": "missing authorization token"}


def test_meeting_reads_are_scoped_to_current_user(raw_client, monkeypatch):
    def fake_verify(token: str):
        return {"uid": "owner-user" if token == "owner-token" else "other-user"}

    monkeypatch.setattr("echo_backend.auth.verify_firebase_id_token", fake_verify)

    first = raw_client.post(
        "/process-file",
        files={"file": ("meeting.txt", b"Alice will review privacy controls next sprint.", "text/plain")},
        data={"meeting_id": "mtg_owner"},
        headers=auth_headers("owner-token"),
    )
    second = raw_client.post(
        "/process-file",
        files={"file": ("meeting.txt", b"Bob is working on security fixes.", "text/plain")},
        data={"meeting_id": "mtg_other"},
        headers=auth_headers("other-token"),
    )

    assert first.status_code == 200
    assert second.status_code == 200
    wait_for_job_completion(raw_client, first, headers=auth_headers("owner-token"))
    wait_for_job_completion(raw_client, second, headers=auth_headers("other-token"))

    meetings = raw_client.get("/get-meetings", headers=auth_headers("owner-token"))
    dashboard = raw_client.get("/get-dashboard", headers=auth_headers("owner-token"))
    items = raw_client.get(
        "/get-items",
        params={"meeting_id": "mtg_owner"},
        headers=auth_headers("owner-token"),
    )
    other_items = raw_client.get(
        "/get-items",
        params={"meeting_id": "mtg_other"},
        headers=auth_headers("owner-token"),
    )

    assert meetings.status_code == 200
    assert [meeting["meeting_id"] for meeting in meetings.json()] == ["mtg_owner"]
    assert dashboard.status_code == 200
    assert [meeting["meeting_id"] for meeting in dashboard.json()] == ["mtg_owner"]
    assert items.status_code == 200
    assert items.json()
    assert other_items.status_code == 404
    assert other_items.json() == {"detail": "meeting not found"}


def test_duplicate_meeting_id_returns_409(client):
    request = {
        "files": {"file": ("meeting.txt", b"We deferred compliance updates.", "text/plain")},
        "data": {"meeting_id": "mtg_dup"},
    }
    first = client.post("/process-file", **request)
    second = client.post("/process-file", **request)

    assert first.status_code == 200
    assert second.status_code == 409
    assert second.json() == {"detail": "meeting_id already exists"}


def test_process_meeting_alias_matches_canonical(client):
    data = {"meeting_id": "mtg_alias"}
    file_payload = {"file": ("meeting.txt", b"Bob is working on security fixes.", "text/plain")}

    response = client.post("/process-meeting", files=file_payload, data=data)
    assert response.status_code == 200
    payload = wait_for_job_completion(client, response)["result"]
    assert payload["meeting_id"] == "mtg_alias"


def test_get_items_missing_meeting_returns_404(client):
    response = client.get("/get-items", params={"meeting_id": "missing"})
    assert response.status_code == 404
    assert response.json() == {"detail": "meeting not found"}


def test_update_status_validates_and_clears_confirmation(client):
    queued = client.post(
        "/process-file",
        files={"file": ("meeting.txt", b"Alice will review privacy controls next sprint.", "text/plain")},
        data={"meeting_id": "mtg_status"},
    )
    processed = wait_for_job_completion(client, queued)
    item_id = processed["result"]["items"][0]["id"]

    update = client.post("/update-status", json={"item_id": item_id, "status": "done"})
    assert update.status_code == 200
    assert update.json() == {"ok": True}

    items = client.get("/get-items", params={"meeting_id": "mtg_status"}).json()
    updated = next(item for item in items if item["id"] == item_id)
    assert updated["status"] == "done"
    assert updated["needs_confirmation"] is False


def test_update_status_invalid_value(client):
    response = client.post("/update-status", json={"item_id": "missing", "status": "resolved"})
    assert response.status_code == 400
    assert response.json() == {"detail": "invalid status value"}


def test_update_status_requires_auth(raw_client):
    response = raw_client.post("/update-status", json={"item_id": "missing", "status": "done"})

    assert response.status_code == 401
    assert response.json() == {"detail": "missing authorization token"}


def test_update_status_is_scoped_to_current_user(raw_client, monkeypatch):
    def fake_verify(token: str):
        return {"uid": "owner-user" if token == "owner-token" else "other-user"}

    monkeypatch.setattr("echo_backend.auth.verify_firebase_id_token", fake_verify)

    created = raw_client.post(
        "/process-file",
        files={"file": ("meeting.txt", b"Alice will review privacy controls next sprint.", "text/plain")},
        data={"meeting_id": "mtg_private_status"},
        headers=auth_headers("owner-token"),
    )

    assert created.status_code == 200
    item_id = wait_for_job_completion(raw_client, created, headers=auth_headers("owner-token"))["result"]["items"][0]["id"]

    response = raw_client.post(
        "/update-status",
        json={"item_id": item_id, "status": "done"},
        headers=auth_headers("other-token"),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "item not found"}


def test_register_device_is_idempotent(client):
    first = client.post("/register-device", json={"token": "abc"})
    second = client.post("/register-device", json={"token": "abc"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json() == {"ok": True}


def test_register_device_requires_auth(raw_client):
    response = raw_client.post("/register-device", json={"token": "abc"})

    assert response.status_code == 401
    assert response.json() == {"detail": "missing authorization token"}


def test_register_device_rejects_invalid_auth(raw_client, monkeypatch):
    monkeypatch.setattr("echo_backend.auth.verify_firebase_id_token", lambda token: None)

    response = raw_client.post(
        "/register-device",
        json={"token": "abc"},
        headers=auth_headers("bad-token"),
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "invalid or expired authorization token"}


def test_register_device_uses_verified_uid(raw_client, monkeypatch, sessionmaker_fixture):
    monkeypatch.setattr(
        "echo_backend.auth.verify_firebase_id_token",
        lambda token: {"uid": "firebase-user-1"},
    )

    response = raw_client.post(
        "/register-device",
        json={"token": "token-1"},
        headers=auth_headers(),
    )

    assert response.status_code == 200

    async def fetch_token():
        async with sessionmaker_fixture() as session:
            result = await session.execute(
                select(DeviceToken).where(DeviceToken.token == "token-1")
            )
            return result.scalar_one_or_none()

    token_row = asyncio.run(fetch_token())
    assert token_row is not None
    assert token_row.firebase_uid == "firebase-user-1"


def test_register_device_reassigns_existing_token_to_new_owner(
    raw_client,
    monkeypatch,
    sessionmaker_fixture,
):
    def fake_verify(token: str):
        return {"uid": "firebase-user-1" if token == "first-token" else "firebase-user-2"}

    monkeypatch.setattr("echo_backend.auth.verify_firebase_id_token", fake_verify)

    first = raw_client.post(
        "/register-device",
        json={"token": "shared-token"},
        headers=auth_headers("first-token"),
    )
    second = raw_client.post(
        "/register-device",
        json={"token": "shared-token"},
        headers=auth_headers("second-token"),
    )

    assert first.status_code == 200
    assert second.status_code == 200

    async def fetch_token():
        async with sessionmaker_fixture() as session:
            result = await session.execute(
                select(DeviceToken).where(DeviceToken.token == "shared-token")
            )
            return result.scalar_one_or_none()

    token_row = asyncio.run(fetch_token())
    assert token_row is not None
    assert token_row.firebase_uid == "firebase-user-2"


def test_unregister_device_removes_only_current_users_token(
    raw_client,
    monkeypatch,
    sessionmaker_fixture,
):
    def fake_verify(token: str):
        return {"uid": "firebase-user-1" if token == "first-token" else "firebase-user-2"}

    monkeypatch.setattr("echo_backend.auth.verify_firebase_id_token", fake_verify)

    raw_client.post(
        "/register-device",
        json={"token": "first-device"},
        headers=auth_headers("first-token"),
    )
    raw_client.post(
        "/register-device",
        json={"token": "second-device"},
        headers=auth_headers("second-token"),
    )

    response = raw_client.post(
        "/unregister-device",
        json={"token": "first-device"},
        headers=auth_headers("first-token"),
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True}

    async def fetch_tokens():
        async with sessionmaker_fixture() as session:
            result = await session.execute(select(DeviceToken).order_by(DeviceToken.token))
            return result.scalars().all()

    tokens = asyncio.run(fetch_tokens())
    assert [token.token for token in tokens] == ["second-device"]
    assert tokens[0].firebase_uid == "firebase-user-2"


def test_process_file_requires_auth(raw_client):
    response = raw_client.post(
        "/process-file",
        files={"file": ("meeting.txt", b"Alice will review privacy controls next sprint.", "text/plain")},
        data={"meeting_id": "mtg_auth_required"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "missing authorization token"}


def test_process_file_supports_docx(client, sample_docx_bytes):
    response = client.post(
        "/process-file",
        files={
            "file": (
                "meeting.docx",
                sample_docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        data={"meeting_id": "mtg_docx"},
    )

    assert response.status_code == 200
    assert wait_for_job_completion(client, response)["result"]["items"]


def test_process_audio_returns_transcript_and_analysis(client, monkeypatch):
    async def fake_transcribe_audio(content: bytes, filename: str | None) -> dict:
        assert filename == "meeting.mp3"
        return {
            "text": "Alice will review privacy controls next sprint.",
            "duration": 12,
            "language": "en",
        }

    monkeypatch.setattr("echo_backend.services.upload_jobs.transcribe_audio", fake_transcribe_audio)

    response = client.post(
        "/process-audio",
        files={"audio_file": ("meeting.mp3", b"fake-audio", "audio/mpeg")},
        data={"meeting_id": "mtg_audio"},
    )

    assert response.status_code == 200
    payload = wait_for_job_completion(client, response)["result"]
    assert payload["meeting_id"] == "mtg_audio"
    assert payload["transcript"] == "Alice will review privacy controls next sprint."
    assert payload["items"]


def test_send_high_risk_notification_targets_only_owner_tokens(
    sessionmaker_fixture,
    monkeypatch,
):
    sent_messages: list[object] = []

    class FakeNotification:
        def __init__(self, title: str, body: str):
            self.title = title
            self.body = body

    class FakeMulticastMessage:
        def __init__(self, *, tokens, notification, data):
            self.tokens = tokens
            self.notification = notification
            self.data = data

    fake_messaging = types.SimpleNamespace(
        Notification=FakeNotification,
        MulticastMessage=FakeMulticastMessage,
        send_each_for_multicast=lambda message, app=None: sent_messages.append(message),
    )
    fake_firebase_admin = types.ModuleType("firebase_admin")
    fake_firebase_admin.messaging = fake_messaging

    monkeypatch.setattr("echo_backend.services.fcm.get_firebase_admin_app", lambda: object())
    monkeypatch.setitem(sys.modules, "firebase_admin", fake_firebase_admin)

    async def scenario():
        async with sessionmaker_fixture() as session:
            session.add_all(
                [
                    DeviceToken(token="owner-token", firebase_uid="owner-user"),
                    DeviceToken(token="other-token", firebase_uid="other-user"),
                ]
            )
            await session.commit()

            await send_high_risk_notification(
                session,
                "meeting-123",
                [
                    {
                        "id": "item-1",
                        "task": "Review privacy controls",
                        "risk": "high",
                        "score": 92,
                    }
                ],
                "owner-user",
            )

    asyncio.run(scenario())

    assert len(sent_messages) == 1
    assert sent_messages[0].tokens == ["owner-token"]
    assert sent_messages[0].data == {
        "meetingId": "meeting-123",
        "itemId": "item-1",
        "risk": "high",
        "score": "92",
    }


def test_process_audio_rejects_oversize_upload(client):
    response = client.post(
        "/process-audio",
        files={"audio_file": ("meeting.mp3", b"a" * (MAX_AUDIO_UPLOAD_BYTES + 1), "audio/mpeg")},
        data={"meeting_id": "mtg_audio_big"},
    )

    assert response.status_code == 413
    assert response.json() == {"detail": AUDIO_UPLOAD_TOO_LARGE_MESSAGE}


def test_transcribe_audio_rejects_oversize_upload(client):
    response = client.post(
        "/transcribe-audio",
        files={"audio_file": ("meeting.mp3", b"a" * (MAX_AUDIO_UPLOAD_BYTES + 1), "audio/mpeg")},
        data={"meeting_id": "mtg_transcribe_big"},
    )

    assert response.status_code == 413
    assert response.json() == {"detail": AUDIO_UPLOAD_TOO_LARGE_MESSAGE}


def test_process_file_rejects_oversize_upload(client):
    response = client.post(
        "/process-file",
        files={"file": ("meeting.pdf", b"a" * (MAX_TRANSCRIPT_UPLOAD_BYTES + 1), "application/pdf")},
        data={"meeting_id": "mtg_file_big"},
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 413
    assert response.json() == {"detail": TRANSCRIPT_UPLOAD_TOO_LARGE_MESSAGE}


def test_process_file_requires_real_ai_when_stub_disabled(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("ALLOW_STUB_AI", "false")

    response = client.post(
        "/process-file",
        files={"file": ("meeting.txt", b"Alice will review privacy controls next sprint.", "text/plain")},
        data={"meeting_id": "mtg_no_ai"},
    )

    assert response.status_code == 200
    payload = wait_for_job_completion(client, response)
    assert payload["status"] == "failed"
    assert "GEMINI_API_KEY is not configured" in payload["error_message"]


def test_process_file_uses_stub_only_when_explicitly_enabled(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("ALLOW_STUB_AI", "true")

    response = client.post(
        "/process-file",
        files={"file": ("meeting.txt", b"We deferred compliance updates.", "text/plain")},
        data={"meeting_id": "mtg_stub"},
    )

    assert response.status_code == 200
    payload = wait_for_job_completion(client, response)["result"]
    assert payload["meeting_id"] == "mtg_stub"
    assert payload["items"]
    assert payload["items"][0]["created_at"]
