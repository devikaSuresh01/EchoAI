import { api } from '../api/adapter';
import { withRetry } from '../api/retry';
import {
  FIREBASE_API_KEY,
  FIREBASE_APP_ID,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_PROJECT_ID,
  VAPID_KEY,
} from '../config/env';
import type { MeetingData } from '../types/meeting';
import type { ForegroundNotification } from '../stores/notificationStore';

const DISMISS_KEY = 'echoai_notifications_dismissed';

interface FirebaseMessagingClient {
  messaging: import('firebase/messaging').Messaging;
  onMessage: typeof import('firebase/messaging').onMessage;
  getToken: typeof import('firebase/messaging').getToken;
}

let firebaseClientPromise: Promise<FirebaseMessagingClient | null> | null = null;

function hasFirebaseConfig(): boolean {
  return [
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID,
    FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID,
    VAPID_KEY,
  ].every(Boolean);
}

async function getFirebaseMessagingClient(): Promise<FirebaseMessagingClient | null> {
  if (!hasFirebaseConfig() || typeof window === 'undefined') {
    return null;
  }

  if (firebaseClientPromise) {
    return firebaseClientPromise;
  }

  firebaseClientPromise = Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ])
    .then(([firebaseApp, firebaseMessaging]) => {
      const app = firebaseApp.initializeApp({
        apiKey: FIREBASE_API_KEY,
        authDomain: FIREBASE_AUTH_DOMAIN,
        projectId: FIREBASE_PROJECT_ID,
        messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
        appId: FIREBASE_APP_ID,
      });

      return {
        messaging: firebaseMessaging.getMessaging(app),
        onMessage: firebaseMessaging.onMessage,
        getToken: firebaseMessaging.getToken,
      };
    })
    .catch(() => null);

  return firebaseClientPromise;
}

export async function registerPushNotifications(
  userId = 'echoai-local-user',
): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator)
  ) {
    return false;
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') {
    return false;
  }

  const firebaseClient = await getFirebaseMessagingClient();
  if (!firebaseClient) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const token = await firebaseClient.getToken(firebaseClient.messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    return false;
  }

  await withRetry(() =>
    api.registerNotificationToken({
      token,
      userId,
    }),
  );

  return true;
}

export function shouldShowNotificationPermissionBanner(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  return (
    Notification.permission === 'default' &&
    localStorage.getItem(DISMISS_KEY) !== 'true'
  );
}

export function dismissNotificationPermissionBanner(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DISMISS_KEY, 'true');
  }
}

export function initForegroundListener(
  onNotification: (notification: ForegroundNotification) => void,
): () => void {
  let unsubscribe = () => undefined;

  void getFirebaseMessagingClient().then((firebaseClient) => {
    if (!firebaseClient) {
      return;
    }

    unsubscribe = firebaseClient.onMessage(firebaseClient.messaging, (payload) => {
      onNotification({
        title: payload.notification?.title ?? 'Echo AI Alert',
        body: payload.notification?.body ?? 'A high-risk item needs your attention.',
      });
    });
  });

  return () => {
    unsubscribe();
  };
}

export function createMockNotification(
  meeting: MeetingData | null,
): ForegroundNotification | null {
  if (meeting === null) {
    return null;
  }

  const targetItem =
    meeting.actionItems.find((item) => item.risk === 'high') ??
    meeting.actionItems.find((item) => item.needsConfirmation) ??
    meeting.actionItems[0];

  if (!targetItem) {
    return null;
  }

  return {
    title: 'Echo AI Alert',
    body: `${targetItem.task} needs attention from ${targetItem.owner}.`,
    meetingId: meeting.id,
    itemId: targetItem.id,
    actionLabel: 'View Item',
    durationMs: 6000,
  };
}
