import { BellRing, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { parseApiError } from '../api/errors';
import {
  dismissNotificationPermissionBanner,
  registerPushNotifications,
  shouldShowNotificationPermissionBanner,
} from '../services/notifications';
import { useAppStore } from '../stores/appStore';
import { useNotificationStore } from '../stores/notificationStore';

export function NotificationBanner(): JSX.Element | null {
  const navigate = useNavigate();
  const meetings = useAppStore((state) => state.meetings);
  const setMeetingData = useAppStore((state) => state.setMeetingData);
  const setSelectedItemId = useAppStore((state) => state.setSelectedItemId);
  const activeNotification = useNotificationStore((state) => state.activeNotification);
  const clearBanner = useNotificationStore((state) => state.clearBanner);
  const [permissionVisible, setPermissionVisible] = useState(
    shouldShowNotificationPermissionBanner(),
  );
  const [isEnabling, setIsEnabling] = useState(false);

  const showMessageBanner = activeNotification !== null;

  useEffect(() => {
    if (activeNotification === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      clearBanner();
    }, activeNotification.durationMs ?? 6000);

    return () => window.clearTimeout(timeout);
  }, [activeNotification, clearBanner]);

  if (!permissionVisible && !showMessageBanner) {
    return null;
  }

  const handleEnableNotifications = async (): Promise<void> => {
    setIsEnabling(true);
    try {
      const enabled = await registerPushNotifications();

      if (enabled) {
        toast.success('Notifications enabled.');
        setPermissionVisible(false);
        dismissNotificationPermissionBanner();
        return;
      }

      toast.error('Notification setup is not available yet.');
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismissPermission = (): void => {
    dismissNotificationPermissionBanner();
    setPermissionVisible(false);
  };

  const handleViewItem = (): void => {
    if (activeNotification === null) {
      return;
    }

    const targetMeeting = meetings.find(
      (meeting) => meeting.id === activeNotification.meetingId,
    );

    if (targetMeeting) {
      setMeetingData(targetMeeting);
    }

    if (activeNotification.itemId) {
      setSelectedItemId(activeNotification.itemId);
    }

    clearBanner();
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex flex-col gap-3 p-4">
      {permissionVisible ? (
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm backdrop-blur transition-all duration-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold text-primary">Enable Notifications</p>
              <p className="text-xs text-secondary">
                Get alerted when high-risk items need attention.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isEnabling}
              aria-busy={isEnabling}
              onClick={handleEnableNotifications}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEnabling ? 'Enabling...' : 'Allow'}
            </button>
            <button
              type="button"
              disabled={isEnabling}
              onClick={handleDismissPermission}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              Later
            </button>
          </div>
        </div>
      ) : null}
      {activeNotification ? (
        <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-sm backdrop-blur transition-all duration-200 hover:shadow-md">
          <div className="flex items-start gap-3">
            <BellRing className="mt-0.5 h-5 w-5 text-danger" />
            <div>
              <p className="text-sm font-semibold text-primary">{activeNotification.title}</p>
              <p className="text-xs text-secondary">{activeNotification.body}</p>
              {activeNotification.itemId ? (
                <button
                  type="button"
                  onClick={handleViewItem}
                  className="mt-3 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-blue-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {activeNotification.actionLabel ?? 'View Item'}
                </button>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={clearBanner}
            className="rounded-md p-1 text-secondary transition hover:bg-gray-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
