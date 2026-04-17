# Web Push Registration and Auth Implementation Plan

## Summary
EchoAI currently has browser push delivery on the backend, but it does not have an auth layer yet. To support web-only push notifications safely, we need to add Firebase Auth in the browser, verify Firebase ID tokens on the backend, and bind push tokens to the signed-in user.

The end goal is:
- authenticate the web user
- register a browser push token for that user
- send alerts only to the authenticated user’s devices
- keep the existing high-risk analysis trigger flow unchanged

## Current State
- `POST /register-device` exists and stores tokens on the backend.
- Push delivery already uses Firebase Cloud Messaging.
- There is no frontend auth implementation in the repo.
- There is no backend auth verification layer in the repo.
- There is no user-bound device token model yet.

## Implementation Steps

### 1. Add web authentication
- Use Firebase Auth in the browser.
- Require sign-in before enabling push registration.
- Obtain a Firebase ID token from the signed-in user.
- Send the ID token with backend requests that need authentication.
- Keep the app web-only; do not add native mobile auth flows.

### 2. Verify auth on the backend
- Add Firebase ID token verification in the backend request path.
- Expose the verified user identity to handlers as a stable `firebase_uid`.
- Reject protected requests when the token is missing, invalid, or expired.
- Keep the auth layer small and reusable so it can later be expanded if the project gains more user-scoped endpoints.

### 3. Update device registration
- Extend `POST /register-device` so each token is tied to the authenticated user.
- Persist at minimum:
  - browser push token
  - `firebase_uid`
  - creation/update timestamps
- Make registration idempotent for the same user/token pair.
- Optionally add `POST /unregister-device` for sign-out cleanup or token revocation.

### 4. Scope notification delivery to the owner
- Store meeting ownership when a meeting is processed.
- When processing finds one or more `high`-risk items, send notifications only to tokens registered to that meeting’s owner.
- Keep the current trigger condition:
  - notifications are sent only when `high_risk_count > 0`
- Keep the current payload shape unless the frontend needs more detail.

### 5. Implement the frontend push flow
- After sign-in, request browser notification permission.
- If permission is granted, initialize Firebase Messaging in the browser.
- Retrieve the FCM token.
- Call `POST /register-device` with the token and authenticated user context.
- Re-register if the token rotates.
- On sign-out or permission revocation, stop using the token and optionally unregister it.

## Backend Changes Required
- Add Firebase Auth verification for protected requests.
- Add a user-scoped device token table or migration.
- Update `POST /register-device` to require auth and store `firebase_uid`.
- Update meeting persistence to store the owning user.
- Update push sending so it filters tokens by owner.
- Add tests for:
  - valid auth
  - invalid auth
  - registration success
  - duplicate registration
  - owner-scoped notification delivery
  - unauthenticated rejection

## Frontend Changes Required
- Add Firebase Auth sign-in/sign-up UI.
- Add a browser notification permission prompt.
- Add FCM token acquisition and registration logic.
- Handle token refresh and re-registration.
- Handle sign-out cleanup.
- Show push features as disabled until the user is authenticated and has granted permission.

## Test Plan
- Auth:
  - valid Firebase ID token is accepted
  - missing or invalid token is rejected
- Device registration:
  - authenticated user can register a token
  - same token for same user is idempotent
  - tokens are not stored without auth
- Notification flow:
  - high-risk analysis triggers push only for the correct user’s tokens
  - low-risk or no-risk analysis does not trigger push
  - missing Firebase config or no device tokens still safely no-op
- Frontend flow:
  - user must sign in before token registration
  - permission denied does not register a token
  - token refresh re-registers cleanly

## Assumptions
- Firebase Auth is the authentication provider for the web app.
- Firebase UID is the canonical user identity.
- The app remains web-only.
- Firebase Cloud Messaging remains the push transport.
- Notifications are user-scoped, not workspace-scoped, for the first version.

## Notes For Future Work
- If multi-user workspaces are added later, device tokens may need to be scoped to both user and workspace.
- If sign-out cleanup becomes important, implement `POST /unregister-device`.
- If the auth provider changes later, isolate the verification layer so the backend can swap providers without rewriting the push logic.
