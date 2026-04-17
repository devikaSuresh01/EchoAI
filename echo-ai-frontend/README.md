# Echo AI Frontend

Echo AI is a React application for uploading meeting files, extracting action items, surfacing risk, and reviewing low-confidence AI decisions through a structured dashboard.

## 🚀 Features

- Upload audio or transcript files for meeting analysis
- Support for meeting metadata:
  - title
  - date
  - participants
- Upload status flow with processing feedback:
  - idle
  - transcribing
  - analyzing
  - success
  - error
- Dashboard with:
  - meeting summary cards
  - risk distribution chart
  - high-risk item list
  - filterable and paginated items table
- Smart Confirmation Panel for low-confidence status detections
- CSV export for action items
- Notification banner flow with item deep-linking
- Mock-first API architecture with real API toggle
- Local persistence of meetings in Zustand-backed storage
- Unit and E2E test coverage

## 🏗️ Tech Stack

- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS
- Zustand
- Axios
- React Router
- Recharts
- Playwright
- Vitest
- Testing Library

## 📁 Project Structure

```text
src/
  api/          API adapter, mock/real clients, normalization, retry, errors
  components/   Reusable UI and feature components
  config/       Environment helpers
  data/         Mock data sources
  hooks/        Custom React hooks
  pages/        Route-level pages
  services/     Notification-related integration helpers
  stores/       Zustand state
  types/        Shared TypeScript types
  utils/        Pure helpers and browser utilities

tests/
  api/          Unit tests for API helpers
  utils/        Unit tests for utilities
  e2e/          Playwright end-to-end tests
```

## ⚙️ Setup & Installation

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## 🔄 Environment Variables

Create a `.env` file in the project root.

### Core variables

```env
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
```

### Variables used by the app

- `VITE_API_URL`
  - Base URL for the real API client
- `VITE_USE_MOCK`
  - `true`: use `src/api/mock.ts`
  - `false`: use `src/api/real.ts`

### Test-only variable

- `VITE_E2E`
  - Used by the E2E test mode to expose a test-only notification hook

### Optional notification variables

These are read by the frontend notification service when Firebase messaging is configured:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_VAPID_KEY`

The background push service worker at `public/firebase-messaging-sw.js` cannot use Vite env vars at runtime.
It must hardcode the same Firebase web app config values used by the main frontend bundle.

## 🔌 API Layer

All API access goes through `src/api/adapter.ts`.

### Structure

- `adapter.ts`
  - switches between mock and real implementations
- `mock.ts`
  - mock-first behavior, including simulated delay and failure cases
- `real.ts`
  - Axios-based real API client
- `normalize.ts`
  - the only snake_case to camelCase transformation layer
- `retry.ts`
  - retry wrapper for retryable failures
- `errors.ts`
  - maps raw failures into app-safe error objects

### API behavior

- UI code does not call Axios directly
- Backend payloads remain snake_case at the API boundary
- Frontend state uses camelCase models after normalization

## 🧠 State Management

Zustand is the single source of truth for core meeting state.

### App store

- `meetings`
  - all meetings loaded for the current signed-in user session
- `currentMeetingId`
  - active meeting in the dashboard
- `selectedItemId`
  - currently selected action item

### Notification store

- manages the active in-app notification banner state

### Notes

- meeting selection is derived from store state
- meeting history is loaded from the authenticated backend, not browser persistence
- selected item IDs are validated against the current meeting

## 📊 Application Flow

### Upload → Processing → Dashboard

1. User selects upload mode and file
2. Metadata is collected on `InputPage`
3. `useUpload` sends the file through `api/adapter.ts`
4. Response is normalized into `MeetingData`
5. Meeting is stored in Zustand
6. User is redirected to `DashboardPage`

### Smart confirmation

1. Low-confidence items appear in the Smart Confirmation Panel
2. User confirms a status:
   - done
   - in progress
   - not started
3. Request is sent through the adapter with retry handling
4. On success, the item is removed after the UI transition completes
5. On failure, the item remains and controls recover

### Notifications

- The app supports an in-app notification banner
- Notification actions can navigate to the dashboard and select a specific item
- Firebase setup is optional and environment-dependent

## 🎨 UI & Design System

- Tailwind CSS powers the UI layer
- The app uses a token-based light theme
- Shared tokens cover:
  - backgrounds
  - text
  - borders
  - accent colors
- Components use consistent spacing, borders, focus styles, and button treatments

## 🧪 Testing

### Unit tests

Run unit tests with:

```bash
npm run test:run
```

Current coverage includes:

- API error parsing
- retry behavior
- normalization
- file validation
- ID utilities

### E2E tests

Run Playwright tests with:

```bash
npm run e2e
```

Current E2E coverage includes:

- upload flow
- dashboard rendering flow
- smart confirmation behavior
- retry handling for 429 responses
- error handling for 500 responses
- notification-driven item selection

### Lint

```bash
npm run lint
```

## ⚡ Performance

- `DashboardPage` is lazy loaded
- `RiskChart` is lazy loaded to isolate the heavier chart bundle
- Vite handles bundle splitting for route/component chunks
- Filtering uses debounced owner search input

## ⚠️ Known Limitations

- Dashboard rendering is store-driven and local-persistence-driven; it does not currently refetch dashboard data on page entry
- Firebase notification functionality depends on external environment and service worker configuration
- The chart component uses inline semantic colors for data visualization rather than Tailwind tokens

## 📦 Build & Deployment

### Production build

```bash
npm run build
```

The build output is generated in `dist/`.

### Deployment

Deploy the contents of `dist/` using any static hosting platform that supports SPA routing. Ensure the environment variables are configured for the target environment.

## 🧑‍💻 Contributing

- Keep API access inside `src/api`
- Keep snake_case to camelCase transforms inside `src/api/normalize.ts`
- Use Zustand as the single source of truth for meeting state
- Avoid `any`
- Add tests for behavioral changes when possible

## 📄 License

No license file is currently defined in this repository.
