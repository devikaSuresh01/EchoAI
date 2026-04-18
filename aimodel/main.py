import os
import shutil
import tempfile

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from aimodel.ai_processing.file_reader import extract_text_from_file
from aimodel.service import analyze_transcript, get_chunk_delay, get_max_words, get_summary_delay
from aimodel.transcription.service import SUPPORTED_AUDIO_EXTENSIONS, get_transcript_from_audio, get_transcript_from_text
from constants.echoai import (
    AUDIO_UPLOAD_TOO_LARGE_MESSAGE,
    MAX_AUDIO_UPLOAD_BYTES,
    MAX_TRANSCRIPT_UPLOAD_BYTES,
    TRANSCRIPT_UPLOAD_TOO_LARGE_MESSAGE,
)

load_dotenv()

TEXT_FILE_EXTENSIONS = {".txt", ".docx", ".pdf"}
TEMP_DIR = os.path.join(tempfile.gettempdir(), "echoai_uploads")
os.makedirs(TEMP_DIR, exist_ok=True)

app = FastAPI(
    title="EchoAI — AI Processing Service",
    description="Transcript normalization, Whisper transcription, and Gemini analysis service",
    version="2.0.0",
)


class MeetingRequest(BaseModel):
    meeting_id: str
    transcript: str


class TextRequest(BaseModel):
    meeting_id: str
    transcript: str


def _write_upload_to_temp(file: UploadFile, suffix: str) -> str:
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix, dir=TEMP_DIR)
    os.close(tmp_fd)
    with open(tmp_path, "wb") as tmp:
        shutil.copyfileobj(file.file, tmp)
    return tmp_path


def _raise_bad_request(detail: str) -> None:
    raise HTTPException(status_code=400, detail=detail)


@app.post("/process-meeting")
def process_meeting(req: MeetingRequest):
    try:
        return analyze_transcript(req.meeting_id, req.transcript)
    except ValueError as exc:
        _raise_bad_request(str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/process-text")
def process_text(req: TextRequest):
    try:
        transcript = get_transcript_from_text(req.transcript)
        return analyze_transcript(req.meeting_id, transcript)
    except ValueError as exc:
        _raise_bad_request(str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/process-file")
async def process_file(
    meeting_id: str = Form(...),
    file: UploadFile = File(...),
):
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in TEXT_FILE_EXTENSIONS:
        _raise_bad_request(f"Unsupported file type '{ext}'. Allowed: .txt, .docx, .pdf")

    tmp_path = _write_upload_to_temp(file, ext)
    try:
        if os.path.getsize(tmp_path) > MAX_TRANSCRIPT_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=TRANSCRIPT_UPLOAD_TOO_LARGE_MESSAGE)
        try:
            transcript = extract_text_from_file(tmp_path)
        except ValueError as exc:
            _raise_bad_request(str(exc))
        except RuntimeError as exc:
            _raise_bad_request(str(exc))

        return analyze_transcript(meeting_id, transcript)
    except ValueError as exc:
        _raise_bad_request(str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/process-audio")
async def process_audio(
    meeting_id: str = Form(...),
    file: UploadFile = File(...),
):
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in SUPPORTED_AUDIO_EXTENSIONS:
        allowed = ", ".join(sorted(SUPPORTED_AUDIO_EXTENSIONS))
        _raise_bad_request(f"Unsupported audio type '{ext}'. Allowed: {allowed}")

    tmp_path = _write_upload_to_temp(file, ext)
    try:
        if os.path.getsize(tmp_path) > MAX_AUDIO_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=AUDIO_UPLOAD_TOO_LARGE_MESSAGE)
        transcript = get_transcript_from_audio(tmp_path)
        if not transcript.strip():
            raise HTTPException(
                status_code=422,
                detail="Whisper returned an empty transcript. File may be silent or corrupt.",
            )
        result = analyze_transcript(meeting_id, transcript)
        result["transcript"] = transcript
        return result
    except ValueError as exc:
        _raise_bad_request(str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Audio transcription failed: {exc}") from exc
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "echoai-ai-processing",
        "config": {
            "gemini_configured": bool((os.getenv("GEMINI_API_KEY") or "").strip()),
            "gemini_chunk_delay": get_chunk_delay(),
            "gemini_summary_delay": get_summary_delay(),
            "max_transcript_words": get_max_words(),
        },
        "supported_inputs": {
            "text_files": sorted(TEXT_FILE_EXTENSIONS),
            "audio_files": sorted(SUPPORTED_AUDIO_EXTENSIONS),
        },
        "note": "Frontend should call echo_backend only. This service is intended to sit behind the backend.",
    }
