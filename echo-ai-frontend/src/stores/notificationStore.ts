import { create } from 'zustand';

export interface ForegroundNotification {
  title: string;
  body: string;
  meetingId?: string;
  itemId?: string;
  actionLabel?: string;
  durationMs?: number;
}

interface NotificationState {
  activeNotification: ForegroundNotification | null;
  showBanner: (notification: ForegroundNotification) => void;
  clearBanner: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  activeNotification: null,
  showBanner: (notification) => {
    set({
      activeNotification: notification,
    });
  },
  clearBanner: () => {
    set({
      activeNotification: null,
    });
  },
}));
