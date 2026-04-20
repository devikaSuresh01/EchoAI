from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from echo_backend.auth import CurrentUser, get_current_user
from echo_backend.database import get_db
from echo_backend.models import Item, Meeting, utcnow
from echo_backend.schemas import OkResponse, UpdateStatusRequest

router = APIRouter()

VALID_STATUSES = {"done", "in_progress", "not_started"}


@router.post("/update-status", response_model=OkResponse)
async def update_status(
    body: UpdateStatusRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(400, "invalid status value")

    item = await db.get(Item, body.item_id)
    if not item:
        raise HTTPException(404, "item not found")

    meeting_result = await db.execute(
        select(Meeting.firebase_uid).where(Meeting.meeting_id == item.meeting_id)
    )
    meeting_owner = meeting_result.scalar_one_or_none()
    if meeting_owner != current_user.firebase_uid:
        raise HTTPException(404, "item not found")

    item.status = body.status
    item.needs_confirmation = False
    item.updated_at = utcnow()
    await db.commit()

    return {"ok": True}
