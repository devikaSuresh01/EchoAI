# EchoAI UI/UX Implementation Guide

This guide is for building the frontend experience that talks to `echo_backend`.
The frontend should not call `aimodel` directly.

## What The UI Should Support

The app currently supports these user flows:

- upload a transcript file and receive meeting analysis
- upload audio/video and receive transcription plus meeting analysis
- browse processed meetings
- open one meeting and inspect its items
- update an item status
- register a device token for optional push notifications

## Public API Endpoints

These are the endpoints the UI should use.

| Method | Endpoint | Input format | Output format | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | none | `{"status":"ok"}` | Use for a lightweight readiness check. |
| `POST` | `/process-file` | `multipart/form-data` | `ProcessFileResponse` | Transcript-like file upload. |
| `POST` | `/process-meeting` | `multipart/form-data` | `ProcessFileResponse` | Alias of `/process-file`. |
| `POST` | `/process-audio` | `multipart/form-data` | `ProcessAudioResponse` | Audio/video upload with transcription. |
| `POST` | `/transcribe-audio` | `multipart/form-data` | `TranscribeResponse` | Transcription only, no storage. |
| `GET` | `/get-meetings` | queryless GET | `list[MeetingListItem]` | Lists processed meetings. |
| `GET` | `/get-items?meeting_id=...` | query param | `list[ItemResponse]` | Returns items for one meeting. |
| `POST` | `/update-status` | JSON body | `{"ok": true}` | Updates an item status. |
| `POST` | `/register-device` | JSON body | `{"ok": true}` | Registers push notification token. |

## Internal Endpoints

These endpoints exist in the repo but should not be called by the frontend directly.
They are implementation details behind `echo_backend`.

| Method | Endpoint | Input format | Output format | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/process-meeting` | JSON body with `meeting_id` and `transcript` | analysis JSON | Internal AI service endpoint. |
| `POST` | `/process-text` | JSON body with `meeting_id` and `transcript` | analysis JSON | Text-only internal endpoint. |
| `POST` | `/process-file` | `multipart/form-data` | analysis JSON | Internal file upload path. |
| `POST` | `/process-audio` | `multipart/form-data` | analysis JSON plus `transcript` | Internal audio path. |
| `GET` | `/health` | none | service health JSON | Internal readiness endpoint. |

## Request and Response Shapes

### `POST /process-file`

Use `multipart/form-data` with:

- `file` required
- `meeting_id` required
- `title` optional
- `meeting_date` optional, ISO date like `2026-04-17`
- `participants` optional, comma-separated string like `Alice,Bob`

Accepted file types:

- `.txt`
- `.docx`
- `.pdf`

Response shape:

- `meeting_id`
- `summary`
- `high_risk_count`
- `items[]`

Each item includes:

- `id`
- `task`
- `owner`
- `status`
- `due_date`
- `risk_keywords`
- `evidence`
- `score`
- `risk`
- `reason`
- `confidence`
- `needs_confirmation`
- `created_at`

### `POST /process-audio`

Use `multipart/form-data` with:

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

Response shape:

- everything returned by `ProcessFileResponse`
- plus `transcript`

### `POST /transcribe-audio`

Use `multipart/form-data` with:

- `audio_file` required
- `meeting_id` required

Response shape:

- `meeting_id`
- `transcript`
- `duration_seconds`
- `language`

### `GET /get-meetings`

No request body.

Response shape for each meeting:

- `meeting_id`
- `summary`
- `high_risk_count`
- `title`
- `meeting_date`
- `participants`
- `created_at`

### `GET /get-items`

Query param:

- `meeting_id` required

Response shape for each item matches `ItemResponse`.

### `POST /update-status`

JSON body:

- `item_id`
- `status`

Allowed statuses:

- `done`
- `in_progress`
- `not_started`

Response:

- `{"ok": true}`

### `POST /register-device`

JSON body:

- `token`

Response:

- `{"ok": true}`

## Error Handling To Design For

The UI should expect these common error classes:

- `400` for invalid input or unsupported file type
- `409` for duplicate `meeting_id`
- `413` for oversized audio uploads
- `422` for transcription failures or empty transcript output
- `502` for missing Gemini configuration in real AI mode
- `500` for unexpected backend failures

Common message examples:

- `meeting_id cannot be empty`
- `meeting_id already exists`
- `unsupported file type`
- `unsupported audio format`
- `Upload audio file of size less than 40MB`
- `could not transcribe audio`

## Suggested UI Patterns

- Use a two-path upload screen: one card for transcript files and one for audio/video.
- Show a drag-and-drop zone with accepted file types and the 40 MB audio limit.
- Add a live validation row before upload so users know if the file is too large or unsupported.
- Use a progress state or loading skeleton because audio transcription can take a while.
- Render the processed meeting in a split layout:
  - left side for summary and action items
  - right side for transcript, meeting metadata, and risk details
- Highlight `high` risk items with strong visual emphasis and a dismissible confirmation state.
- Make status updates feel immediate with inline chips or a compact status selector.
- Show empty states for:
  - no meetings yet
  - no items for a meeting
  - upload failed
- Add a toast or inline banner for successful upload, status updates, and push-token registration.
- Keep the meeting list sortable by newest first, since the API already returns that order.

## Recommended UI Pieces

- Upload card with file picker and drag-and-drop support
- Metadata form for `meeting_id`, `title`, `meeting_date`, and `participants`
- Meeting list panel
- Item detail drawer or side sheet
- Risk badges and confidence indicators
- Transcript viewer with search or highlight support
- Status update control for each item
- Notification permission prompt and token registration flow

## Getting Started

1. Start the backend first.
2. Create `echo_backend/.env` from `echo_backend/.env.example`.
3. Set `DATABASE_URL`, `ALLOWED_ORIGINS`, and `GEMINI_API_KEY`.
4. Install dependencies with `pip install -r requirements.txt`.
5. Run database migrations with `alembic -c echo_backend/alembic.ini upgrade head`.
6. Start the API with `uvicorn echo_backend.main:app --reload`.
7. Point the frontend at `http://127.0.0.1:8000`.
8. Build the UI around the endpoint contracts above, and keep all network calls going through `echo_backend`.

## Practical UX Suggestions

- Keep the primary CTA as “Upload audio” or “Upload transcript,” not a generic “Submit.”
- Show the exact filename and size before upload.
- If the file is near the 40 MB ceiling, warn early so the user can compress it first.
- Preserve the original transcript text separately from the AI-generated summary.
- Let users confirm or correct owners and statuses after analysis.
- Use concise, human-friendly labels for meeting items rather than exposing raw JSON fields.
