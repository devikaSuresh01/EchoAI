from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from echo_backend.schemas import TranscribeResponse
from echo_backend.services.transcription import transcribe_audio

router = APIRouter()

ACCEPTED_MIME = {
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/x-m4a",
    "audio/webm",
    "video/webm",
    "video/mp4",
}


@router.post("/transcribe-audio", response_model=TranscribeResponse)
async def transcribe_audio_endpoint(
    audio_file: UploadFile = File(...),
    meeting_id: str = Form(...),
):
    if audio_file.content_type not in ACCEPTED_MIME:
        raise HTTPException(400, "unsupported audio format")

    content = await audio_file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(413, "audio file too large")

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
