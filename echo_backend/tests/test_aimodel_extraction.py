import threading
import time

from aimodel.ai_processing import gemini
from aimodel.service import analyze_transcript


def test_extract_items_normalizes_wrapped_json_and_status_synonyms(monkeypatch):
    raw = """
```json
{"items":[{"task":"Update privacy policy","owner":"John","status":"committed","due_date":"next sprint","risk_keywords":["privacy"],"evidence":"John will update the privacy policy next sprint."}]}
```
"""

    monkeypatch.setattr(gemini, "call_gemini_with_timeout", lambda prompt, timeout: raw)

    result = gemini.extract_items_from_chunk("John will update the privacy policy next sprint.", chunk_index=0)

    assert result.had_failure is False
    assert result.items[0]["status"] == "promised"
    assert result.items[0]["owner"] == "John"


def test_extract_items_reports_malformed_json(monkeypatch, capsys):
    monkeypatch.setattr(gemini, "call_gemini_with_timeout", lambda prompt, timeout: "not valid json")

    result = gemini.extract_items_from_chunk("Alice will follow up tomorrow.", chunk_index=2)

    captured = capsys.readouterr()
    assert result.had_failure is True
    assert result.items == []
    assert "Chunk 2 JSON decode error" in captured.out


def test_analyze_transcript_falls_back_when_commitment_signals_have_no_items(monkeypatch):
    monkeypatch.setattr(
        "aimodel.service.extract_items_from_chunk",
        lambda chunk, chunk_index=0: gemini.ExtractionResult(items=[], had_failure=False),
    )
    monkeypatch.setattr("aimodel.service.generate_summary", lambda transcript: "Summary")
    monkeypatch.setattr("aimodel.service.get_summary_delay", lambda: 0.0)
    monkeypatch.setattr("aimodel.service.get_chunk_delay", lambda: 0.0)

    result = analyze_transcript("mtg_actions", "John will update the privacy policy next sprint.")

    assert result["meeting_id"] == "mtg_actions"
    assert result["items"]
    assert result["high_risk_count"] >= 0


def test_analyze_transcript_returns_partial_results_immediately_after_failure(monkeypatch):
    calls = {"count": 0}

    def fake_extract(chunk, chunk_index=0):
        calls["count"] += 1
        if calls["count"] == 1:
            return gemini.ExtractionResult(
                items=[
                    {
                        "task": "Update privacy policy",
                        "owner": "John",
                        "status": "promised",
                        "due_date": "next sprint",
                        "risk_keywords": ["privacy"],
                        "evidence": "John will update the privacy policy next sprint.",
                    }
                ],
                had_failure=False,
            )
        return gemini.ExtractionResult(items=[], had_failure=True, error="timeout")

    monkeypatch.setattr("aimodel.service.extract_items_from_chunk", fake_extract)
    monkeypatch.setattr("aimodel.service.chunk_transcript", lambda transcript: ["chunk-1", "chunk-2", "chunk-3"])
    monkeypatch.setattr("aimodel.service.get_chunk_delay", lambda: 0.0)
    monkeypatch.setattr("aimodel.service.get_summary_delay", lambda: 0.0)
    monkeypatch.setattr(
        "aimodel.service.generate_summary",
        lambda transcript: (_ for _ in ()).throw(AssertionError("summary should not run after failure")),
    )

    result = analyze_transcript("mtg_partial", "John will update the privacy policy next sprint.")

    assert calls["count"] == 2
    assert result["meeting_id"] == "mtg_partial"
    assert result["summary"] == "Partial analysis returned because Gemini extraction timed out or failed."
    assert len(result["items"]) == 1


def test_analyze_transcript_falls_back_immediately_after_failure_with_action_signals(monkeypatch):
    calls = {"count": 0}

    def fake_extract(chunk, chunk_index=0):
        calls["count"] += 1
        return gemini.ExtractionResult(items=[], had_failure=True, error="timeout")

    monkeypatch.setattr("aimodel.service.extract_items_from_chunk", fake_extract)
    monkeypatch.setattr("aimodel.service.chunk_transcript", lambda transcript: ["chunk-1", "chunk-2"])
    monkeypatch.setattr("aimodel.service.get_chunk_concurrency", lambda: 1)
    monkeypatch.setattr("aimodel.service.get_chunk_delay", lambda: 0.0)
    monkeypatch.setattr("aimodel.service.get_summary_delay", lambda: 0.0)

    result = analyze_transcript("mtg_timeout", "John will update the privacy policy next sprint.")

    assert calls["count"] == 1
    assert result["meeting_id"] == "mtg_timeout"
    assert result["items"]


def test_analyze_transcript_processes_chunks_with_bounded_parallelism(monkeypatch):
    active = {"count": 0, "max": 0}
    lock = threading.Lock()

    def fake_extract(chunk, chunk_index=0):
        with lock:
            active["count"] += 1
            active["max"] = max(active["max"], active["count"])
        time.sleep(0.05)
        with lock:
            active["count"] -= 1
        return gemini.ExtractionResult(
            items=[
                {
                    "task": f"Task {chunk_index}",
                    "owner": "John",
                    "status": "promised",
                    "due_date": "next sprint",
                    "risk_keywords": [],
                    "evidence": f"Chunk {chunk_index}",
                }
            ],
            had_failure=False,
        )

    monkeypatch.setattr("aimodel.service.extract_items_from_chunk", fake_extract)
    monkeypatch.setattr("aimodel.service.chunk_transcript", lambda transcript: ["chunk-1", "chunk-2", "chunk-3", "chunk-4"])
    monkeypatch.setattr("aimodel.service.get_chunk_delay", lambda: 0.0)
    monkeypatch.setattr("aimodel.service.get_chunk_concurrency", lambda: 2)
    monkeypatch.setattr("aimodel.service.get_summary_delay", lambda: 0.0)
    monkeypatch.setattr("aimodel.service.generate_summary", lambda transcript: "Summary")

    result = analyze_transcript("mtg_parallel", "John will update the privacy policy next sprint.")

    assert active["max"] >= 2
    assert [item["task"] for item in result["items"]] == ["Task 0", "Task 1", "Task 2", "Task 3"]
