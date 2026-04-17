from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from echo_backend.auth import CurrentUser, get_current_user
from echo_backend.database import get_db
from echo_backend.models import DeviceToken, utcnow
from echo_backend.schemas import (
    OkResponse,
    RegisterDeviceRequest,
    UnregisterDeviceRequest,
)

router = APIRouter()


@router.post("/register-device", response_model=OkResponse)
async def register_device(
    body: RegisterDeviceRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(DeviceToken).where(DeviceToken.token == body.token))
    token_row = existing.scalar_one_or_none()
    if token_row is None:
        db.add(DeviceToken(token=body.token, firebase_uid=current_user.firebase_uid))
    else:
        token_row.firebase_uid = current_user.firebase_uid
        token_row.updated_at = utcnow()

    await db.commit()
    return {"ok": True}


@router.post("/unregister-device", response_model=OkResponse)
async def unregister_device(
    body: UnregisterDeviceRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(DeviceToken).where(
            DeviceToken.token == body.token,
            DeviceToken.firebase_uid == current_user.firebase_uid,
        )
    )
    token_row = existing.scalar_one_or_none()
    if token_row is not None:
        await db.delete(token_row)
        await db.commit()
    return {"ok": True}
