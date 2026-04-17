from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from echo_backend.database import get_db
from echo_backend.models import Meeting
from echo_backend.schemas import ProcessFileResponse
from echo_backend.services.ai_analysis import call_ai_service
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


async def _process_upload(
    file: UploadFile,
    meeting_id: str,
    db: AsyncSession,
    title: str | None = None,
    meeting_date: str | None = None,
    participants: str | None = None,
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ACCEPTED_EXTENSIONS or (file.content_type and file.content_type not in ACCEPTED_MIME):
        raise HTTPException(400, "unsupported file type")

    existing = await db.get(Meeting, meeting_id)
    if existing:
        raise HTTPException(409, "meeting_id already exists")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(413, "file too large")

    try:
        plain_text = await extract_text(content, ext)
        ai_result = await call_ai_service(meeting_id, plain_text)
        for item in ai_result["items"]:
            item["needs_confirmation"] = item.get("confidence", 0) < 0.75

        await save_meeting(
            db,
            meeting_id,
            ai_result,
            title=title,
            meeting_date=meeting_date,
            participants=participants,
        )

        if ai_result["high_risk_count"] > 0:
            await send_high_risk_notification(db, ai_result["items"])

        return ai_result
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        raise HTTPException(500, "internal server error") from exc


@router.post("/process-file", response_model=ProcessFileResponse)
async def process_file(
    file: UploadFile = File(...),
    meeting_id: str = Form(...),
    title: str | None = Form(default=None),
    meeting_date: str | None = Form(default=None),
    participants: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    return await _process_upload(file, meeting_id, db, title, meeting_date, participants)


@router.post("/process-meeting", response_model=ProcessFileResponse)
async def process_meeting_alias(
    file: UploadFile = File(...),
    meeting_id: str = Form(...),
    title: str | None = Form(default=None),
    meeting_date: str | None = Form(default=None),
    participants: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    return await _process_upload(file, meeting_id, db, title, meeting_date, participants)
