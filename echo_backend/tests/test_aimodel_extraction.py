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


def test_analyze_transcript_raises_when_commitment_signals_have_no_items(monkeypatch):
    monkeypatch.setattr(
        "aimodel.service.extract_items_from_chunk",
        lambda chunk, chunk_index=0: gemini.ExtractionResult(items=[], had_failure=False),
    )
    monkeypatch.setattr("aimodel.service.generate_summary", lambda transcript: "Summary")
    monkeypatch.setattr("aimodel.service.get_summary_delay", lambda: 0.0)
    monkeypatch.setattr("aimodel.service.get_chunk_delay", lambda: 0.0)

    try:
        analyze_transcript("mtg_actions", "John will update the privacy policy next sprint.")
    except RuntimeError as exc:
        assert "Action-item extraction failed" in str(exc)
    else:
        raise AssertionError("Expected RuntimeError when commitment signals produce no structured items.")
