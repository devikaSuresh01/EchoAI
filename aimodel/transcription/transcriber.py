from faster_whisper import WhisperModel

# Load model once (important)
model = WhisperModel("base", compute_type="int8")

def transcribe_audio(file_path: str) -> str:
    segments, _ = model.transcribe(file_path)

    full_text = ""
    for segment in segments:
        full_text += segment.text + " "

    return full_text.strip()
