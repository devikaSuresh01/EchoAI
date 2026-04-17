import base64
import json
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from echo_backend.env import load_env
from echo_backend.models import DeviceToken

load_env()


def _load_firebase_credentials(credentials_module):
    credentials_json = (os.getenv("FIREBASE_CREDENTIALS_JSON") or "").strip()
    if credentials_json:
        return credentials_module.Certificate(json.loads(credentials_json))

    credentials_b64 = (os.getenv("FIREBASE_CREDENTIALS_BASE64") or "").strip()
    if credentials_b64:
        decoded = base64.b64decode(credentials_b64).decode("utf-8")
        return credentials_module.Certificate(json.loads(decoded))

    credentials_path = (os.getenv("FIREBASE_CREDENTIALS_PATH") or "").strip()
    if credentials_path:
        return credentials_module.Certificate(credentials_path)

    return None


async def send_high_risk_notification(db: AsyncSession, items: list[dict]) -> None:
    if not items:
        return

    result = await db.execute(select(DeviceToken.token))
    tokens = [row[0] for row in result.all()]
    if not tokens:
        return

    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
    except ImportError:
        return

    app = None
    try:
        app = firebase_admin.get_app()
    except ValueError:
        try:
            cred = _load_firebase_credentials(credentials)
            if cred is None:
                return
            app = firebase_admin.initialize_app(cred)
        except Exception:
            return

    top_item = max(items, key=lambda item: item.get("score", 0))
    message = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(
            title="Echo AI - High Risk Alert",
            body=top_item.get("task", "")[:80],
        ),
        data={
            "item_id": str(top_item.get("id", "")),
            "risk": str(top_item.get("risk", "")),
            "score": str(top_item.get("score", 0)),
        },
    )
    messaging.send_each_for_multicast(message, app=app)
