"""
gemini.py — Extracts structured items from transcript chunks using Gemini.

FIXES APPLIED:
  FIX 2: Uses call_gemini_with_timeout imported from gemini_client (single source).
  FIX 3: No unused imports.
  FIX 9: TIMEOUT_SECONDS imported from gemini_client — no local copy.
  FIX 2 (logging): chunk_index passed in and logged on JSON decode error so
         Person 4 can see exactly which chunk failed, not just a silent [].
"""

import json
import re
import time
from dataclasses import dataclass

from aimodel.ai_processing.gemini_client import call_gemini_with_timeout, TIMEOUT_SECONDS


EXTRACTION_PROMPT_TEMPLATE = """
You are an AI that extracts action items and commitments from meeting transcripts.

Analyze the following transcript chunk and extract ALL tasks, commitments, action items, follow-ups, and explicitly assigned next steps.

For each item, return a JSON array. Each object must have exactly these fields:
- "task": what needs to be done (string)
- "owner": person responsible, or "unknown" if not mentioned (string)
- "status": one of "deferred", "promised", "blocked", "pending", "done", "resolved", "in_progress" (string)
- "due_date": deadline or sprint reference, or "not specified" if vague/missing (string)
- "risk_keywords": list of risk words found e.g. ["privacy", "security"] (array of strings)
- "evidence": exact quote from transcript that supports this item (string)

Examples:
[
  {{
    "task": "Update privacy policy",
    "owner": "John",
    "status": "deferred",
    "due_date": "next sprint",
    "risk_keywords": ["privacy"],
    "evidence": "John said he will update the privacy policy next sprint."
  }},
  {{
    "task": "Finalize API contract for billing service",
    "owner": "Priya",
    "status": "promised",
    "due_date": "Friday",
    "risk_keywords": [],
    "evidence": "Priya will finalize the billing API contract by Friday."
  }}
]

Rules:
- Return ONLY a valid JSON array. No explanation, no markdown, no backticks.
- If no tasks found, return an empty array: []
- Do not invent information not present in the transcript.
- Treat "will", "should", "needs to", "follow up", "action item", "owned by", "next step", and "by <date>" as strong action signals.

Transcript chunk:
\"\"\"
{chunk}
\"\"\"
"""


@dataclass
class ExtractionResult:
    items: list[dict]
    had_failure: bool = False
    error: str | None = None


STATUS_NORMALIZATION = {
    "deferred": "deferred",
    "defer": "deferred",
    "postponed": "deferred",
    "delayed": "deferred",
    "later": "deferred",
    "pushed": "deferred",
    "promised": "promised",
    "commit": "promised",
    "committed": "promised",
    "assigned": "promised",
    "planned": "promised",
    "not_started": "promised",
    "todo": "pending",
    "to_do": "pending",
    "pending": "pending",
    "follow_up": "pending",
    "follow-up": "pending",
    "needs_follow_up": "pending",
    "blocked": "blocked",
    "waiting": "blocked",
    "stuck": "blocked",
    "dependency": "blocked",
    "depends": "blocked",
    "in_progress": "in_progress",
    "in progress": "in_progress",
    "working": "in_progress",
    "working on": "in_progress",
    "done": "done",
    "completed": "done",
    "resolved": "resolved",
    "closed": "resolved",
}


def _strip_markdown_fences(raw: str) -> str:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _extract_json_candidate(raw: str) -> str:
    text = _strip_markdown_fences(raw)
    if text.startswith("[") or text.startswith("{"):
        return text

    start_array = text.find("[")
    end_array = text.rfind("]")
    if start_array != -1 and end_array != -1 and end_array > start_array:
        return text[start_array:end_array + 1]

    start_obj = text.find("{")
    end_obj = text.rfind("}")
    if start_obj != -1 and end_obj != -1 and end_obj > start_obj:
        return text[start_obj:end_obj + 1]

    return text


def _normalize_status(status: str) -> str:
    cleaned = status.strip().lower().replace("-", "_")
    return STATUS_NORMALIZATION.get(cleaned, cleaned)


def _normalize_items(items: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "task": str(item.get("task", "")).strip(),
                "owner": str(item.get("owner", "unknown")).strip() or "unknown",
                "status": _normalize_status(str(item.get("status", "pending"))),
                "due_date": str(item.get("due_date", "not specified")).strip() or "not specified",
                "risk_keywords": item.get("risk_keywords", []) if isinstance(item.get("risk_keywords", []), list) else [],
                "evidence": str(item.get("evidence", "")).strip(),
            }
        )
    return normalized


def extract_items_from_chunk(chunk: str, chunk_index: int = 0, retry: int = 2) -> ExtractionResult:
    """
    Sends one transcript chunk to Gemini and returns extracted items.

    FIX 2 (logging): chunk_index is now logged on failure so you can see
    exactly which chunk was lost — previously all failures were silent [].
    FIX 9: TIMEOUT_SECONDS imported from gemini_client, not defined locally.

    Retries up to `retry` times on 429 rate limit with exponential backoff.
    """
    for attempt in range(retry + 1):
        try:
            prompt = EXTRACTION_PROMPT_TEMPLATE.format(chunk=chunk)
            raw = call_gemini_with_timeout(prompt, TIMEOUT_SECONDS)

            if raw is None:
                message = f"Chunk {chunk_index} timed out while extracting items."
                print(f"[gemini] {message}")
                return ExtractionResult(items=[], had_failure=True, error=message)

            candidate = _extract_json_candidate(raw)
            items = json.loads(candidate)

            # Gemini sometimes wraps the array: {"items": [...]}
            if isinstance(items, dict):
                items = items.get("items", [])

            if not isinstance(items, list):
                message = f"Chunk {chunk_index}: unexpected response shape."
                print(f"[gemini] {message} Raw response: {raw[:500]}")
                return ExtractionResult(items=[], had_failure=True, error=message)

            return ExtractionResult(items=_normalize_items(items))

        except json.JSONDecodeError as e:
            message = f"Chunk {chunk_index} JSON decode error: {e}."
            print(f"[gemini] {message} Raw response: {raw[:500] if 'raw' in locals() else '[no response]'}")
            return ExtractionResult(items=[], had_failure=True, error=message)

        except Exception as e:
            err_str = str(e)
            if "429" in err_str and attempt < retry:
                wait = 5 * (attempt + 1)
                print(f"[gemini] Chunk {chunk_index} rate limited (429). "
                      f"Waiting {wait}s before retry {attempt + 1}...")
                time.sleep(wait)
                continue
            message = f"Chunk {chunk_index} API error: {e}."
            print(f"[gemini] {message}")
            return ExtractionResult(items=[], had_failure=True, error=message)

    return ExtractionResult(items=[], had_failure=True, error=f"Chunk {chunk_index} extraction failed after retries.")
