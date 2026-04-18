from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from aimodel.transcription.service import SUPPORTED_AUDIO_EXTENSIONS
from constants.echoai import AUDIO_UPLOAD_TOO_LARGE_MESSAGE, MAX_AUDIO_UPLOAD_BYTES
from echo_backend.auth import CurrentUser, get_current_user
from echo_backend.database import get_db
from echo_backend.models import Meeting
from echo_backend.schemas import ProcessAudioResponse, ProcessFileResponse
from echo_backend.services.aimodel_gateway import analyze_transcript, transcribe_audio
from echo_backend.services.fcm import send_high_risk_notification
from echo_backend.services.file_parser import extract_text
from echo_backend.services.persistence import save_meeting

router = APIRouter()

ACCEPTED_EXTENSIONS = {"txt", "docx", "pdf"}
ACCEPTED_MIME = {
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/pdf",
}
AUDIO_ACCEPTED_MIME = {
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mp3",
    "audio/x-m4a",
}


async def _ensure_meeting_available(meeting_id: str, db: AsyncSession) -> None:
    if not meeting_id.strip():
        raise HTTPException(400, "meeting_id cannot be empty")

    existing = await db.get(Meeting, meeting_id)
    if existing:
        raise HTTPException(409, "meeting_id already exists")


def _annotate_items(ai_result: dict) -> dict:
    for item in ai_result["items"]:
        item["needs_confirmation"] = item.get("confidence", 0) < 0.75
    return ai_result


async def _finalize_transcript(
    meeting_id: str,
    transcript: str,
    firebase_uid: str,
    db: AsyncSession,
    title: str | None = None,
    meeting_date: str | None = None,
    participants: str | None = None,
):
    try:
        ai_result = _annotate_items(await analyze_transcript(meeting_id, transcript))

        await save_meeting(
            db,
            meeting_id,
            firebase_uid,
            ai_result,
            title=title,
            meeting_date=meeting_date,
            participants=participants,
        )

        if ai_result["high_risk_count"] > 0:
            await send_high_risk_notification(
                db,
                meeting_id,
                ai_result["items"],
                firebase_uid,
            )

        return ai_result
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(502, str(exc)) from exc
    except Exception as exc:
        await db.rollback()
        raise HTTPException(500, "internal server error") from exc


async def _process_file_upload(
    file: UploadFile,
    meeting_id: str,
    firebase_uid: str,
    db: AsyncSession,
    title: str | None = None,
    meeting_date: str | None = None,
    participants: str | None = None,
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ACCEPTED_EXTENSIONS or (file.content_type and file.content_type not in ACCEPTED_MIME):
        raise HTTPException(400, "unsupported file type")

    await _ensure_meeting_available(meeting_id, db)

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(413, "file too large")

    try:
        plain_text = await extract_text(content, ext)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc

    return await _finalize_transcript(
        meeting_id,
        plain_text,
        firebase_uid,
        db,
        title,
        meeting_date,
        participants,
    )


@router.post("/process-file", response_model=ProcessFileResponse)
async def process_file(
    file: UploadFile = File(...),
    meeting_id: str = Form(...),
    title: str | None = Form(default=None),
    meeting_date: str | None = Form(default=None),
    participants: str | None = Form(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _process_file_upload(
        file,
        meeting_id,
        current_user.firebase_uid,
        db,
        title,
        meeting_date,
        participants,
    )


@router.post("/process-meeting", response_model=ProcessFileResponse)
async def process_meeting_alias(
    file: UploadFile = File(...),
    meeting_id: str = Form(...),
    title: str | None = Form(default=None),
    meeting_date: str | None = Form(default=None),
    participants: str | None = Form(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _process_file_upload(
        file,
        meeting_id,
        current_user.firebase_uid,
        db,
        title,
        meeting_date,
        participants,
    )


@router.post("/process-audio", response_model=ProcessAudioResponse)
async def process_audio(
    audio_file: UploadFile = File(...),
    meeting_id: str = Form(...),
    title: str | None = Form(default=None),
    meeting_date: str | None = Form(default=None),
    participants: str | None = Form(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ext = f".{(audio_file.filename or '').rsplit('.', 1)[-1].lower()}" if "." in (audio_file.filename or "") else ""
    if ext not in SUPPORTED_AUDIO_EXTENSIONS:
        raise HTTPException(400, "unsupported audio format")

    if audio_file.content_type and audio_file.content_type not in AUDIO_ACCEPTED_MIME:
        raise HTTPException(400, "unsupported audio format")

    await _ensure_meeting_available(meeting_id, db)

    content = await audio_file.read()
    if len(content) > MAX_AUDIO_UPLOAD_BYTES:
        raise HTTPException(413, AUDIO_UPLOAD_TOO_LARGE_MESSAGE)

    try:
        transcription = await transcribe_audio(content, audio_file.filename)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(422, "could not transcribe audio") from exc

    transcript = (transcription.get("text") or "").strip()
    if not transcript:
        raise HTTPException(422, "could not transcribe audio")

    ai_result = await _finalize_transcript(
        meeting_id,
        transcript,
        current_user.firebase_uid,
        db,
        title,
        meeting_date,
        participants,
    )
    ai_result["transcript"] = transcript
    return ai_result
