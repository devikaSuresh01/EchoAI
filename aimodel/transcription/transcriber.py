"""
transcription/transcriber.py — Whisper transcription layer.
"""

import os


SUPPORTED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a"}

_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise RuntimeError(
                "faster-whisper is not installed. Add it to the environment to enable audio transcription."
            ) from exc

        print("[whisper] Loading Whisper model (first audio request)...")
        _model = WhisperModel("base", compute_type="int8")
        print("[whisper] Model loaded successfully.")
    return _model


def transcribe_audio(file_path: str) -> str:
    """
    Transcribes a supported audio file into plain text.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in SUPPORTED_AUDIO_EXTENSIONS:
        allowed = ", ".join(sorted(SUPPORTED_AUDIO_EXTENSIONS))
        raise ValueError(f"Unsupported audio type '{ext}'. Allowed: {allowed}")

    model = _get_model()
    segments, _ = model.transcribe(file_path)
    full_text = " ".join(segment.text.strip() for segment in segments if segment.text.strip())
    return full_text.strip()
