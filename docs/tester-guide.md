# EchoAI Tester Guide

This guide is for manual and smoke testing of the full EchoAI project.

EchoAI has three runtime parts:

- `echo-ai-frontend`: React web app
- `echo_backend`: public FastAPI backend
- `aimodel`: internal AI/transcription module used by the backend

For end-to-end testing, the normal request path is:

`Frontend -> echo_backend -> aimodel`

## 1. What Testers Should Verify

A complete test pass should confirm:

- users can sign in and reach the upload page
- transcript uploads work end to end
- audio uploads work end to end
- extracted meeting data appears correctly in the dashboard
- low-confidence items can be manually confirmed
- review workspace filtering, search, pagination, and CSV export work
- previous analyses can be reopened
- notifications and deep-link navigation work when notification setup is enabled
- invalid files, oversized files, auth failures, and backend failures are handled cleanly

## 2. Recommended Test Modes

### Full-stack validation

Use this mode when you want to test the real project behavior.

- frontend uses `VITE_USE_MOCK=false`
- backend is running
- database is configured
- Firebase Auth is configured
- Gemini is configured, or backend stub AI is explicitly enabled

This is the recommended mode for testers checking the whole project.

### UI-only or fallback validation

Use this only when real backend services are not available.

- set `VITE_USE_MOCK=true`
- frontend uses mock auth and mock API flows

This is helpful for layout checks and quick UI smoke tests, but it does not validate the full project integration.

## 3. Prerequisites

Install these before starting:

- Python 3.11+
- Node.js 18+
- npm
- PostgreSQL
- `ffmpeg` for audio transcription support

External services needed for a real end-to-end run:

- Firebase Auth
- Firebase service account credentials for backend token verification
- Gemini API key for real AI extraction

## 4. Backend Setup

From the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp echo_backend/.env.example echo_backend/.env
```

Update `echo_backend/.env` with valid values:

- `DATABASE_URL`: PostgreSQL connection string
- `ALLOWED_ORIGINS`: include the frontend URL, usually `http://localhost:5173`
- `GEMINI_API_KEY`: required for real AI analysis
- `ALLOW_STUB_AI=true`: optional local fallback if Gemini is not available
- `FIREBASE_CREDENTIALS_BASE64`: required for real Firebase token verification and push notification support

Run migrations:

```bash
alembic -c echo_backend/alembic.ini upgrade head
```

Start the backend:

```bash
uvicorn echo_backend.main:app --reload
```

Expected health check:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"ok"}
```

Notes:

- startup migrations also run automatically unless `RUN_STARTUP_MIGRATIONS=false`
- transcript uploads are limited to `10 MB`
- audio uploads are limited to `40 MB`

## 5. Frontend Setup

From `echo-ai-frontend`:

```bash
npm install
```

Check `echo-ai-frontend/.env` and confirm:

```env
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
```

Make sure the Firebase web config values match the Firebase project being used for sign-in.

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## 6. Test Data Suggestions

Prepare these sample files before testing:

- `sample.txt`: a short transcript with 3 to 5 action items
- `sample.docx`: a transcript version of the same meeting
- `sample.pdf`: transcript exported to PDF
- `sample.mp3` or `sample.wav`: short audio recording with clear speech
- one unsupported file such as `.csv` or `.png`
- one oversized file for limit testing

Use transcript/audio content that includes:

- clear owners like `Alice`, `Bob`
- due dates
- at least one risky or delayed follow-up
- at least one ambiguous status, so low-confidence review can be checked

## 7. Manual Test Checklist

### A. Sign-in and access control

Check:

- unauthenticated users are redirected to `/sign-in`
- sign-in succeeds and redirects to `/upload`
- create-account flow redirects to `/upload`
- sign-out returns the user to `/sign-in`

Expected results:

- upload, dashboard, and review routes should not stay accessible after sign-out
- layout should remain usable on desktop and mobile widths

### B. Upload page

Check:

- audio and transcript tabs both work
- file picker/dropzone accepts supported files only
- meeting title, date, and participants fields can be entered
- participant input accepts comma-separated names and numeric counts
- submit button stays disabled until a valid file is selected

Supported files:

- transcript: `.txt`, `.docx`, `.pdf`
- audio/video: `.mp3`, `.wav`, `.m4a`, `.webm`, `.mp4`

Validation to confirm:

- unsupported transcript upload shows an error
- unsupported audio upload shows an error
- transcript files over `10 MB` are rejected
- audio files over `40 MB` are rejected

### C. Transcript upload flow

Steps:

1. Sign in.
2. Open `/upload`.
3. Switch to transcript upload if needed.
4. Enter title, date, and participants.
5. Upload a valid `.txt`, `.docx`, or `.pdf` transcript.
6. Start analysis.

Check:

- loading/progress state is shown
- success toast appears
- app redirects to `/dashboard`
- dashboard header shows the entered title and meeting date
- participants appear in the dashboard header
- summary cards show item totals and risk counts
- high-risk items section is populated when applicable

### D. Audio upload flow

Steps:

1. Stay signed in.
2. Open `/upload`.
3. Keep audio mode selected.
4. Upload a supported audio/video file.
5. Start analysis.

Check:

- upload starts with a processing state
- transcription succeeds
- final dashboard loads without blank or broken sections
- the resulting meeting appears in recent analyses

Also verify:

- poor or empty audio returns a clean error instead of a broken page
- the app recovers and allows another upload after failure

### E. Dashboard behavior

Check:

- summary cards render correctly
- high-risk items list opens the selected item in review
- risk chart renders
- `Open Review Workspace` navigates to `/review`
- `New Analysis` returns to `/upload`
- when multiple meetings exist, recent analyses rail appears
- `View all analyses` opens the searchable picker
- selecting another meeting updates the dashboard content

### F. Smart Confirmation Panel

This panel appears only when items have `needs_confirmation=true`.

Check:

- low-confidence items are listed
- pagination works when more than 8 items need review
- `Mark Done`, `In Progress`, and `Not Started` actions work
- after a successful confirmation, the item disappears from the panel
- confirmed items no longer require review

Also check failure handling:

- if status update fails, the item remains visible
- controls are re-enabled after the error
- the user sees a clear error toast/message

### G. Review Workspace

Open `/review` from the dashboard.

Check:

- item table loads
- selecting a row opens the ticket detail panel
- evidence, reason, owner, due date, risk, score, and confidence are visible
- filters work:
  - owner search
  - risk filter
  - status filter
  - sort order
- pagination works and page count updates correctly
- selected rows stay in sync when changing pages
- direct navigation with `?item=<item-id>` highlights the correct item

### H. CSV export

From the review workspace:

- click `Export CSV`
- confirm a CSV file downloads
- open the file and verify the header contains:
  - `ID`
  - `Task`
  - `Owner`
  - `Status`
  - `Due Date`
  - `Risk`
  - `Score`
  - `Confidence`
  - `Needs Confirmation`
  - `Evidence`

### I. Previous analyses and meeting history

Create at least two processed meetings, then verify:

- older meetings show in the recent analyses rail
- searchable picker can find a meeting by title
- selecting a previous meeting updates both dashboard and review workspace context
- the active meeting is visually distinguishable from earlier analyses

### J. Notifications

Only applicable when Firebase messaging is configured.

Check:

- permission banner appears for signed-in users on supported browsers
- `Allow` enables notifications successfully
- `Later` dismisses the banner
- high-risk notification banner appears when triggered
- `View Item` deep-links to the correct item in `/review`
- the selected item is highlighted after navigation

### K. Error and resilience checks

Verify these conditions:

- backend down: frontend shows a clean API error
- expired/invalid auth: protected API calls fail safely and user cannot read another user's meetings
- duplicate meeting IDs are not accepted by the backend
- unsupported file type returns a clear validation error
- server-side 429 or transient failures recover through retry behavior when possible
- server-side 500 failures do not leave the UI permanently stuck

## 8. Backend Endpoints Worth Spot-Checking

If API verification is part of testing, these are the main endpoints:

- `GET /health`
- `POST /process-file`
- `POST /process-audio`
- `GET /get-dashboard`
- `GET /get-meetings`
- `GET /get-items?meeting_id=<id>`
- `POST /update-status`
- `POST /register-device`
- `POST /unregister-device`

Important expected behavior:

- meeting reads require auth
- meeting/item data is scoped to the signed-in user
- duplicate `meeting_id` returns `409`
- unsupported transcript type returns `400`
- unsupported audio type returns `400`

## 9. Suggested Smoke Test Order

Use this order for a quick but meaningful pass:

1. Start backend and verify `/health`.
2. Start frontend and sign in.
3. Upload one transcript and confirm dashboard data.
4. Open review workspace and confirm one low-confidence item.
5. Export CSV.
6. Upload one audio file and confirm a second meeting appears.
7. Reopen the first meeting from recent analyses.
8. If notifications are enabled, trigger and validate banner deep-linking.

## 10. Automated Tests

These are useful before or after manual testing.

Backend tests:

```bash
pytest echo_backend/tests aimodel/tests
```

Frontend unit tests:

```bash
cd echo-ai-frontend
npm run test:run
```

Frontend E2E tests:

```bash
cd echo-ai-frontend
npm run e2e
```

The existing E2E coverage already checks:

- sign-in page behavior
- upload flow
- dashboard rendering
- smart confirmation behavior
- retry handling for transient failures
- review selection and notification-driven navigation

## 11. Common Issues

If sign-in fails:

- verify Firebase web config in `echo-ai-frontend/.env`
- verify backend Firebase service credentials

If uploads fail immediately:

- check backend is running on `http://localhost:8000`
- confirm `VITE_API_URL` is correct
- confirm allowed CORS origin includes the frontend URL

If transcript analysis fails:

- verify `GEMINI_API_KEY` is set
- or set `ALLOW_STUB_AI=true` for local fallback testing

If audio transcription fails:

- verify `ffmpeg` is installed
- try a short, clear audio sample first

If database errors occur:

- verify `DATABASE_URL`
- rerun Alembic migrations

## 12. Pass/Fail Reporting Template

Use this structure when sharing results:

- Environment: local/staging/prod-like
- Build/commit tested:
- Setup used: real AI or stub AI
- Browser and OS:
- Areas passed:
- Areas failed:
- Reproduction steps for failures:
- Screenshots or logs attached:
