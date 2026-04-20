from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from aimodel.transcription.service import SUPPORTED_AUDIO_EXTENSIONS
from constants.echoai import AUDIO_UPLOAD_TOO_LARGE_MESSAGE, MAX_AUDIO_UPLOAD_BYTES
from echo_backend.schemas import TranscribeResponse
from echo_backend.services.aimodel_gateway import transcribe_audio

router = APIRouter()

ACCEPTED_MIME = {
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mp3",
    "audio/x-m4a",
}


@router.post("/transcribe-audio", response_model=TranscribeResponse)
async def transcribe_audio_endpoint(
    audio_file: UploadFile = File(...),
    meeting_id: str = Form(...),
):
    """Transcription-only endpoint. Frontend primary flow should use /process-audio."""
    ext = f".{(audio_file.filename or '').rsplit('.', 1)[-1].lower()}" if "." in (audio_file.filename or "") else ""
    if ext not in SUPPORTED_AUDIO_EXTENSIONS:
        raise HTTPException(400, "unsupported audio format")

    if audio_file.content_type and audio_file.content_type not in ACCEPTED_MIME:
        raise HTTPException(400, "unsupported audio format")

    content = await audio_file.read()
    if len(content) > MAX_AUDIO_UPLOAD_BYTES:
        raise HTTPException(413, AUDIO_UPLOAD_TOO_LARGE_MESSAGE)

    try:
        result = await transcribe_audio(content, audio_file.filename)
    except Exception as exc:
        raise HTTPException(422, "could not transcribe audio") from exc

    return {
        "meeting_id": meeting_id,
        "transcript": result["text"],
        "duration_seconds": result.get("duration", 0),
        "language": result.get("language", "en"),
    }
