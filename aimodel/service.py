from concurrent.futures import ThreadPoolExecutor
import os
import re
import time
import logging

from aimodel.ai_processing.chunker import chunk_transcript
from aimodel.ai_processing.gemini import extract_items_from_chunk
from aimodel.ai_processing.scoring import score_all_items
from aimodel.ai_processing.summarizer import generate_summary
from echo_backend.services.aimodel_gateway import build_fallback_analysis

logger = logging.getLogger(__name__)


def get_max_words() -> int:
    return int(os.getenv("MAX_TRANSCRIPT_WORDS", "10000"))


def get_chunk_delay() -> float:
    return float(os.getenv("GEMINI_CHUNK_DELAY", "0.0"))


def get_chunk_concurrency() -> int:
    return max(1, int(os.getenv("GEMINI_CHUNK_CONCURRENCY", "2")))


def get_summary_delay() -> float:
    return float(os.getenv("GEMINI_SUMMARY_DELAY", "0.0"))


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


def _build_scored_result(meeting_id: str, transcript: str, raw_items: list[dict], *, summary: str) -> dict:
    scored_items = score_all_items(raw_items)
    high_risk_count = sum(1 for item in scored_items if item["risk"] == "high")

    return {
        "meeting_id": meeting_id,
        "summary": summary,
        "high_risk_count": high_risk_count,
        "items": scored_items,
    }


def _iter_chunk_extractions(chunks: list[str]):
    if not chunks:
        return

    concurrency = min(get_chunk_concurrency(), len(chunks))
    if concurrency <= 1:
        for index, chunk in enumerate(chunks):
            yield index, extract_items_from_chunk(chunk, chunk_index=index)
            if index < len(chunks) - 1:
                time.sleep(get_chunk_delay())
        return

    for start in range(0, len(chunks), concurrency):
        batch = chunks[start:start + concurrency]
        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = [
                (start + offset, executor.submit(extract_items_from_chunk, chunk, chunk_index=start + offset))
                for offset, chunk in enumerate(batch)
            ]
            batch_results = [(index, future.result()) for index, future in futures]
        batch_results.sort(key=lambda item: item[0])
        for result in batch_results:
            yield result
        if start + concurrency < len(chunks):
            time.sleep(get_chunk_delay())


def analyze_transcript(meeting_id: str, transcript: str) -> dict:
    meeting_id = normalize_meeting_id(meeting_id)
    transcript = normalize_transcript(transcript)

    chunks = chunk_transcript(transcript)
    extraction_started = time.perf_counter()
    raw_items = []
    had_extraction_failure = False

    for index, extraction in _iter_chunk_extractions(chunks):
        raw_items.extend(extraction.items)
        had_extraction_failure = had_extraction_failure or extraction.had_failure
        if extraction.had_failure:
            extraction_elapsed_ms = round((time.perf_counter() - extraction_started) * 1000, 2)
            if raw_items:
                logger.info(
                    "Transcript analysis returned partial results",
                    extra={
                        "meeting_id": meeting_id,
                        "chunk_count": len(chunks),
                        "extraction_duration_ms": extraction_elapsed_ms,
                        "used_partial_result": True,
                        "used_fallback": False,
                    },
                )
                return _build_scored_result(
                    meeting_id,
                    transcript,
                    raw_items,
                    summary="Partial analysis returned because Gemini extraction timed out or failed.",
                )
            if _transcript_has_action_signals(transcript):
                logger.info(
                    "Transcript analysis used fallback after extraction failure",
                    extra={
                        "meeting_id": meeting_id,
                        "chunk_count": len(chunks),
                        "extraction_duration_ms": extraction_elapsed_ms,
                        "used_partial_result": False,
                        "used_fallback": True,
                    },
                )
                return build_fallback_analysis(meeting_id, transcript)
            logger.info(
                "Transcript analysis failed without fallback result",
                extra={
                    "meeting_id": meeting_id,
                    "chunk_count": len(chunks),
                    "extraction_duration_ms": extraction_elapsed_ms,
                    "used_partial_result": False,
                    "used_fallback": False,
                },
            )
            return {
                "meeting_id": meeting_id,
                "summary": "Analysis unavailable because Gemini extraction timed out or failed.",
                "high_risk_count": 0,
                "items": [],
            }
    if not raw_items and (_transcript_has_action_signals(transcript) or had_extraction_failure):
        extraction_elapsed_ms = round((time.perf_counter() - extraction_started) * 1000, 2)
        logger.info(
            "Transcript analysis used fallback after empty extraction",
            extra={
                "meeting_id": meeting_id,
                "chunk_count": len(chunks),
                "extraction_duration_ms": extraction_elapsed_ms,
                "used_partial_result": False,
                "used_fallback": True,
            },
        )
        return build_fallback_analysis(meeting_id, transcript)

    extraction_elapsed_ms = round((time.perf_counter() - extraction_started) * 1000, 2)
    logger.info(
        "Transcript extraction complete",
        extra={
            "meeting_id": meeting_id,
            "chunk_count": len(chunks),
            "extraction_duration_ms": extraction_elapsed_ms,
            "used_partial_result": False,
            "used_fallback": False,
        },
    )

    time.sleep(get_summary_delay())
    summary_started = time.perf_counter()
    summary = generate_summary(transcript)
    summary_elapsed_ms = round((time.perf_counter() - summary_started) * 1000, 2)
    logger.info(
        "Transcript summary complete",
        extra={
            "meeting_id": meeting_id,
            "chunk_count": len(chunks),
            "summary_duration_ms": summary_elapsed_ms,
            "used_partial_result": False,
            "used_fallback": False,
        },
    )
    return _build_scored_result(
        meeting_id,
        transcript,
        raw_items,
        summary=summary,
    )
