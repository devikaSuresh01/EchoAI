import {
  FIREBASE_API_KEY,
  FIREBASE_APP_ID,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_PROJECT_ID,
  VAPID_KEY,
} from '../config/env';

interface FirebaseAuthClient {
  auth: import('firebase/auth').Auth;
  createUserWithEmailAndPassword: typeof import('firebase/auth').createUserWithEmailAndPassword;
  onIdTokenChanged: typeof import('firebase/auth').onIdTokenChanged;
  signInWithEmailAndPassword: typeof import('firebase/auth').signInWithEmailAndPassword;
  signOut: typeof import('firebase/auth').signOut;
}

interface FirebaseMessagingClient {
  messaging: import('firebase/messaging').Messaging;
  getToken: typeof import('firebase/messaging').getToken;
  onMessage: typeof import('firebase/messaging').onMessage;
}

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

let firebaseAppPromise: Promise<import('firebase/app').FirebaseApp | null> | null = null;

export function hasFirebaseAppConfig(): boolean {
  return Object.values(firebaseConfig).every(Boolean);
}

export function hasFirebaseMessagingConfig(): boolean {
  return hasFirebaseAppConfig() && Boolean(VAPID_KEY);
}

async function getFirebaseApp(): Promise<import('firebase/app').FirebaseApp | null> {
  if (!hasFirebaseAppConfig() || typeof window === 'undefined') {
    return null;
  }

  if (firebaseAppPromise) {
    return firebaseAppPromise;
  }

  firebaseAppPromise = import('firebase/app')
    .then((firebaseApp) => {
      if (firebaseApp.getApps().length > 0) {
        return firebaseApp.getApp();
      }

      return firebaseApp.initializeApp(firebaseConfig);
    })
    .catch(() => null);

  return firebaseAppPromise;
}

export async function getFirebaseAuthClient(): Promise<FirebaseAuthClient | null> {
  const app = await getFirebaseApp();
  if (!app) {
    return null;
  }

  return import('firebase/auth')
    .then((firebaseAuth) => ({
      auth: firebaseAuth.getAuth(app),
      createUserWithEmailAndPassword: firebaseAuth.createUserWithEmailAndPassword,
      onIdTokenChanged: firebaseAuth.onIdTokenChanged,
      signInWithEmailAndPassword: firebaseAuth.signInWithEmailAndPassword,
      signOut: firebaseAuth.signOut,
    }))
    .catch(() => null);
}

export async function getFirebaseMessagingClient(): Promise<FirebaseMessagingClient | null> {
  if (!hasFirebaseMessagingConfig()) {
    return null;
  }

  const app = await getFirebaseApp();
  if (!app) {
    return null;
  }

  return import('firebase/messaging')
    .then((firebaseMessaging) => ({
      messaging: firebaseMessaging.getMessaging(app),
      getToken: firebaseMessaging.getToken,
      onMessage: firebaseMessaging.onMessage,
    }))
    .catch(() => null);
}
