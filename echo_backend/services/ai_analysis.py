import os
import uuid
from collections import Counter

import httpx

from echo_backend.env import load_env

load_env()


def _build_stub_item(transcript: str, sentence: str, index: int) -> dict:
    lowered = sentence.lower()
    risk_keywords = [word for word in ("privacy", "compliance", "security", "delay", "risk", "urgent") if word in lowered]

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


async def call_ai_service(meeting_id: str, transcript: str) -> dict:
    service_url = (os.getenv("AI_SERVICE_URL") or "").strip()
    if not service_url:
        return _stub_process_meeting(meeting_id, transcript)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{service_url.rstrip('/')}/process-meeting",
            json={"meeting_id": meeting_id, "transcript": transcript},
        )
        response.raise_for_status()
        data = response.json()

    data["meeting_id"] = meeting_id
    data.setdefault("items", [])
    for item in data["items"]:
        item.setdefault("id", str(uuid.uuid4()))
        item.setdefault("owner", "unknown")
        item.setdefault("due_date", "unspecified")
        item.setdefault("risk_keywords", [])
        item.setdefault("evidence", "")
        item.setdefault("reason", "")
        item.setdefault("confidence", 0.0)

    data.setdefault("summary", "")
    data.setdefault("high_risk_count", sum(1 for item in data["items"] if item.get("risk") == "high"))
    return data
