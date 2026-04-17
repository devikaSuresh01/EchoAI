import { IS_E2E, USE_MOCK } from '../config/env';
import { getFirebaseAuthClient, hasFirebaseAppConfig } from './firebaseClient';

export interface AuthUser {
  uid: string;
  email: string | null;
}

const MOCK_USER: AuthUser = {
  uid: 'echoai-mock-user',
  email: 'demo@echoai.local',
};

const USE_TEST_AUTH = USE_MOCK || IS_E2E;
const E2E_AUTH_STORAGE_KEY = 'echoai:e2e-auth';

function readInitialMockUser(): AuthUser | null {
  if (!USE_TEST_AUTH) {
    return null;
  }

  if (
    IS_E2E &&
    typeof window !== 'undefined' &&
    window.localStorage.getItem(E2E_AUTH_STORAGE_KEY) === 'signed_out'
  ) {
    return null;
  }

  return MOCK_USER;
}

function persistMockUser(): void {
  if (!IS_E2E || typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    E2E_AUTH_STORAGE_KEY,
    mockUser === null ? 'signed_out' : 'signed_in',
  );
}

let mockUser: AuthUser | null = readInitialMockUser();
const mockListeners = new Set<(user: AuthUser | null) => void>();

function mapFirebaseUser(
  user: import('firebase/auth').User | null,
): AuthUser | null {
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email,
  };
}

function emitMockUser(): void {
  for (const listener of mockListeners) {
    listener(mockUser);
  }
}

export function isAuthAvailable(): boolean {
  return USE_TEST_AUTH || hasFirebaseAppConfig();
}

export function subscribeToAuthChanges(
  callback: (user: AuthUser | null) => void,
): () => void {
  if (USE_TEST_AUTH) {
    mockListeners.add(callback);
    callback(mockUser);

    return () => {
      mockListeners.delete(callback);
    };
  }

  let isDisposed = false;
  let unsubscribe = () => undefined;

  void getFirebaseAuthClient().then((client) => {
    if (!client || isDisposed) {
      callback(null);
      return;
    }

    unsubscribe = client.onIdTokenChanged(client.auth, (user) => {
      callback(mapFirebaseUser(user));
    });
  });

  return () => {
    isDisposed = true;
    unsubscribe();
  };
}

export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  if (USE_TEST_AUTH) {
    return mockUser ? 'mock-id-token' : null;
  }

  const client = await getFirebaseAuthClient();
  const user = client?.auth.currentUser;
  if (!user) {
    return null;
  }

  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  if (USE_TEST_AUTH) {
    if (IS_E2E) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 200);
      });
    }

    mockUser = {
      uid: 'echoai-mock-user',
      email,
    };
    persistMockUser();
    emitMockUser();
    return;
  }

  const client = await getFirebaseAuthClient();
  if (!client) {
    throw new Error('Firebase Auth is not configured.');
  }

  await client.signInWithEmailAndPassword(client.auth, email, password);
}

export async function signUp(email: string, password: string): Promise<void> {
  if (USE_TEST_AUTH) {
    mockUser = {
      uid: 'echoai-mock-user',
      email,
    };
    persistMockUser();
    emitMockUser();
    return;
  }

  const client = await getFirebaseAuthClient();
  if (!client) {
    throw new Error('Firebase Auth is not configured.');
  }

  await client.createUserWithEmailAndPassword(client.auth, email, password);
}

export async function signOutCurrentUser(): Promise<void> {
  if (USE_TEST_AUTH) {
    mockUser = null;
    persistMockUser();
    emitMockUser();
    return;
  }

  const client = await getFirebaseAuthClient();
  if (!client) {
    return;
  }

  await client.signOut(client.auth);
}
