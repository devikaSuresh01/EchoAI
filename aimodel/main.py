from fastapi import FastAPI, UploadFile, File
import shutil
import uuid
import os
from pydantic import BaseModel

from transcription.service import get_transcript_from_audio, get_transcript_from_text

app = FastAPI()

UPLOAD_DIR = "temp"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Endpoint for processing audio input
@app.post("/process-audio")
async def process_audio(file: UploadFile = File(...)):
    file_path = f"temp/{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    transcript = get_transcript_from_audio(file_path)

    os.remove(file_path)

    return {
        "transcript": transcript
    }

# Endpoint for processing text input- This supports your second input mode (text upload)
class TextRequest(BaseModel):
    text: str

@app.post("/process-text")
def process_text(req: TextRequest):
    transcript = get_transcript_from_text(req.text)

    return {
        "transcript": transcript
    }