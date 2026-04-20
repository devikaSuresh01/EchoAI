from fastapi.testclient import TestClient

from aimodel.main import app
from constants.echoai import (
    AUDIO_UPLOAD_TOO_LARGE_MESSAGE,
    MAX_AUDIO_UPLOAD_BYTES,
    MAX_TRANSCRIPT_UPLOAD_BYTES,
    TRANSCRIPT_UPLOAD_TOO_LARGE_MESSAGE,
)


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


def test_process_file_rejects_oversize_upload(monkeypatch):
    def fail_if_called(*args, **kwargs):
        raise AssertionError("text extraction should not run for oversize uploads")

    monkeypatch.setattr("aimodel.main.extract_text_from_file", fail_if_called)

    with TestClient(app) as client:
        response = client.post(
            "/process-file",
            files={"file": ("meeting.pdf", b"a" * (MAX_TRANSCRIPT_UPLOAD_BYTES + 1), "application/pdf")},
            data={"meeting_id": "mtg_big_file"},
        )

    assert response.status_code == 413
    assert response.json() == {"detail": TRANSCRIPT_UPLOAD_TOO_LARGE_MESSAGE}
