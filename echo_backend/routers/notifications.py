from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from echo_backend.database import get_db
from echo_backend.models import DeviceToken
from echo_backend.schemas import OkResponse, RegisterDeviceRequest

router = APIRouter()


@router.post("/register-device", response_model=OkResponse)
async def register_device(body: RegisterDeviceRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(DeviceToken.id).where(DeviceToken.token == body.token))
    if not existing.first():
        db.add(DeviceToken(token=body.token))
        await db.commit()
    return {"ok": True}
