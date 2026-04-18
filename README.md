# Echo AI

Echo AI is a meeting intelligence application with a React frontend, a FastAPI backend, and an internal AI/transcription layer. It supports authenticated upload and review workflows for transcript and audio/video meeting files, then turns them into summaries, action items, risk scores, and follow-up review queues.

## Project Structure

```text
echo-ai/
  aimodel/             Internal transcription and AI analysis modules
  constants/           Shared constants
  echo-ai-frontend/    React + Vite frontend
  echo_backend/        FastAPI API, persistence, migrations, tests
  requirements.txt     Python dependencies
  README.md
  SETUP.md
```

Runtime flow:

```text
Frontend -> echo_backend -> aimodel
```

The frontend talks only to `echo_backend`. `aimodel` is an internal backend-facing module.

## Current Features

- Email/password authentication with Firebase-backed auth in real mode and mock auth in E2E/mock mode
- Transcript upload for `.txt`, `.docx`, and `.pdf`
- Audio/video upload for `.mp3`, `.wav`, `.m4a`, `.webm`, and `.mp4`
- Meeting metadata capture for title, meeting date, and participants
- Dashboard with summary cards, risk chart, high-risk list, searchable meeting history, and item table
- Review workspace with pagination, item deep-linking, CSV export, and manual confirmation for low-confidence status calls
- Notification registration and unregister flows
- Mock-first frontend adapter with a real API mode
- Backend persistence, meeting hydration, and per-user data isolation
- Automated frontend unit tests, frontend E2E tests, backend API tests, and AI module tests

## Key Directories

- `echo-ai-frontend/`: React app, pages, components, client services, tests
- `echo_backend/`: FastAPI app, routers, models, migrations, backend tests
- `aimodel/`: internal transcription and AI analysis logic

## Verified Commands

The current project was validated with these commands from this repository root:

### Backend and AI tests

```powershell
python -m pytest echo_backend/tests aimodel/tests
```

### Frontend checks

```powershell
cd echo-ai-frontend
npm run lint
npm run test:run
npm run build
npm run e2e
```

If Playwright browsers are not installed yet, run:

```powershell
npx playwright install chromium
```

## Quick Start

Detailed setup lives in [SETUP.md](./SETUP.md). The short version is:

1. Create a Python virtual environment at the repo root.
2. Install backend dependencies with `pip install -r requirements.txt`.
3. Copy `echo_backend/.env.example` to `echo_backend/.env` and set your environment values.
4. Run migrations with `alembic -c echo_backend/alembic.ini upgrade head`.
5. Start the backend with `uvicorn echo_backend.main:app --reload`.
6. Install frontend dependencies in `echo-ai-frontend` with `npm install`.
7. Create `echo-ai-frontend/.env` and set `VITE_API_URL` and `VITE_USE_MOCK`.
8. Start the frontend with `npm run dev`.

## API Surface Used By The Frontend

The real frontend integration currently uses:

- `GET /health`
- `POST /process-file`
- `POST /process-audio`
- `POST /transcribe-audio`
- `GET /get-meetings`
- `GET /get-dashboard`
- `GET /get-items?meeting_id=...`
- `POST /update-status`
- `POST /register-device`
- `POST /unregister-device`

All frontend API access goes through:

- `echo-ai-frontend/src/api/adapter.ts`
- `echo-ai-frontend/src/api/real.ts`
- `echo-ai-frontend/src/api/mock.ts`
- `echo-ai-frontend/src/api/normalize.ts`

## Important Notes

- Most backend routes require authentication. In frontend real mode, the Axios client sends the current Firebase ID token when one exists.
- Local backend stub analysis is available with `ALLOW_STUB_AI=true`.
- Push notifications are optional and depend on Firebase web config in the frontend plus Firebase Admin credentials in the backend.

## Documentation

- Main project overview: [README.md](./README.md)
- Full setup and run guide: [SETUP.md](./SETUP.md)
