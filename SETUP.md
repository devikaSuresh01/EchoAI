# Echo AI Setup

This is the single setup guide for the entire project.

## Project Layout

- Frontend: `echo-ai-frontend/`
- Backend: `echo_backend/`
- AI/transcription internals: `aimodel/`

## 1. Backend Setup

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create the backend environment file:

```powershell
Copy-Item echo_backend\.env.example echo_backend\.env
```

Minimum local settings:

```env
DATABASE_URL=sqlite+aiosqlite:///./echoai-local.db
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ALLOW_STUB_AI=true
GEMINI_API_KEY=
FIREBASE_CREDENTIALS_BASE64=
```

Notes:

- Use PostgreSQL in shared or production environments. SQLite is fine for quick local validation.
- `ALLOW_STUB_AI=true` is the simplest local option when you do not want to call Gemini.
- If you want real AI analysis, set a valid `GEMINI_API_KEY` and change `ALLOW_STUB_AI=false`.

Run migrations:

```powershell
alembic -c echo_backend/alembic.ini upgrade head
```

Start the backend:

```powershell
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

## 2. Frontend Setup

In a second terminal:

```powershell
cd echo-ai-frontend
npm install
```

Create `echo-ai-frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_USE_MOCK=false
```

Optional Firebase web config:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_VAPID_KEY=
```

Start the frontend:

```powershell
npm run dev
```

Default local URL:

```text
http://127.0.0.1:5173
```

## 3. Authentication Modes

- Real auth plus real API:
  Set `VITE_USE_MOCK=false` and provide Firebase web config in the frontend.
- Mock API and mock auth:
  Set `VITE_USE_MOCK=true` for frontend-only development.
- E2E mode:
  Playwright uses the app's built-in test auth behavior automatically.

## 4. Main Workflows

### Transcript workflow

1. Open the upload page.
2. Switch to transcript upload if needed.
3. Upload a `.txt`, `.docx`, or `.pdf` file.
4. The frontend posts to `POST /process-file`.
5. The backend extracts text, analyzes it, stores the meeting, and returns structured data.
6. The app redirects to the dashboard.

### Audio/video workflow

1. Upload a supported recording.
2. The frontend posts to `POST /process-audio`.
3. The backend transcribes the file, analyzes it, stores the meeting, and returns structured data.
4. The app redirects to the dashboard.

### Review workflow

1. The dashboard hydrates from `GET /get-dashboard`.
2. The review workspace supports item deep-links via query string.
3. Manual status confirmation posts to `POST /update-status`.
4. Notification registration uses `POST /register-device`.
5. Notification cleanup uses `POST /unregister-device`.

## 5. Validation

### Frontend

```powershell
cd echo-ai-frontend
npm run lint
npm run test:run
npm run build
npx playwright install chromium
npm run e2e
```

### Backend

```powershell
python -m pytest echo_backend/tests aimodel/tests
```

## 6. Common Issues

### `DATABASE_URL is not set`

Create `echo_backend/.env` and make sure it contains `DATABASE_URL=...`.

### Firebase auth is not configured

Create `echo-ai-frontend/.env` and add the required `VITE_FIREBASE_*` values.

### CORS failures

Make sure `ALLOWED_ORIGINS` in `echo_backend/.env` includes:

```env
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### `GEMINI_API_KEY is not configured`

For local development without Gemini access:

```env
ALLOW_STUB_AI=true
```

### Playwright fails before opening a browser

Install the browser once:

```powershell
cd echo-ai-frontend
npx playwright install chromium
```
