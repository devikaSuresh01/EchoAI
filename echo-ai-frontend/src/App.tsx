import { Suspense, lazy, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api/adapter';
import { withRetry } from './api/retry';
import { NotificationBanner } from './components/NotificationBanner';
import { IS_E2E, USE_MOCK } from './config/env';
import InputPage from './pages/InputPage';
import SignInPage from './pages/SignInPage';
import { subscribeToAuthChanges } from './services/auth';
import {
  createMockNotification,
  initForegroundListener,
  syncPushRegistration,
  unregisterPushNotifications,
} from './services/notifications';
import { selectMeetingData, useAppStore } from './stores/appStore';
import { useAuthStore } from './stores/authStore';
import type { ForegroundNotification } from './stores/notificationStore';
import { useNotificationStore } from './stores/notificationStore';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ReviewWorkspacePage = lazy(() => import('./pages/ReviewWorkspacePage'));

function AuthLoadingFallback(): JSX.Element {
  return <RouteFallback />;
}

function ProtectedRoute({ children }: { children: JSX.Element }): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);

  if (authLoading) {
    return <AuthLoadingFallback />;
  }

  if (user === null) {
    return <Navigate to="/sign-in" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }: { children: JSX.Element }): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);

  if (authLoading) {
    return <AuthLoadingFallback />;
  }

  if (user !== null) {
    return <Navigate to="/upload" replace />;
  }

  return children;
}

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
  const clearMeetings = useAppStore((state) => state.clearMeetings);
  const setMeetings = useAppStore((state) => state.setMeetings);
  const showBanner = useNotificationStore((state) => state.showBanner);
  const setAuthState = useAuthStore((state) => state.setAuthState);
  const setAuthLoading = useAuthStore((state) => state.setLoading);
  const user = useAuthStore((state) => state.user);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      setAuthState(nextUser);
    });

    return unsubscribe;
  }, [setAuthLoading, setAuthState]);

  useEffect(() => {
    const previousUid = previousUserId.current;
    const nextUid = user?.uid ?? null;

    if (user === null) {
      clearMeetings();
      return;
    }

    if (previousUid && previousUid !== nextUid) {
      clearMeetings();
    }

    if (USE_MOCK) {
      return;
    }

    let isActive = true;

    void withRetry(() => api.getDashboard())
      .then((meetings) => {
        if (isActive) {
          setMeetings(meetings);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [clearMeetings, setMeetings, user]);

  useEffect(() => {
    const unsubscribe = initForegroundListener((notification) => {
      showBanner(notification);
    });

    return unsubscribe;
  }, [showBanner]);

  useEffect(() => {
    const previousUid = previousUserId.current;
    const nextUid = user?.uid ?? null;

    if (previousUid && previousUid !== nextUid) {
      void unregisterPushNotifications();
    }

    if (nextUid) {
      void syncPushRegistration();
    }

    previousUserId.current = nextUid;
  }, [user?.uid]);

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
          <Route
            path="/"
            element={(
              <PublicOnlyRoute>
                <SignInPage />
              </PublicOnlyRoute>
            )}
          />
          <Route
            path="/sign-in"
            element={(
              <PublicOnlyRoute>
                <SignInPage />
              </PublicOnlyRoute>
            )}
          />
          <Route
            path="/upload"
            element={(
              <ProtectedRoute>
                <InputPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/dashboard"
            element={(
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/review"
            element={(
              <ProtectedRoute>
                <ReviewWorkspacePage />
              </ProtectedRoute>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
