# EchoAI

EchoAI is an AI meeting accountability tracker. It helps teams avoid missing important follow-ups by turning meeting transcripts or meeting recordings into structured action items, risk signals, summaries, and a review dashboard.

## What It Does

The current app supports:

- Firebase sign-in
- transcript upload: `.txt`, `.docx`, `.pdf`
- recording upload: `.mp3`, `.wav`, `.m4a`
- audio transcription
- AI extraction of action items, owners, due dates, statuses, and evidence
- rule-based risk scoring
- dashboard and review workspace
- manual confirmation of low-confidence items
- CSV export
- browser push notification registration

Runtime flow:

```text
Frontend -> echo_backend -> aimodel
```

## Project Structure

- `echo-ai-frontend/`: React + Vite frontend
- `echo_backend/`: FastAPI backend
- `aimodel/`: transcription and AI analysis layer used by the backend

## Tech Stack

### Frontend

- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS
- Zustand
- Axios
- React Router
- Recharts
- Firebase Web SDK
- Vitest
- Testing Library
- Playwright

### Backend

- FastAPI
- SQLAlchemy
- Alembic
- SQLite or PostgreSQL
- Firebase Admin SDK
- Google Gemini
- `faster-whisper`
- `python-docx`
- `pdfplumber`

## Frontend Architecture

The frontend is organized around a mock-first API layer and a shared Zustand state model.

Important frontend directories:

```text
echo-ai-frontend/src/
  api/          adapter, mock/real clients, normalization, retry, errors
  components/   reusable UI components
  config/       environment helpers
  data/         mock data
  hooks/        custom hooks
  pages/        route-level pages
  services/     auth and notification helpers
  stores/       Zustand stores
  types/        shared TypeScript types
  utils/        helper utilities

echo-ai-frontend/tests/
  api/          unit tests for API helpers
  services/     notification-related tests
  utils/        utility tests
  e2e/          Playwright tests
```

## Frontend Implementation Notes

### API layer

All frontend API calls go through `echo-ai-frontend/src/api/adapter.ts`.

That layer:

- switches between mock and real API modes
- keeps backend payloads at the API boundary
- normalizes snake_case backend fields into frontend camelCase models
- centralizes retry and error handling

### State management

Zustand is the single source of truth for core meeting state.

Main frontend state includes:

- `meetings`
- `currentMeetingId`
- `selectedItemId`
- notification banner state

### Frontend flow

The main UI flow is:

1. user signs in
2. user uploads transcript or audio
3. upload is sent through the API adapter
4. response is normalized into frontend meeting data
5. meeting data is stored in Zustand
6. user is redirected to the dashboard
7. low-confidence items can be reviewed and confirmed in the review workspace

### Frontend environment note

The Firebase messaging service worker cannot read Vite env vars directly at runtime. The app passes Firebase config through service-worker registration so the main app and browser push worker stay aligned in local use.

## Prerequisites

Install these first:

- Python `3.11+`
- Node.js `18+`
- `npm`
- `ffmpeg` only if you want to test audio or video transcription locally

Quick checks:

```bash
python --version
node --version
npm --version
ffmpeg -version
```

Notes:

- transcript-only testing does not need `ffmpeg`
- audio/video upload testing may fail without `ffmpeg`

## Setup Modes

Choose one mode depending on what you want to test.

### 1. Frontend-only mock mode

Use this if you only want to review the UI quickly.

- no backend required
- no Firebase required
- no Gemini required
- no database required

### 2. Full local real mode

Use this if you want to test the actual working app locally.

- frontend runs locally
- backend runs locally
- database runs locally
- Firebase config is required for real auth
- Gemini is required for real AI extraction unless stub AI is enabled

## Local Setup

### Step 1: Backend setup

From the repo root:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
cp echo_backend/.env.example echo_backend/.env
```

### Step 2: Configure `echo_backend/.env`

Open [echo_backend/.env](/Users/user/Documents/Hackathon/EchoAI/echo_backend/.env) and fill it in.

### Backend option A: easiest local setup

Use this for local development with SQLite and stub AI:

```env
DATABASE_URL=sqlite+aiosqlite:///./echoai-local.db
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
GEMINI_API_KEY=
ALLOW_STUB_AI=true
GEMINI_CHUNK_CONCURRENCY=2
DB_POOL_RECYCLE_SECONDS=1800
AUTO_CREATE_UPLOAD_JOBS_TABLE=true
FIREBASE_CREDENTIALS_BASE64=
```

Use this when:

- you want local backend setup with minimum dependencies
- you want transcript flow and dashboard flow working
- you do not need real Gemini output
- you do not need real Firebase-backed auth and push from the backend

### Backend option B: full real local setup

Use this for a real backend flow:

```env
DATABASE_URL=sqlite+aiosqlite:///./echoai-local.db
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
GEMINI_API_KEY=your_real_gemini_api_key
ALLOW_STUB_AI=false
GEMINI_CHUNK_CONCURRENCY=2
DB_POOL_RECYCLE_SECONDS=1800
AUTO_CREATE_UPLOAD_JOBS_TABLE=false
FIREBASE_CREDENTIALS_BASE64=your_base64_encoded_firebase_service_account_json
```

Use this when:

- you want real AI extraction
- you want backend Firebase token verification
- you want browser push notifications to work end to end

Backend variable meaning:

- `DATABASE_URL`
  - database connection used by the backend
  - easiest local value: `sqlite+aiosqlite:///./echoai-local.db`
- `ALLOWED_ORIGINS`
  - frontend origins allowed to call the backend
  - recommended local value: `http://localhost:5173,http://127.0.0.1:5173`
- `GEMINI_API_KEY`
  - required only for real AI extraction
- `ALLOW_STUB_AI`
  - set `true` for local fallback AI
  - set `false` for real Gemini analysis
- `GEMINI_CHUNK_CONCURRENCY`
  - bounded parallelism for transcript chunk extraction
  - recommended default: `2`
- `DB_POOL_RECYCLE_SECONDS`
  - recycles long-lived backend DB connections to reduce stale connection issues
  - recommended default: `1800`
- `AUTO_CREATE_UPLOAD_JOBS_TABLE`
  - local-only fallback for the async upload jobs table
  - recommended local value: `true` only when your database is behind and you need the backend to start
  - keep `false` in normal environments and prefer Alembic migrations
- `FIREBASE_CREDENTIALS_BASE64`
  - base64-encoded Firebase service account JSON
  - required only if you want real Firebase-authenticated backend flows

### Step 3: Run backend migrations

From the repo root:

```bash
alembic -c echo_backend/alembic.ini upgrade head
```

If your local backend is failing to start only because `upload_jobs` is missing, you can temporarily set:

```env
AUTO_CREATE_UPLOAD_JOBS_TABLE=true
```

This is a local development fallback only. Alembic remains the source of truth, and the recommended recovery command is still:

```bash
alembic -c echo_backend/alembic.ini upgrade head
```

### Step 4: Start the backend

From the repo root:

```bash
uvicorn echo_backend.main:app --reload
```

Backend health check:

```text
http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok"}
```

## Frontend Setup

### Step 5: Install frontend dependencies

Open a second terminal:

```bash
cd echo-ai-frontend
npm install
```

### Step 6: Configure `echo-ai-frontend/.env`

Open [echo-ai-frontend/.env](/Users/user/Documents/Hackathon/EchoAI/echo-ai-frontend/.env).

### Frontend option A: mock mode

Use this for frontend-only testing:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_USE_MOCK=true
```

### Frontend option B: real mode

Use this for the actual local app flow:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_USE_MOCK=false
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_VAPID_KEY=your_public_vapid_key
```

Frontend variable meaning:

- `VITE_API_URL`
  - backend base URL
- `VITE_USE_MOCK`
  - `true` uses mock data and mock API behavior
  - `false` uses the real backend
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
  - required for real Firebase sign-in
- `VITE_VAPID_KEY`
  - required for browser push notifications
- `VITE_E2E`
  - optional
  - used only for Playwright/E2E test mode

### Step 7: Start the frontend

```bash
npm run dev
```

Frontend URL:

```text
http://127.0.0.1:5173
```

Useful frontend commands:

```bash
npm run dev
npm run build
npm run preview
```

## Recommended Local Test Paths

### Path A: quickest local UI review

Use:

- frontend with `VITE_USE_MOCK=true`

You do not need:

- backend
- database
- Firebase
- Gemini
- `ffmpeg`

### Path B: transcript-only real flow

Use:

- local backend running
- frontend with `VITE_USE_MOCK=false`
- Firebase frontend config
- backend database configured
- either:
  - `ALLOW_STUB_AI=true`, or
  - real `GEMINI_API_KEY`

You do not need:

- `ffmpeg`, if you are only uploading transcript files

### Path C: full real flow including audio transcription

Use:

- local backend running
- local frontend running
- Firebase frontend config
- backend Firebase credentials
- database configured
- real `GEMINI_API_KEY` or `ALLOW_STUB_AI=true`
- `ffmpeg` installed

## Validation Commands

Backend tests:

```bash
python -m pytest echo_backend/tests aimodel/tests
```

Frontend checks:

```bash
cd echo-ai-frontend
npm run lint
npm run test:run
npm run build
```

If Playwright browsers are not installed yet:

```bash
cd echo-ai-frontend
npx playwright install chromium
npm run e2e
```

Frontend test coverage includes:

- upload flow
- dashboard rendering
- smart confirmation workflow
- retry behavior
- error handling
- notification-driven selection flow

## Important Notes

- most backend routes require a valid Firebase ID token in real mode
- if `VITE_USE_MOCK=false`, the frontend should have valid Firebase web config
- if `ALLOW_STUB_AI=false`, the backend must have `GEMINI_API_KEY`
- transcript uploads are limited to `30 KB`
- audio uploads are limited to `3 MB`
- `meeting_id` must be unique per processed meeting

## Known Limitations

- dashboard state is primarily store-driven and may not always refetch on every page entry
- Firebase notification behavior depends on external browser and service-worker setup
- audio transcription quality depends on the local transcription runtime and uploaded audio quality

## Enterprise Direction

The current product is strongest as an AI meeting accountability tracker for catching tasks that are easy to miss in manual workflows. The future opportunity is to expand it with deeper integrations, reminders, auditability, and organization-level tracking.
