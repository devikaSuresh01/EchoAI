export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
export const IS_E2E = import.meta.env.VITE_E2E === 'true';
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
export const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY ?? '';
export const FIREBASE_AUTH_DOMAIN =
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '';
export const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '';
export const FIREBASE_MESSAGING_SENDER_ID =
  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '';
export const FIREBASE_APP_ID = import.meta.env.VITE_FIREBASE_APP_ID ?? '';
export const VAPID_KEY = import.meta.env.VITE_VAPID_KEY ?? '';
