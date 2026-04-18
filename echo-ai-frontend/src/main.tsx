import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {
  FIREBASE_API_KEY,
  FIREBASE_APP_ID,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_PROJECT_ID,
} from './config/env';
import './index.css';

function buildFirebaseMessagingServiceWorkerUrl(): string {
  const serviceWorkerUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
  const searchParams = new URLSearchParams({
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId: FIREBASE_APP_ID,
  });
  serviceWorkerUrl.search = searchParams.toString();
  return serviceWorkerUrl.toString();
}

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker
    .register(buildFirebaseMessagingServiceWorkerUrl())
    .catch(() => undefined);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
