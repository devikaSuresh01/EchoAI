from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from echo_backend.models import DeviceToken
from echo_backend.services.firebase_admin import get_firebase_admin_app


async def send_high_risk_notification(
    db: AsyncSession,
    meeting_id: str,
    items: list[dict],
    firebase_uid: str,
) -> None:
    if not items:
        return

    result = await db.execute(
        select(DeviceToken.token).where(DeviceToken.firebase_uid == firebase_uid)
    )
    tokens = [row[0] for row in result.all()]
    if not tokens:
        return

    try:
        from firebase_admin import messaging
    except ImportError:
        return

    try:
        app = get_firebase_admin_app()
    except Exception:
        return
    if app is None:
        return

    top_item = max(items, key=lambda item: item.get("score", 0))
    message = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(
            title="Echo AI - High Risk Alert",
            body=top_item.get("task", "")[:80],
        ),
        data={
            "meetingId": str(meeting_id),
            "itemId": str(top_item.get("id", "")),
            "risk": str(top_item.get("risk", "")),
            "score": str(top_item.get("score", 0)),
        },
    )
    messaging.send_each_for_multicast(message, app=app)
