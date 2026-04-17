"""
gemini_client.py — Migrated to google-genai SDK.
"""

import os
import threading

TIMEOUT_SECONDS = 15

_client = None
_client_lock = threading.Lock()


def _get_client():
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
                if not api_key:
                    raise RuntimeError(
                        "GEMINI_API_KEY is not set. Configure it in the environment before running AI analysis."
                    )

                try:
                    from google import genai
                except ImportError as exc:
                    raise RuntimeError(
                        "google-genai is not installed. Add it to the environment to enable Gemini analysis."
                    ) from exc

                _client = genai.Client(api_key=api_key)
    return _client


def call_gemini_with_timeout(prompt: str, timeout: int = TIMEOUT_SECONDS) -> "str | None":
    result_container = {"text": None, "error": None}
    done_event = threading.Event()

    def _worker():
        try:
            client = _get_client()
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            result_container["text"] = response.text
        except Exception as e:
            result_container["error"] = e
        finally:
            done_event.set()

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
    finished = done_event.wait(timeout=timeout)

    if not finished:
        print(f"[gemini_client] Request timed out after {timeout}s.")
        return None

    if result_container["error"] is not None:
        raise result_container["error"]

    return result_container["text"]
