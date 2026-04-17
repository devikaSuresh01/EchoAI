import os
import tempfile
import uuid
from collections import Counter
from datetime import datetime, timezone


def _allow_stub_ai() -> bool:
    return (os.getenv("ALLOW_STUB_AI") or "").strip().lower() in {"1", "true", "yes", "on"}


def _has_gemini_key() -> bool:
    return bool((os.getenv("GEMINI_API_KEY") or "").strip())


def _build_stub_item(transcript: str, sentence: str, index: int) -> dict:
    lowered = sentence.lower()
    risk_keywords = [
        word for word in ("privacy", "compliance", "security", "delay", "risk", "urgent")
        if word in lowered
    ]

    if "done" in lowered or "completed" in lowered or "resolved" in lowered:
        status = "done"
        confidence = 0.88
        score = 20
        risk = "low"
        reason = "completed work mentioned in transcript"
    elif "defer" in lowered or "next sprint" in lowered or "later" in lowered:
        status = "deferred"
        confidence = 0.62
        score = 86 if risk_keywords else 72
        risk = "high" if score >= 80 else "medium"
        reason = "deferred work with unclear commitment"
    elif "in progress" in lowered or "working on" in lowered:
        status = "in_progress"
        confidence = 0.79
        score = 48
        risk = "medium"
        reason = "work appears active but unfinished"
    else:
        status = "not_started"
        confidence = 0.68
        score = 64 if risk_keywords else 40
        risk = "medium" if score >= 40 else "low"
        reason = "action item detected without clear completion signal"

    owner = "unknown"
    for token in sentence.replace(",", " ").split():
        clean = token.strip(".:;!?")
        if clean.istitle():
            owner = clean
            break

    return {
        "id": str(uuid.uuid4()),
        "task": sentence.strip(),
        "owner": owner or "unknown",
        "status": status,
        "due_date": "unspecified",
        "risk_keywords": risk_keywords,
        "evidence": sentence.strip(),
        "score": score,
        "risk": risk,
        "reason": reason,
        "confidence": confidence,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _stub_process_meeting(meeting_id: str, transcript: str) -> dict:
    raw_sentences = [part.strip() for part in transcript.replace("\n", " ").split(".") if part.strip()]
    sentences = raw_sentences[:10] or [transcript.strip() or "No transcript content provided"]
    items = [_build_stub_item(transcript, sentence, idx) for idx, sentence in enumerate(sentences, start=1)]
    risk_counts = Counter(item["risk"] for item in items)

    return {
        "meeting_id": meeting_id,
        "summary": f"{len(items)} action items detected. High risk items: {risk_counts.get('high', 0)}.",
        "high_risk_count": risk_counts.get("high", 0),
        "items": items,
    }


async def transcribe_audio(content: bytes, filename: str | None) -> dict:
    from aimodel.transcription.service import get_transcript_from_audio

    suffix = os.path.splitext(filename or "upload.bin")[1] or ".bin"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        transcript = get_transcript_from_audio(temp_path)
    finally:
        try:
            os.remove(temp_path)
        except FileNotFoundError:
            pass

    return {
        "text": transcript,
        "duration": 0,
        "language": "en",
    }


async def analyze_transcript(meeting_id: str, transcript: str) -> dict:
    if _allow_stub_ai():
        return _stub_process_meeting(meeting_id, transcript)

    if not _has_gemini_key():
        raise RuntimeError(
            "GEMINI_API_KEY is not configured for backend AI analysis. "
            "Set GEMINI_API_KEY or explicitly enable ALLOW_STUB_AI=true for local stub mode."
        )

    from aimodel.service import analyze_transcript as run_aimodel_analysis

    return run_aimodel_analysis(meeting_id, transcript)
