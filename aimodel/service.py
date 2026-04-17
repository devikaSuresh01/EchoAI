import os
import re
import time

from aimodel.ai_processing.chunker import chunk_transcript
from aimodel.ai_processing.gemini import extract_items_from_chunk
from aimodel.ai_processing.scoring import score_all_items
from aimodel.ai_processing.summarizer import generate_summary


def get_max_words() -> int:
    return int(os.getenv("MAX_TRANSCRIPT_WORDS", "10000"))


def get_chunk_delay() -> float:
    return float(os.getenv("GEMINI_CHUNK_DELAY", "1.0"))


def get_summary_delay() -> float:
    return float(os.getenv("GEMINI_SUMMARY_DELAY", "2.0"))


def normalize_meeting_id(meeting_id: str) -> str:
    value = meeting_id.strip()
    if not value:
        raise ValueError("meeting_id cannot be empty.")
    return value


def normalize_transcript(transcript: str, *, source_label: str = "Transcript") -> str:
    value = transcript.strip()
    if not value:
        raise ValueError(f"{source_label} is empty.")

    word_count = len(value.split())
    max_words = get_max_words()
    if word_count > max_words:
        raise ValueError(
            f"{source_label} is too long ({word_count} words). "
            f"Maximum allowed is {max_words} words."
        )

    return value


ACTION_SIGNAL_PATTERN = re.compile(
    r"\b("
    r"will|would|should|needs?\s+to|follow\s*up|action item|next step|assigned|"
    r"owner|due|by\s+\w+|next sprint|next week|commit(?:ted)?|promised"
    r")\b",
    flags=re.IGNORECASE,
)


def _transcript_has_action_signals(transcript: str) -> bool:
    return bool(ACTION_SIGNAL_PATTERN.search(transcript))


def analyze_transcript(meeting_id: str, transcript: str) -> dict:
    meeting_id = normalize_meeting_id(meeting_id)
    transcript = normalize_transcript(transcript)

    chunks = chunk_transcript(transcript)
    raw_items = []
    had_extraction_failure = False

    for index, chunk in enumerate(chunks):
        extraction = extract_items_from_chunk(chunk, chunk_index=index)
        raw_items.extend(extraction.items)
        had_extraction_failure = had_extraction_failure or extraction.had_failure
        if index < len(chunks) - 1:
            time.sleep(get_chunk_delay())

    if not raw_items and (_transcript_has_action_signals(transcript) or had_extraction_failure):
        raise RuntimeError(
            "Action-item extraction failed or returned no structured items for a transcript "
            "that appears to contain commitments."
        )

    time.sleep(get_summary_delay())

    scored_items = score_all_items(raw_items)
    high_risk_count = sum(1 for item in scored_items if item["risk"] == "high")

    return {
        "meeting_id": meeting_id,
        "summary": generate_summary(transcript),
        "high_risk_count": high_risk_count,
        "items": scored_items,
    }
