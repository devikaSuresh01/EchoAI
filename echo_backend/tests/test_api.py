from echo_backend.models import DeviceToken, Item, Meeting


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


def test_process_file_rejects_unsupported_type(client):
    response = client.post(
        "/process-file",
        files={"file": ("bad.csv", b"bad,data", "text/csv")},
        data={"meeting_id": "mtg_1"},
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "unsupported file type"}


def test_process_file_persists_meeting_and_items(client):
    response = client.post(
        "/process-file",
        files={"file": ("meeting.txt", b"Alice will review privacy controls next sprint.", "text/plain")},
        data={
            "meeting_id": "mtg_1",
            "title": "Sprint Review",
            "meeting_date": "2026-04-17",
            "participants": "Alice, Bob",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["meeting_id"] == "mtg_1"
    assert payload["items"]
    assert any(item["needs_confirmation"] for item in payload["items"])

    meetings = client.get("/get-meetings")
    assert meetings.status_code == 200
    assert meetings.json()[0]["title"] == "Sprint Review"
    assert meetings.json()[0]["participants"] == ["Alice", "Bob"]

    items = client.get("/get-items", params={"meeting_id": "mtg_1"})
    assert items.status_code == 200
    assert items.json()[0]["id"]


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
    assert response.json()["meeting_id"] == "mtg_alias"


def test_get_items_missing_meeting_returns_404(client):
    response = client.get("/get-items", params={"meeting_id": "missing"})
    assert response.status_code == 404
    assert response.json() == {"detail": "meeting not found"}


def test_update_status_validates_and_clears_confirmation(client):
    processed = client.post(
        "/process-file",
        files={"file": ("meeting.txt", b"Alice will review privacy controls next sprint.", "text/plain")},
        data={"meeting_id": "mtg_status"},
    )
    item_id = processed.json()["items"][0]["id"]

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


def test_register_device_is_idempotent(client):
    first = client.post("/register-device", json={"token": "abc"})
    second = client.post("/register-device", json={"token": "abc"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json() == {"ok": True}


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
    assert response.json()["items"]
