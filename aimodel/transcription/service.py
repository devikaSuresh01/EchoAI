from .transcriber import transcribe_audio


def get_transcript_from_audio(file_path: str) -> str:
    return transcribe_audio(file_path)


def get_transcript_from_text(text: str) -> str:
    return text.strip()