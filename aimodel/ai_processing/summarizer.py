"""
summarizer.py — Generates a short meeting summary using Gemini.

FIXES APPLIED:
  FIX 3: Removed unused imports (threading no longer needed here).
  FIX 9: TIMEOUT_SECONDS imported from gemini_client — no local copy.
  FIX 3 (retry logic): Retry loop restructured to be explicit and clear.
         Previously `continue` on last iteration silently fell through —
         now each attempt is explicit so errors are never masked.
"""

import re
import time

from aimodel.ai_processing.gemini_client import call_gemini_with_timeout, TIMEOUT_SECONDS


SUMMARY_PROMPT_TEMPLATE = """
You are an AI assistant that summarizes meeting transcripts for accountability tracking.

Write a single concise summary (2-3 sentences max) of the meeting below.
Focus on: what was discussed, what was deferred or promised, and any risks mentioned.

Return only the summary text. No bullet points, no headings, no extra formatting.

Transcript:
\"\"\"
{transcript}
\"\"\"
"""

MAX_SUMMARY_WORDS = 3000


def generate_summary(transcript: str) -> str:
    """
    Sends transcript to Gemini and returns a short 2-3 sentence summary.

    FIX 9: TIMEOUT_SECONDS imported from gemini_client.
    FIX 3: Retry loop is now explicit — attempt 1, then attempt 2 on 429 only.
            No silent fall-through on non-429 errors.
    """
    words = transcript.split()
    truncated = " ".join(words[:MAX_SUMMARY_WORDS]) if len(words) > MAX_SUMMARY_WORDS else transcript
    prompt = SUMMARY_PROMPT_TEMPLATE.format(transcript=truncated)

    # Attempt 1
    try:
        raw = call_gemini_with_timeout(prompt, TIMEOUT_SECONDS)
        if raw is None:
            return "Summary unavailable — Gemini request timed out."
        return _clean_summary(raw)
    except Exception as e:
        if "429" not in str(e):
            print(f"[summarizer] Gemini error (no retry): {e}")
            return "Summary unavailable due to an API error."
        print(f"[summarizer] Rate limited (429). Waiting 5s before retry...")

    # Attempt 2 — only reached on 429
    time.sleep(5)
    try:
        raw = call_gemini_with_timeout(prompt, TIMEOUT_SECONDS)
        if raw is None:
            return "Summary unavailable — Gemini request timed out on retry."
        return _clean_summary(raw)
    except Exception as e:
        print(f"[summarizer] Gemini error on retry: {e}")
        return "Summary unavailable due to an API error."


def _clean_summary(raw: str) -> str:
    summary = raw.strip()
    summary = re.sub(r"^```.*?```$", "", summary, flags=re.DOTALL).strip()
    return summary if summary else "Summary could not be generated."
