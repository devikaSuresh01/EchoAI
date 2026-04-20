import { api } from '../api/adapter';
import { withRetry } from '../api/retry';
import { getCurrentIdToken } from './auth';
import {
  getFirebaseMessagingClient,
  hasFirebaseMessagingConfig,
} from './firebaseClient';
import type { MeetingData } from '../types/meeting';
import type { ForegroundNotification } from '../stores/notificationStore';
import type { MessagePayload } from 'firebase/messaging';

const DISMISS_KEY = 'echoai_notifications_dismissed';
const TOKEN_KEY = 'echoai_notifications_token';

export function mapMessagePayloadToNotification(
  payload: Pick<MessagePayload, 'notification' | 'data'>,
): ForegroundNotification {
  return {
    title: payload.notification?.title ?? 'Echo AI Alert',
    body: payload.notification?.body ?? 'A high-risk item needs your attention.',
    meetingId: payload.data?.meetingId,
    itemId: payload.data?.itemId,
    actionLabel: payload.data?.itemId ? 'View Item' : undefined,
    durationMs: 6000,
  };
}

export async function registerPushNotifications(): Promise<boolean> {
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

  const idToken = await getCurrentIdToken();
  if (!idToken) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const token = await firebaseClient.getToken(firebaseClient.messaging, {
    vapidKey: import.meta.env.VITE_VAPID_KEY ?? '',
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    return false;
  }

  await withRetry(() =>
    api.registerNotificationToken({
      token,
    }),
  );
  localStorage.setItem(TOKEN_KEY, token);

  return true;
}

export async function syncPushRegistration(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return false;
  }

  return registerPushNotifications();
}

export async function unregisterPushNotifications(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return;
  }

  await withRetry(() =>
    api.unregisterNotificationToken({
      token,
    }),
  ).catch(() => undefined);

  localStorage.removeItem(TOKEN_KEY);
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
      onNotification(mapMessagePayloadToNotification(payload));
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

export function supportsPushNotifications(): boolean {
  return hasFirebaseMessagingConfig();
}
