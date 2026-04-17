from fastapi.testclient import TestClient

from aimodel.main import app
from constants.echoai import AUDIO_UPLOAD_TOO_LARGE_MESSAGE, MAX_AUDIO_UPLOAD_BYTES


def test_process_audio_rejects_oversize_upload(monkeypatch):
    def fail_if_called(*args, **kwargs):
        raise AssertionError("transcription should not run for oversize uploads")

    monkeypatch.setattr("aimodel.main.get_transcript_from_audio", fail_if_called)

    with TestClient(app) as client:
        response = client.post(
            "/process-audio",
            files={"file": ("meeting.mp3", b"a" * (MAX_AUDIO_UPLOAD_BYTES + 1), "audio/mpeg")},
            data={"meeting_id": "mtg_big"},
        )

    assert response.status_code == 413
    assert response.json() == {"detail": AUDIO_UPLOAD_TOO_LARGE_MESSAGE}
