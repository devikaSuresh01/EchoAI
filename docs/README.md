# EchoAI

EchoAI is a meeting intelligence backend that accepts transcript files or audio uploads, extracts action items and risks, stores meetings and items, and returns frontend-ready JSON for review and follow-up workflows.

The live architecture in this repo is:

Frontend -> `echo_backend` -> `aimodel`

The frontend should talk only to `echo_backend`. The `aimodel` package is an internal backend-facing module that handles transcription and AI analysis.

For UI-specific integration guidance, see [ui-ux-implementation.md](./ui-ux-implementation.md).

## Overview

EchoAI currently supports these user-facing workflows:

- upload a transcript file and receive a structured meeting analysis
- upload an audio file and receive transcription plus structured meeting analysis
- fetch processed meetings
- fetch items for one meeting
- update item status
- register device tokens for optional push notifications

## Architecture

### `echo_backend`

`echo_backend` is the public API layer. It is responsible for:

- request validation
- CORS handling
- upload handling
- persistence to the database
- shaping API responses for the frontend
- optional push notification dispatch

Primary backend entrypoint:

- `echo_backend.main:app`

### `aimodel`

`aimodel` is the internal AI/transcription layer. It is responsible for:

- transcript normalization
- audio transcription with Whisper
- transcript chunking
- action item extraction with Gemini
- risk scoring
- summary generation

Primary internal modules:

- `aimodel.service`
- `aimodel.transcription.service`
- `aimodel.ai_processing.*`

### Internal Flow

1. Frontend sends upload request to `echo_backend`
2. Backend validates file/audio type and `meeting_id`
3. Backend converts input to transcript text
4. Backend calls `echo_backend.services.aimodel_gateway`
5. Gateway calls `aimodel` for:
   - transcription for audio
   - transcript analysis for transcript text
6. Backend stores the meeting and items in the database
7. Backend optionally sends notifications for high-risk items
8. Backend returns structured JSON to the frontend

## Runtime Configuration

Create `echo_backend/.env` from `echo_backend/.env.example`.

Required/important environment variables:

- `DATABASE_URL`
  - PostgreSQL connection string used by the backend
- `ALLOWED_ORIGINS`
  - comma-separated list of frontend origins allowed by CORS
- `GEMINI_API_KEY`
  - required for real AI analysis
- `ALLOW_STUB_AI`
  - set `true` only for explicit local/test stub mode
- `FIREBASE_CREDENTIALS_BASE64`
  - optional, used only for push notifications

Behavioral notes:

- `meeting_id` must be unique
- real AI analysis requires `GEMINI_API_KEY`
- stub mode works only when `ALLOW_STUB_AI=true`
- frontend should not call `aimodel` directly
- audio transcription depends on Whisper and ffmpeg-compatible runtime support
- push notifications only work if Firebase credentials are configured and device tokens exist

## Setup

1. Create and activate a virtual environment
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create backend env file:

```bash
cp echo_backend/.env.example echo_backend/.env
```

4. Set your environment values in `echo_backend/.env`
5. Run database migrations:

```bash
alembic -c echo_backend/alembic.ini upgrade head
```

6. Start the backend:

```bash
uvicorn echo_backend.main:app --reload
```

## User Flows

### 1. Transcript File Upload

Used when the user already has a transcript or notes file.

Flow:

1. Frontend sends `.txt`, `.docx`, or `.pdf` to `POST /process-file`
2. Backend extracts text
3. Backend sends transcript to `aimodel`
4. `aimodel` extracts items, scores risks, and creates summary
5. Backend stores meeting and items
6. Backend returns structured meeting JSON

### 2. Audio Upload

Used when the user uploads meeting audio/video directly.

Flow:

1. Frontend sends audio/video to `POST /process-audio`
2. Backend passes the file to `aimodel` transcription
3. Whisper produces transcript text
4. Backend sends transcript into `aimodel` analysis
5. Backend stores meeting and items
6. Backend returns transcript plus structured analysis

### 3. Meeting Review

Used after meetings have been processed.

Flow:

1. Frontend calls `GET /get-meetings`
2. User selects one meeting
3. Frontend calls `GET /get-items?meeting_id=...`
4. User reviews tasks, risk, and confidence

### 4. Status Update

Used when a user marks an item as completed or in progress.

Flow:

1. Frontend sends `POST /update-status`
2. Backend updates the item in the database
3. Backend clears `needs_confirmation`

### 5. Device Registration

Used when the frontend/mobile client wants push notifications.

Flow:

1. Frontend sends `POST /register-device`
2. Backend stores token if it is new
3. Later, high-risk items may trigger notifications

## API Reference

### `GET /health`

Purpose:

- simple readiness check for the backend

Request:

- no body

Success response:

```json
{
  "status": "ok"
}
```

### `POST /process-file`

Primary endpoint.

Purpose:

- upload transcript-like document and receive full structured analysis

Content type:

- `multipart/form-data`

Fields:

- `file` required
- `meeting_id` required
- `title` optional
- `meeting_date` optional, ISO date like `2026-04-17`
- `participants` optional, comma-separated string like `Alice,Bob`

Accepted file types:

- `.txt`
- `.docx`
- `.pdf`

Validation:

- `meeting_id` cannot be empty
- `meeting_id` must be unique
- file must be one of the accepted types
- upload size must be <= 10 MB
- real AI mode requires `GEMINI_API_KEY` unless `ALLOW_STUB_AI=true`

Example request:

```bash
curl -X POST http://127.0.0.1:8000/process-file \
  -H "accept: application/json" \
  -F "file=@/tmp/meeting.txt;type=text/plain" \
  -F "meeting_id=meeting_001" \
  -F "title=Sprint Review" \
  -F "meeting_date=2026-04-17" \
  -F "participants=Alice,Bob"
```

Example success response:

```json
{
  "meeting_id": "meeting_001",
  "summary": "Alice committed to reviewing privacy controls next sprint and the team discussed follow-up work.",
  "high_risk_count": 1,
  "items": [
    {
      "id": "b6c22760-ee0c-4d02-b8a3-211d071b3e39",
      "task": "Review privacy controls",
      "owner": "Alice",
      "status": "deferred",
      "due_date": "next sprint",
      "risk_keywords": ["privacy"],
      "evidence": "Alice will review privacy controls next sprint.",
      "score": 90,
      "risk": "high",
      "reason": "task is deferred; risk keywords: privacy; vague or missing deadline",
      "confidence": 0.9,
      "needs_confirmation": true,
      "created_at": "2026-04-17T10:00:00+00:00"
    }
  ]
}
```

Common error responses:

- unsupported file type

```json
{
  "detail": "unsupported file type"
}
```

- duplicate `meeting_id`

```json
{
  "detail": "meeting_id already exists"
}
```

- file too large

```json
{
  "detail": "file too large"
}
```

- missing real AI configuration

```json
{
  "detail": "GEMINI_API_KEY is not configured for backend AI analysis. Set GEMINI_API_KEY or explicitly enable ALLOW_STUB_AI=true for local stub mode."
}
```

### `POST /process-audio`

Primary endpoint.

Purpose:

- upload audio/video, transcribe it, analyze it, store it, and return final output

Content type:

- `multipart/form-data`

Fields:

- `audio_file` required
- `meeting_id` required
- `title` optional
- `meeting_date` optional
- `participants` optional

Accepted MIME types:

- `audio/mpeg`
- `audio/mp4`
- `audio/wav`
- `audio/x-m4a`
- `audio/webm`
- `video/webm`
- `video/mp4`

Validation:

- `meeting_id` cannot be empty
- `meeting_id` must be unique
- audio must be one of the accepted types
- upload size must be <= 40 MB

Example request:

```bash
curl -X POST http://127.0.0.1:8000/process-audio \
  -H "accept: application/json" \
  -F "audio_file=@/tmp/meeting.mp3;type=audio/mpeg" \
  -F "meeting_id=meeting_audio_001" \
  -F "title=Kickoff Call"
```

Example success response:

```json
{
  "meeting_id": "meeting_audio_001",
  "transcript": "Alice will review privacy controls next sprint.",
  "summary": "Alice committed to reviewing privacy controls next sprint.",
  "high_risk_count": 1,
  "items": [
    {
      "id": "ab0b5c4b-2f9e-4a2a-92b0-99edac4f7b2c",
      "task": "Review privacy controls",
      "owner": "Alice",
      "status": "deferred",
      "due_date": "next sprint",
      "risk_keywords": ["privacy"],
      "evidence": "Alice will review privacy controls next sprint.",
      "score": 90,
      "risk": "high",
      "reason": "task is deferred; risk keywords: privacy; vague or missing deadline",
      "confidence": 0.9,
      "needs_confirmation": true,
      "created_at": "2026-04-17T10:00:00+00:00"
    }
  ]
}
```

Common error responses:

- unsupported audio format

```json
{
  "detail": "unsupported audio format"
}
```

- audio file too large

```json
{
  "detail": "Upload audio file of size less than 40MB"
}
```

- transcription failure

```json
{
  "detail": "could not transcribe audio"
}
```

### `POST /transcribe-audio`

Secondary/debug endpoint.

Purpose:

- transcription only, without meeting persistence or analysis

Content type:

- `multipart/form-data`

Fields:

- `audio_file` required
- `meeting_id` required

Example request:

```bash
curl -X POST http://127.0.0.1:8000/transcribe-audio \
  -H "accept: application/json" \
  -F "audio_file=@/tmp/meeting.mp3;type=audio/mpeg" \
  -F "meeting_id=meeting_transcribe_001"
```

Example success response:

```json
{
  "meeting_id": "meeting_transcribe_001",
  "transcript": "Alice will review privacy controls next sprint.",
  "duration_seconds": 0,
  "language": "en"
}
```

### `GET /get-meetings`

Primary endpoint.

Purpose:

- fetch all processed meetings

Example request:

```bash
curl "http://127.0.0.1:8000/get-meetings"
```

Example success response:

```json
[
  {
    "meeting_id": "meeting_001",
    "summary": "Alice committed to reviewing privacy controls next sprint.",
    "high_risk_count": 1,
    "title": "Sprint Review",
    "meeting_date": "2026-04-17",
    "participants": ["Alice", "Bob"],
    "created_at": "2026-04-17T10:00:00+00:00"
  }
]
```

### `GET /get-items`

Primary endpoint.

Purpose:

- fetch all items for one meeting

Query params:

- `meeting_id` required

Example request:

```bash
curl "http://127.0.0.1:8000/get-items?meeting_id=meeting_001"
```

Example success response:

```json
[
  {
    "id": "b6c22760-ee0c-4d02-b8a3-211d071b3e39",
    "task": "Review privacy controls",
    "owner": "Alice",
    "status": "deferred",
    "due_date": "next sprint",
    "risk_keywords": ["privacy"],
    "evidence": "Alice will review privacy controls next sprint.",
    "score": 90,
    "risk": "high",
    "reason": "task is deferred; risk keywords: privacy; vague or missing deadline",
    "confidence": 0.9,
    "needs_confirmation": true,
    "created_at": "2026-04-17T10:00:00+00:00"
  }
]
```

Error response when meeting does not exist:

```json
{
  "detail": "meeting not found"
}
```

### `POST /update-status`

Primary endpoint.

Purpose:

- update an item’s workflow status and clear `needs_confirmation`

Content type:

- `application/json`

Body:

- `item_id`
- `status`

Valid statuses:

- `done`
- `in_progress`
- `not_started`

Example request:

```bash
curl -X POST http://127.0.0.1:8000/update-status \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": "b6c22760-ee0c-4d02-b8a3-211d071b3e39",
    "status": "done"
  }'
```

Example success response:

```json
{
  "ok": true
}
```

Invalid status example:

```json
{
  "detail": "invalid status value"
}
```

### `POST /register-device`

Primary endpoint.

Purpose:

- register a device token for future push notifications

Content type:

- `application/json`

Body:

- `token`

Example request:

```bash
curl -X POST http://127.0.0.1:8000/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "token": "device-token-123"
  }'
```

Example success response:

```json
{
  "ok": true
}
```

This endpoint is idempotent. Registering the same token again still returns:

```json
{
  "ok": true
}
```

## What Is Currently Verified

Based on the current codebase and tests, these behaviors are covered:

- backend health endpoint
- file upload validation and persistence
- audio upload validation and combined transcription/analysis flow
- transcription-only endpoint validation
- meeting retrieval
- item retrieval
- item status update
- device registration
- duplicate meeting rejection
- explicit stub mode behavior
- created_at field in returned item payloads

## Current Notes

- `echo_backend` is the only service that should be called by frontend code
- `aimodel` may be run standalone for debugging, but that is not the intended frontend integration
- if `ALLOW_STUB_AI=false`, real AI analysis depends on `GEMINI_API_KEY` and network access to Gemini
- if Firebase credentials are not configured, notification code safely becomes a no-op
