from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from echo_backend.database import get_db
from echo_backend.models import Item, Meeting
from echo_backend.schemas import ItemResponse, MeetingListItem

router = APIRouter()


@router.get("/get-meetings", response_model=list[MeetingListItem])
async def get_meetings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Meeting).order_by(Meeting.created_at.desc()))
    meetings = result.scalars().all()
    return [meeting.to_dict() for meeting in meetings]


@router.get("/get-items", response_model=list[ItemResponse])
async def get_items(meeting_id: str, db: AsyncSession = Depends(get_db)):
    meeting = await db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(404, "meeting not found")

    result = await db.execute(
        select(Item).where(Item.meeting_id == meeting_id).order_by(Item.score.desc())
    )
    items = result.scalars().all()
    return [item.to_dict() for item in items]
