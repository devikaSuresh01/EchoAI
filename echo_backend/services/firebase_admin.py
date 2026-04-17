import base64
import json
import os

from echo_backend.env import load_env

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


def get_firebase_admin_app():
    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError:
        return None

    try:
        return firebase_admin.get_app()
    except ValueError:
        cred = _load_firebase_credentials(credentials)
        if cred is None:
            return None
        return firebase_admin.initialize_app(cred)


def verify_firebase_id_token(id_token: str) -> dict | None:
    app = get_firebase_admin_app()
    if app is None:
        return None

    try:
        from firebase_admin import auth as firebase_auth

        return firebase_auth.verify_id_token(id_token, app=app)
    except Exception:
        return None
