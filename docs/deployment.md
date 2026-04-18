# EchoAI Deployment

EchoAI can be deployed so end users only need the shared frontend URL. All infrastructure and credentials stay under the project owner's control.

## Production Topology

- Frontend: Render static site from `echo-ai-frontend`
- Backend: Render web service from `echo_backend`
- Database: managed PostgreSQL
- Auth and Push: one Firebase project owned by the deployment team
- AI analysis: Gemini key configured only on the backend

## Frontend Deployment

Deploy the frontend using the `echoai-frontend` static site defined in `render.yaml`.

- Build command: `cd echo-ai-frontend && npm install && npm run build`
- Publish path: `echo-ai-frontend/dist`
- SPA routing: rewrite `/*` to `/index.html`

Set these production env vars:

- `VITE_API_URL`
- `VITE_USE_MOCK=false`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_VAPID_KEY`

Notes:

- Firebase web config is public by design and belongs in frontend env vars
- The Firebase messaging service worker now reads the Firebase config from the frontend registration URL, so no manual source edits are needed between environments
- No custom deployment header is required for `firebase-messaging-sw.js` because the app registers it from the site root at `/firebase-messaging-sw.js`
- The frontend URL is the only URL users need

Frontend env vars on Render:

- `VITE_API_URL`
- `VITE_USE_MOCK=false`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_VAPID_KEY`

After Render creates the frontend URL, update the backend's `ALLOWED_ORIGINS` to that exact frontend origin.

## Backend Deployment

Deploy the `echoai-backend` web service defined in `render.yaml`.

Required env vars:

- `DATABASE_URL`
- `ALLOWED_ORIGINS`
- `GEMINI_API_KEY`
- `ALLOW_STUB_AI=false`
- `FIREBASE_CREDENTIALS_BASE64`
- `RUN_STARTUP_MIGRATIONS=true`

Notes:

- `ALLOWED_ORIGINS` should contain the exact frontend production origin
- `FIREBASE_CREDENTIALS_BASE64` is required for production Firebase token verification and push delivery
- Startup migrations are enabled by default and are suitable for initial deployment

## Blueprint Workflow

Use `render.yaml` as the single source of truth for deployment.

1. Push the repo to GitHub.
2. In Render, create services from the repository blueprint.
3. Fill in the frontend and backend env vars in Render.
4. Deploy the stack.
5. Copy the frontend Render URL into backend `ALLOWED_ORIGINS`.

## Firebase Setup Owned By Us

Use a single Firebase project for the deployed app.

- Enable Email/Password sign-in in Firebase Authentication
- Allow public self-signup
- Create the web app config used by the frontend env vars
- Generate a service account and store it as `FIREBASE_CREDENTIALS_BASE64` on the backend
- Configure Cloud Messaging and use its web push key as `VITE_VAPID_KEY`

End users do not need:

- Firebase console access
- local `.env` files
- backend credentials
- manual notification token setup

## Verification Checklist

- Frontend build passes with `npm run build`
- Backend `/health` returns `200`
- A new user can create an account from the public frontend URL
- A signed-in user can upload files, view dashboard data, and update statuses
- Browser push permission can be granted and high-risk alerts are delivered
