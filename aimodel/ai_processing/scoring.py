"""
scoring.py — Rule-based risk scoring engine.
"""

import uuid
from datetime import datetime, timezone

RISK_KEYWORDS = {"privacy", "security", "compliance", "legal", "customer"}

VAGUE_DEADLINE_PHRASES = {
    "next sprint", "later", "sometime", "soon", "eventually",
    "next week", "tbd", "to be decided", "when possible", "not specified"
}

# Map Gemini status values → team API contract status values
STATUS_MAP = {
    "deferred":  "deferred",
    "promised":  "not_started",
    "blocked":   "in_progress",
    "pending":   "not_started",
    "done":      "done",
    "resolved":  "resolved",
    "in_progress": "in_progress",
}


def score_item(item: dict) -> dict:
    score = 0
    reasons = []

    status_raw = item.get("status", "").lower()
    owner = item.get("owner", "").lower().strip()
    due_date = item.get("due_date", "not specified").lower().strip()
    risk_keywords_raw = [kw.lower() for kw in item.get("risk_keywords", [])]

    # Rule 1: deferred → +40
    if status_raw == "deferred":
        score += 40
        reasons.append("task is deferred")

    # Rule 2: risk keyword match → +30
    matched_risk = RISK_KEYWORDS.intersection(set(risk_keywords_raw))
    if matched_risk:
        score += 30
        reasons.append(f"risk keywords: {', '.join(sorted(matched_risk))}")

    # Rule 3: vague or missing deadline → +20
    is_vague = (
        not due_date
        or due_date == "not specified"
        or any(phrase in due_date for phrase in VAGUE_DEADLINE_PHRASES)
    )
    if is_vague:
        score += 20
        reasons.append("vague or missing deadline")

    # Rule 4: no owner → +15
    if not owner or owner == "unknown":
        score += 15
        reasons.append("no owner assigned")

    # Map score → risk level
    if score >= 40:
        risk = "high"
    elif score >= 20:
        risk = "medium"
    else:
        risk = "low"

    # Derive confidence from score (higher score = more confident it's risky)
    confidence = round(min(score / 100, 0.99), 2)

    reason_text = "; ".join(reasons) if reasons else "no significant risk factors"

    # Map status to team API contract values
    status_mapped = STATUS_MAP.get(status_raw, "not_started")

    return {
        "id": str(uuid.uuid4()),
        "task": item.get("task", ""),
        "owner": item.get("owner", "unknown"),
        "status": status_mapped,
        "due_date": due_date if due_date else "unspecified",
        "risk_keywords": list(matched_risk),
        "evidence": item.get("evidence", ""),
        "score": score,
        "risk": risk,
        "reason": reason_text,
        "confidence": confidence,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def score_all_items(items: list[dict]) -> list[dict]:
    scored = [score_item(item) for item in items]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored
