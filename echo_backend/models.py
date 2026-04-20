import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Meeting(Base):
    __tablename__ = "meetings"

    meeting_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    high_risk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    meeting_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    participants: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    items: Mapped[list["Item"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def to_dict(self) -> dict:
        return {
            "meeting_id": self.meeting_id,
            "firebase_uid": self.firebase_uid,
            "summary": self.summary,
            "high_risk_count": self.high_risk_count,
            "title": self.title,
            "meeting_date": self.meeting_date,
            "participants": self.participants,
            "created_at": self.created_at,
        }


class Item(Base):
    __tablename__ = "items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("meetings.meeting_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task: Mapped[str] = mapped_column(Text, nullable=False)
    owner: Mapped[str] = mapped_column(String(256), nullable=False, default="unknown")
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    due_date: Mapped[str] = mapped_column(String(64), nullable=False, default="unspecified")
    risk_keywords: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    evidence: Mapped[str] = mapped_column(Text, nullable=False, default="")
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    risk: Mapped[str] = mapped_column(String(16), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    needs_confirmation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    meeting: Mapped[Meeting] = relationship(back_populates="items")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "task": self.task,
            "owner": self.owner,
            "status": self.status,
            "due_date": self.due_date,
            "risk_keywords": self.risk_keywords,
            "evidence": self.evidence,
            "score": self.score,
            "risk": self.risk,
            "reason": self.reason,
            "confidence": self.confidence,
            "needs_confirmation": self.needs_confirmation,
            "created_at": self.created_at,
        }


class DeviceToken(Base):
    __tablename__ = "device_tokens"
    __table_args__ = (UniqueConstraint("token", name="uq_device_tokens_token"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token: Mapped[str] = mapped_column(Text, nullable=False)
    firebase_uid: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )


class UploadJob(Base):
    __tablename__ = "upload_jobs"
    __table_args__ = (UniqueConstraint("meeting_id", name="uq_upload_jobs_meeting_id"),)

    job_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id: Mapped[str] = mapped_column(String(64), nullable=False)
    firebase_uid: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(16), nullable=False)
    filename: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_ext: Mapped[str] = mapped_column(String(16), nullable=False)
    file_bytes: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    meeting_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    participants: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    language: Mapped[str | None] = mapped_column(String(32), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def to_dict(self) -> dict:
        return {
            "job_id": self.job_id,
            "meeting_id": self.meeting_id,
            "status": self.status,
            "error_message": self.error_message,
            "result": self.result_payload,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
