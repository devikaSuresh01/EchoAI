from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from echo_backend.database import get_db
from echo_backend.models import Item, utcnow
from echo_backend.schemas import OkResponse, UpdateStatusRequest

router = APIRouter()

VALID_STATUSES = {"done", "in_progress", "not_started"}


@router.post("/update-status", response_model=OkResponse)
async def update_status(body: UpdateStatusRequest, db: AsyncSession = Depends(get_db)):
    if body.status not in VALID_STATUSES:
        raise HTTPException(400, "invalid status value")

    item = await db.get(Item, body.item_id)
    if not item:
        raise HTTPException(404, "item not found")

    item.status = body.status
    item.needs_confirmation = False
    item.updated_at = utcnow()
    await db.commit()

    return {"ok": True}
