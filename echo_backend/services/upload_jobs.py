import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError, OperationalError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from constants.echoai import (
    AUDIO_UPLOAD_TOO_LARGE_MESSAGE,
    MAX_AUDIO_UPLOAD_BYTES,
    MAX_TRANSCRIPT_UPLOAD_BYTES,
    TRANSCRIPT_UPLOAD_TOO_LARGE_MESSAGE,
)
from aimodel.transcription.service import SUPPORTED_AUDIO_EXTENSIONS
from echo_backend.database import SessionLocal, engine
from echo_backend.models import Meeting, UploadJob
from echo_backend.services.aimodel_gateway import analyze_transcript, transcribe_audio
from echo_backend.services.fcm import send_high_risk_notification
from echo_backend.services.file_parser import extract_text
from echo_backend.services.persistence import save_meeting

logger = logging.getLogger(__name__)

TRANSCRIPT_ACCEPTED_EXTENSIONS = {"txt", "docx", "pdf"}
TRANSCRIPT_ACCEPTED_MIME = {
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
TERMINAL_JOB_STATUSES = {"completed", "failed"}
IN_PROGRESS_JOB_STATUSES = {"queued", "transcribing", "analyzing", "saving"}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _should_auto_create_upload_jobs_table() -> bool:
    return (os.getenv("AUTO_CREATE_UPLOAD_JOBS_TABLE") or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _is_missing_upload_jobs_table_error(exc: Exception) -> bool:
    if not isinstance(exc, (ProgrammingError, OperationalError, DBAPIError)):
        return False

    message = str(getattr(exc, "orig", exc)).lower()
    return "upload_jobs" in message and (
        'relation "upload_jobs" does not exist' in message
        or "no such table: upload_jobs" in message
    )


async def _create_upload_jobs_table() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: UploadJob.__table__.create(bind=sync_conn, checkfirst=True))


def _migration_required_error() -> RuntimeError:
    return RuntimeError(
        "upload_jobs table is missing. Run `alembic -c echo_backend/alembic.ini upgrade head` "
        "or set AUTO_CREATE_UPLOAD_JOBS_TABLE=true for local development only."
    )


def _is_retryable_db_connection_error(exc: Exception) -> bool:
    if not isinstance(exc, (OperationalError, DBAPIError)):
        return False

    message = str(getattr(exc, "orig", exc)).lower()
    return any(
        pattern in message
        for pattern in (
            "connection was closed in the middle of operation",
            "connection does not exist",
            "server closed the connection unexpectedly",
            "terminating connection",
            "connection is closed",
            "closed the connection",
        )
    )


async def _run_db_operation(
    operation,
    *,
    attempts: int = 3,
    base_delay_seconds: float = 0.25,
):
    attempt = 0
    while True:
        try:
            return await operation()
        except Exception as exc:
            attempt += 1
            if not _is_retryable_db_connection_error(exc) or attempt >= attempts:
                raise
            await asyncio.sleep(base_delay_seconds * 2 ** (attempt - 1))


async def _get_job_snapshot(job_id: str) -> dict[str, Any] | None:
    async def operation():
        async with SessionLocal() as db:
            job = await db.get(UploadJob, job_id)
            if not job:
                return None
            return {
                "job_id": job.job_id,
                "meeting_id": job.meeting_id,
                "firebase_uid": job.firebase_uid,
                "status": job.status,
                "source_type": job.source_type,
                "filename": job.filename,
                "content_type": job.content_type,
                "file_ext": job.file_ext,
                "file_bytes": job.file_bytes,
                "title": job.title,
                "meeting_date": job.meeting_date,
                "participants": job.participants,
                "transcript": job.transcript,
                "duration_seconds": job.duration_seconds,
                "language": job.language,
                "error_message": job.error_message,
                "result_payload": job.result_payload,
                "created_at": job.created_at,
                "updated_at": job.updated_at,
                "started_at": job.started_at,
                "completed_at": job.completed_at,
            }

    return await _run_db_operation(operation)


async def _update_job(job_id: str, **fields: Any) -> dict[str, Any] | None:
    async def operation():
        async with SessionLocal() as db:
            job = await db.get(UploadJob, job_id)
            if not job:
                return None

            for field, value in fields.items():
                setattr(job, field, value)

            await db.commit()
            await db.refresh(job)
            return {
                "job_id": job.job_id,
                "meeting_id": job.meeting_id,
                "firebase_uid": job.firebase_uid,
                "status": job.status,
                "source_type": job.source_type,
                "filename": job.filename,
                "content_type": job.content_type,
                "file_ext": job.file_ext,
                "file_bytes": job.file_bytes,
                "title": job.title,
                "meeting_date": job.meeting_date,
                "participants": job.participants,
                "transcript": job.transcript,
                "duration_seconds": job.duration_seconds,
                "language": job.language,
                "error_message": job.error_message,
                "result_payload": job.result_payload,
                "created_at": job.created_at,
                "updated_at": job.updated_at,
                "started_at": job.started_at,
                "completed_at": job.completed_at,
            }

    return await _run_db_operation(operation)


async def _mark_job_failed(job_id: str, error_message: str) -> None:
    await _update_job(
        job_id,
        status="failed",
        error_message=error_message,
        completed_at=utcnow(),
        file_bytes=b"",
    )


async def _persist_completed_job(job_id: str, ai_result: dict, transcript: str | None) -> None:
    async def operation():
        async with SessionLocal() as db:
            job = await db.get(UploadJob, job_id)
            if not job:
                return

            meeting = await db.get(Meeting, job.meeting_id)
            if not meeting:
                await save_meeting(
                    db,
                    job.meeting_id,
                    job.firebase_uid,
                    ai_result,
                    title=job.title,
                    meeting_date=job.meeting_date,
                    participants=job.participants,
                )
                job = await db.get(UploadJob, job_id)
                if not job:
                    return
            elif meeting.firebase_uid != job.firebase_uid:
                raise RuntimeError("meeting_id already exists")

            if ai_result["high_risk_count"] > 0:
                try:
                    await send_high_risk_notification(
                        db,
                        job.meeting_id,
                        ai_result["items"],
                        job.firebase_uid,
                    )
                except Exception:
                    logger.exception(
                        "High-risk push notification failed after upload completion",
                        extra={"job_id": job_id, "meeting_id": job.meeting_id},
                    )

            job.status = "completed"
            job.error_message = None
            job.result_payload = _serialize_result(
                ai_result,
                transcript if job.source_type == "audio" else None,
            )
            job.file_bytes = b""
            job.completed_at = utcnow()
            await db.commit()

    await _run_db_operation(operation)


def _get_task_registry(app: FastAPI) -> dict[str, asyncio.Task]:
    registry = getattr(app.state, "upload_job_tasks", None)
    if registry is None:
        registry = {}
        app.state.upload_job_tasks = registry
    return registry


async def _ensure_meeting_id_available(meeting_id: str, db: AsyncSession) -> None:
    if not meeting_id.strip():
        raise HTTPException(400, "meeting_id cannot be empty")

    meeting = await db.get(Meeting, meeting_id)
    if meeting:
        raise HTTPException(409, "meeting_id already exists")

    result = await db.execute(select(UploadJob.job_id).where(UploadJob.meeting_id == meeting_id))
    if result.scalar_one_or_none():
        raise HTTPException(409, "meeting_id already exists")


def _annotate_items(ai_result: dict) -> dict:
    for item in ai_result["items"]:
        item["needs_confirmation"] = item.get("confidence", 0) < 0.75
    return ai_result


def _serialize_result(ai_result: dict, transcript: str | None = None) -> dict:
    payload = {
        "meeting_id": ai_result["meeting_id"],
        "summary": ai_result["summary"],
        "high_risk_count": ai_result["high_risk_count"],
        "items": [],
    }
    if transcript is not None:
        payload["transcript"] = transcript

    for item in ai_result["items"]:
        payload["items"].append(
            {
                "id": str(item["id"]),
                "task": item["task"],
                "owner": item.get("owner", "unknown"),
                "status": item["status"],
                "due_date": item.get("due_date", "unspecified"),
                "risk_keywords": item.get("risk_keywords", []),
                "evidence": item.get("evidence", ""),
                "score": item["score"],
                "risk": item["risk"],
                "reason": item.get("reason", ""),
                "confidence": item["confidence"],
                "needs_confirmation": item["needs_confirmation"],
                "created_at": item.get("created_at"),
            }
        )

    return payload


def _public_error_message(exc: Exception) -> str:
    if isinstance(exc, HTTPException):
        return str(exc.detail)
    if isinstance(exc, ValueError):
        return str(exc)
    if isinstance(exc, RuntimeError):
        return str(exc)
    return "internal server error"


async def enqueue_transcript_job(
    app: FastAPI,
    db: AsyncSession,
    *,
    file: UploadFile,
    meeting_id: str,
    firebase_uid: str,
    title: str | None = None,
    meeting_date: str | None = None,
    participants: str | None = None,
) -> UploadJob:
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in TRANSCRIPT_ACCEPTED_EXTENSIONS or (
        file.content_type and file.content_type not in TRANSCRIPT_ACCEPTED_MIME
    ):
        raise HTTPException(400, "unsupported file type")

    await _ensure_meeting_id_available(meeting_id, db)

    content = await file.read()
    if len(content) > MAX_TRANSCRIPT_UPLOAD_BYTES:
        raise HTTPException(413, TRANSCRIPT_UPLOAD_TOO_LARGE_MESSAGE)

    job = UploadJob(
        meeting_id=meeting_id,
        firebase_uid=firebase_uid,
        status="queued",
        source_type="transcript",
        filename=file.filename,
        content_type=file.content_type,
        file_ext=ext,
        file_bytes=content,
        title=title.strip() if title else None,
        meeting_date=meeting_date,
        participants=participants,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    schedule_upload_job(app, job.job_id)
    return job


async def enqueue_audio_job(
    app: FastAPI,
    db: AsyncSession,
    *,
    file: UploadFile,
    meeting_id: str,
    firebase_uid: str,
    title: str | None = None,
    meeting_date: str | None = None,
    participants: str | None = None,
) -> UploadJob:
    ext = f".{(file.filename or '').rsplit('.', 1)[-1].lower()}" if "." in (file.filename or "") else ""
    if ext not in SUPPORTED_AUDIO_EXTENSIONS:
        raise HTTPException(400, "unsupported audio format")

    if file.content_type and file.content_type not in AUDIO_ACCEPTED_MIME:
        raise HTTPException(400, "unsupported audio format")

    await _ensure_meeting_id_available(meeting_id, db)

    content = await file.read()
    if len(content) > MAX_AUDIO_UPLOAD_BYTES:
        raise HTTPException(413, AUDIO_UPLOAD_TOO_LARGE_MESSAGE)

    job = UploadJob(
        meeting_id=meeting_id,
        firebase_uid=firebase_uid,
        status="queued",
        source_type="audio",
        filename=file.filename,
        content_type=file.content_type,
        file_ext=ext,
        file_bytes=content,
        title=title.strip() if title else None,
        meeting_date=meeting_date,
        participants=participants,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    schedule_upload_job(app, job.job_id)
    return job


async def get_upload_job_or_404(job_id: str, firebase_uid: str) -> UploadJob:
    async def operation():
        async with SessionLocal() as db:
            result = await db.execute(
                select(UploadJob).where(
                    UploadJob.job_id == job_id,
                    UploadJob.firebase_uid == firebase_uid,
                )
            )
            return result.scalar_one_or_none()

    try:
        job = await _run_db_operation(operation)
    except Exception as exc:
        if _is_retryable_db_connection_error(exc):
            raise HTTPException(503, "upload job temporarily unavailable") from exc
        raise

    if not job:
        raise HTTPException(404, "upload job not found")
    return job


def schedule_upload_job(app: FastAPI, job_id: str) -> None:
    registry = _get_task_registry(app)
    existing = registry.get(job_id)
    if existing and not existing.done():
        return

    task = asyncio.create_task(process_upload_job(job_id, app))
    registry[job_id] = task

    def _cleanup(done_task: asyncio.Task) -> None:
        registry.pop(job_id, None)
        try:
            done_task.result()
        except Exception:
            logger.exception("Upload job task crashed", extra={"job_id": job_id})

    task.add_done_callback(_cleanup)


async def resume_upload_jobs(app: FastAPI) -> None:
    auto_create = _should_auto_create_upload_jobs_table()
    logger.info(
        "Initializing upload job startup recovery",
        extra={"auto_create_upload_jobs_table": auto_create},
    )

    try:
        async with SessionLocal() as db:
            result = await db.execute(
                select(UploadJob.job_id).where(UploadJob.status.in_(tuple(IN_PROGRESS_JOB_STATUSES)))
            )
            job_ids = list(result.scalars().all())
    except Exception as exc:
        if not _is_missing_upload_jobs_table_error(exc):
            raise

        if not auto_create:
            logger.error(
                "upload_jobs table is missing and local auto-create is disabled. "
                "Run Alembic migrations before starting the backend.",
                extra={"auto_create_upload_jobs_table": auto_create},
            )
            raise _migration_required_error() from exc

        logger.warning(
            "upload_jobs table is missing. Creating it automatically because "
            "AUTO_CREATE_UPLOAD_JOBS_TABLE=true. Alembic remains the source of truth.",
            extra={"auto_create_upload_jobs_table": auto_create},
        )
        await _create_upload_jobs_table()

        async with SessionLocal() as db:
            result = await db.execute(
                select(UploadJob.job_id).where(UploadJob.status.in_(tuple(IN_PROGRESS_JOB_STATUSES)))
            )
            job_ids = list(result.scalars().all())

    for job_id in job_ids:
        schedule_upload_job(app, job_id)


async def process_upload_job(job_id: str, app: FastAPI) -> None:
    started = time.perf_counter()
    job = await _get_job_snapshot(job_id)
    if not job or job["status"] in TERMINAL_JOB_STATUSES:
        return

    try:
        await _update_job(
            job_id,
            started_at=job["started_at"] or utcnow(),
            error_message=None,
        )
        transcript = job["transcript"] or ""

        if job["source_type"] == "audio":
            await _update_job(job_id, status="transcribing")
            transcription_started = time.perf_counter()
            transcription = await transcribe_audio(job["file_bytes"], job["filename"])
            transcription_elapsed_ms = round((time.perf_counter() - transcription_started) * 1000, 2)
            transcript = (transcription.get("text") or "").strip()
            if not transcript:
                raise ValueError("could not transcribe audio")

            cold_start = transcript and transcription_elapsed_ms > 5000
            logger.info(
                "Upload job transcription complete",
                extra={
                    "job_id": job["job_id"],
                    "meeting_id": job["meeting_id"],
                    "source_type": job["source_type"],
                    "duration_ms": transcription_elapsed_ms,
                    "cold_start": bool(cold_start),
                },
            )
            await _update_job(
                job_id,
                transcript=transcript,
                duration_seconds=int(transcription.get("duration") or 0),
                language=str(transcription.get("language") or "en"),
            )
        else:
            await _update_job(job_id, status="analyzing")
            extraction_started = time.perf_counter()
            transcript = await extract_text(job["file_bytes"], job["file_ext"])
            extraction_elapsed_ms = round((time.perf_counter() - extraction_started) * 1000, 2)
            logger.info(
                "Upload job transcript extraction complete",
                extra={
                    "job_id": job["job_id"],
                    "meeting_id": job["meeting_id"],
                    "source_type": job["source_type"],
                    "duration_ms": extraction_elapsed_ms,
                },
            )
            await _update_job(job_id, transcript=transcript)

        await _update_job(job_id, status="analyzing")
        analysis_started = time.perf_counter()
        ai_result = _annotate_items(await analyze_transcript(job["meeting_id"], transcript))
        analysis_elapsed_ms = round((time.perf_counter() - analysis_started) * 1000, 2)
        logger.info(
            "Upload job analysis complete",
            extra={
                "job_id": job["job_id"],
                "meeting_id": job["meeting_id"],
                "source_type": job["source_type"],
                "duration_ms": analysis_elapsed_ms,
            },
        )

        await _update_job(job_id, status="saving")
        await _persist_completed_job(job_id, ai_result, transcript)

        total_elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        logger.info(
            "Upload job completed",
            extra={
                "job_id": job["job_id"],
                "meeting_id": job["meeting_id"],
                "source_type": job["source_type"],
                "duration_ms": total_elapsed_ms,
            },
        )
    except Exception as exc:
        await _mark_job_failed(job_id, _public_error_message(exc))
        logger.exception(
            "Upload job failed",
            extra={"job_id": job_id, "meeting_id": job["meeting_id"]},
        )
