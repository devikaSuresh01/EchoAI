import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from echo_backend.env import load_env
from echo_backend.routers import meetings, notifications, process, status, transcribe

load_env()

app = FastAPI(title="Echo AI Backend", version="1.0.0")

allowed_origins = [origin for origin in (os.getenv("ALLOWED_ORIGINS") or "").split(",") if origin]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transcribe.router)
app.include_router(process.router)
app.include_router(meetings.router)
app.include_router(status.router)
app.include_router(notifications.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
