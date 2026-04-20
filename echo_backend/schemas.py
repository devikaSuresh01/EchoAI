from datetime import date, datetime

from pydantic import BaseModel, Field


class UpdateStatusRequest(BaseModel):
    item_id: str
    status: str


class RegisterDeviceRequest(BaseModel):
    token: str


class UnregisterDeviceRequest(BaseModel):
    token: str


class TranscribeResponse(BaseModel):
    meeting_id: str
    transcript: str
    duration_seconds: int
    language: str


class ItemResponse(BaseModel):
    id: str
    task: str
    owner: str
    status: str
    due_date: str
    risk_keywords: list[str]
    evidence: str
    score: int
    risk: str
    reason: str
    confidence: float
    needs_confirmation: bool
    created_at: datetime


class ProcessFileResponse(BaseModel):
    meeting_id: str
    summary: str
    transcript: str | None = None
    high_risk_count: int
    items: list[ItemResponse]


class ProcessAudioResponse(ProcessFileResponse):
    transcript: str


class UploadJobQueuedResponse(BaseModel):
    job_id: str
    meeting_id: str
    status: str


class UploadJobStatusResponse(BaseModel):
    job_id: str
    meeting_id: str
    status: str
    error_message: str | None = None
    result: ProcessFileResponse | None = None
    created_at: datetime
    updated_at: datetime


class MeetingListItem(BaseModel):
    meeting_id: str
    summary: str
    high_risk_count: int
    title: str | None = None
    meeting_date: date | None = None
    participants: list[str] = Field(default_factory=list)
    created_at: datetime


class MeetingDashboardItem(MeetingListItem):
    items: list[ItemResponse] = Field(default_factory=list)


class OkResponse(BaseModel):
    ok: bool = True
