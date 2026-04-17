import { LayoutDashboard, LogOut } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { signOutCurrentUser } from '../services/auth';
import { useAuthStore } from '../stores/authStore';

interface AccountToolbarProps {
  dashboardEnabled?: boolean;
  showDashboardLink?: boolean;
  variant?: 'default' | 'inverted';
}

export function AccountToolbar({
  dashboardEnabled = false,
  showDashboardLink = true,
  variant = 'default',
}: AccountToolbarProps): JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);
    try {
      await signOutCurrentUser();
      toast.success('Signed out.');
      navigate('/sign-in', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setIsSigningOut(false);
    }
  }

  const isInverted = variant === 'inverted';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className={`text-sm ${isInverted ? 'text-slate-300' : 'text-secondary'}`}>
          Signed in as{' '}
          <span className={isInverted ? 'font-semibold text-white' : 'font-semibold text-primary'}>
            {user?.email ?? 'Unknown user'}
          </span>
        </div>
        {!dashboardEnabled && showDashboardLink ? (
          <p className={`mt-1 text-xs ${isInverted ? 'text-slate-300' : 'text-secondary'}`}>
            Upload your first meeting to unlock the dashboard workspace.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {showDashboardLink ? (
          dashboardEnabled ? (
            <Link
              to="/dashboard"
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ${
                isInverted
                  ? 'border border-white/15 bg-white/10 text-white hover:bg-white/15 focus-visible:ring-white/70'
                  : 'border border-gray-300 bg-white text-primary hover:bg-gray-50 hover:shadow-md focus-visible:ring-accent'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={`inline-flex cursor-not-allowed items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold opacity-70 ${
                isInverted
                  ? 'border border-white/10 bg-white/5 text-slate-300'
                  : 'border border-gray-200 bg-gray-50 text-secondary'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard Unlocks After Upload
            </span>
          )
        ) : null}
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={isSigningOut}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            isInverted
              ? 'border border-white/15 bg-white/10 text-white hover:bg-white/15 focus-visible:ring-white/70'
              : 'border border-gray-300 bg-white text-primary hover:bg-gray-50 hover:shadow-md focus-visible:ring-accent'
          }`}
        >
          <LogOut className="h-4 w-4" />
          {isSigningOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
