# 🎤 AI Meeting Tracker — Transcription Module

This module converts **audio → transcript** using Whisper and provides a clean interface for downstream AI processing.

It is designed to plug into an AI pipeline where transcripts are analyzed for commitments, risks, and deferred tasks.

---

# 🚀 Features

- 🎧 Audio → Text transcription (Whisper)
- 📝 Direct text input support
- 🔌 Plug-and-play interface for AI engineers
- ⚡ FastAPI endpoints for quick testing

---

# 📁 Project Structure
backend/
├── transcription/
│   ├── transcriber.py      # Whisper logic
│   └── service.py          # Unified interface (USE THIS)
│
├── main.py                 # API layer
├── requirements.txt
├── sample_audio.mp3
├── test_transcription.py

# ⚙️ Prerequisites

- Python 3.9+
- pip

# Setup Instructions
1. Clone the repo
git clone https://github.com/devikasuresh3282-pixel/EchoAI.git
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate     # Mac/Linux
venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt

# Running the API Server
uvicorn main:app --reload

# Open:
http://127.0.0.1:8000/docs

## Testing Transcription
Option 1: Swagger UI
Go to /process-audio
Click Try it out
Upload sample_audio.mp3
Click Execute

## How to Use in AI Pipeline

👉 IMPORTANT: Use only the service layer

✅ Audio Input
from transcription.service import get_transcript_from_audio

transcript = get_transcript_from_audio("sample_audio.mp3")

✅ Text Input
from transcription.service import get_transcript_from_text

transcript = get_transcript_from_text("raw transcript text")

# Output Format

Both methods return:

str  # clean transcript string

# Example:

"We collect user location but it's not in privacy policy..."

## Integration Flow
Audio File / Text Input
        ↓
transcription.service
        ↓
Transcript (string)
        ↓
LLM Processing (Gemini / Codex)