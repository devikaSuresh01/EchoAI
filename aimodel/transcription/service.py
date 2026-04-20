"""transcription/service.py — Canonical transcription service interface."""

from .transcriber import SUPPORTED_AUDIO_EXTENSIONS, transcribe_audio


def get_transcript_from_audio(file_path: str) -> str:
    """Transcribes audio file → returns plain transcript string."""
    return transcribe_audio(file_path)


def get_transcript_from_text(text: str) -> str:
    """Cleans and returns plain text string."""
    return text.strip()
