from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from echo_backend.auth import CurrentUser, get_current_user
from echo_backend.database import get_db
from echo_backend.schemas import UploadJobQueuedResponse, UploadJobStatusResponse
from echo_backend.services.upload_jobs import (
    enqueue_audio_job,
    enqueue_transcript_job,
    get_upload_job_or_404,
)

router = APIRouter()


@router.post("/process-file", response_model=UploadJobQueuedResponse)
async def process_file(
    request: Request,
    file: UploadFile = File(...),
    meeting_id: str = Form(...),
    title: str | None = Form(default=None),
    meeting_date: str | None = Form(default=None),
    participants: str | None = Form(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await enqueue_transcript_job(
        request.app,
        db,
        file=file,
        meeting_id=meeting_id,
        firebase_uid=current_user.firebase_uid,
        title=title,
        meeting_date=meeting_date,
        participants=participants,
    )
    return {
        "job_id": job.job_id,
        "meeting_id": job.meeting_id,
        "status": job.status,
    }


@router.post("/process-meeting", response_model=UploadJobQueuedResponse)
async def process_meeting_alias(
    request: Request,
    file: UploadFile = File(...),
    meeting_id: str = Form(...),
    title: str | None = Form(default=None),
    meeting_date: str | None = Form(default=None),
    participants: str | None = Form(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await enqueue_transcript_job(
        request.app,
        db,
        file=file,
        meeting_id=meeting_id,
        firebase_uid=current_user.firebase_uid,
        title=title,
        meeting_date=meeting_date,
        participants=participants,
    )
    return {
        "job_id": job.job_id,
        "meeting_id": job.meeting_id,
        "status": job.status,
    }


@router.post("/process-audio", response_model=UploadJobQueuedResponse)
async def process_audio(
    request: Request,
    audio_file: UploadFile = File(...),
    meeting_id: str = Form(...),
    title: str | None = Form(default=None),
    meeting_date: str | None = Form(default=None),
    participants: str | None = Form(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await enqueue_audio_job(
        request.app,
        db,
        file=audio_file,
        meeting_id=meeting_id,
        firebase_uid=current_user.firebase_uid,
        title=title,
        meeting_date=meeting_date,
        participants=participants,
    )
    return {
        "job_id": job.job_id,
        "meeting_id": job.meeting_id,
        "status": job.status,
    }


@router.get("/upload-jobs/{job_id}", response_model=UploadJobStatusResponse)
async def get_upload_job(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    job = await get_upload_job_or_404(job_id, current_user.firebase_uid)
    return {
        "job_id": job.job_id,
        "meeting_id": job.meeting_id,
        "status": job.status,
        "error_message": job.error_message,
        "result": job.result_payload,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
    }
