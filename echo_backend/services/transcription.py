import os
import tempfile


async def transcribe_audio(content: bytes, filename: str | None) -> dict:
    # Import lazily so the app can boot and tests can run without loading Whisper eagerly.
    from aimodel.transcription.service import get_transcript_from_audio

    suffix = os.path.splitext(filename or "upload.bin")[1] or ".bin"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        transcript = get_transcript_from_audio(temp_path)
    finally:
        try:
            os.remove(temp_path)
        except FileNotFoundError:
            pass

    return {
        "text": transcript,
        "duration": 0,
        "language": "en",
    }
