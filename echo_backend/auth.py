from dataclasses import dataclass

from fastapi import Header, HTTPException

from echo_backend.services.firebase_admin import verify_firebase_id_token


@dataclass(frozen=True)
class CurrentUser:
    firebase_uid: str


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(401, "missing authorization token")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(401, "invalid authorization token")
    return token.strip()


async def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    token = _extract_bearer_token(authorization)
    payload = verify_firebase_id_token(token)
    firebase_uid = payload.get("uid") if payload else None
    if not firebase_uid:
        raise HTTPException(401, "invalid or expired authorization token")
    return CurrentUser(firebase_uid=firebase_uid)
