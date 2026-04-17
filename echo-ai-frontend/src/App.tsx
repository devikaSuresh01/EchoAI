import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { api } from './api/adapter';
import { withRetry } from './api/retry';
import { NotificationBanner } from './components/NotificationBanner';
import { IS_E2E, USE_MOCK } from './config/env';
import InputPage from './pages/InputPage';
import { createMockNotification, initForegroundListener } from './services/notifications';
import { selectMeetingData, useAppStore } from './stores/appStore';
import type { ForegroundNotification } from './stores/notificationStore';
import { useNotificationStore } from './stores/notificationStore';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));

function RouteFallback(): JSX.Element {
  return (
    <main className="min-h-screen bg-brand px-4 pb-16 pt-28 text-primary">
      <div className="mx-auto max-w-7xl">
        <div
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="h-6 w-40 animate-pulse rounded bg-panel" />
          <div className="mt-4 h-24 animate-pulse rounded-xl bg-panel" />
        </div>
      </div>
    </main>
  );
}

declare global {
  interface Window {
    triggerEchoAiNotification?: () => void;
    __ECHO_AI_E2E__?: {
      showNotification: (notification: ForegroundNotification) => void;
    };
  }
}

export default function App(): JSX.Element {
  const meetingData = useAppStore(selectMeetingData);
  const setMeetings = useAppStore((state) => state.setMeetings);
  const showBanner = useNotificationStore((state) => state.showBanner);

  useEffect(() => {
    if (USE_MOCK) {
      return;
    }

    let isActive = true;

    void withRetry(() => api.getDashboard())
      .then((meetings) => {
        if (isActive && meetings.length > 0) {
          setMeetings(meetings);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [setMeetings]);

  useEffect(() => {
    const unsubscribe = initForegroundListener((notification) => {
      showBanner(notification);
    });

    return unsubscribe;
  }, [showBanner]);

  useEffect(() => {
    if (!USE_MOCK || typeof window === 'undefined') {
      return;
    }

    window.triggerEchoAiNotification = () => {
      const notification = createMockNotification(meetingData);
      if (notification) {
        showBanner(notification);
      }
    };

    return () => {
      delete window.triggerEchoAiNotification;
    };
  }, [meetingData, showBanner]);

  useEffect(() => {
    if (!IS_E2E || typeof window === 'undefined') {
      return;
    }

    window.__ECHO_AI_E2E__ = {
      showNotification: (notification) => {
        showBanner(notification);
      },
    };

    return () => {
      delete window.__ECHO_AI_E2E__;
    };
  }, [showBanner]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <NotificationBanner />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<InputPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
