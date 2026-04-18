import { Eye, EyeOff, LogIn, LogOut, ShieldCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { parseApiError } from '../api/errors';
import { signIn, signOutCurrentUser, signUp } from '../services/auth';
import { useAuthStore } from '../stores/authStore';

type AuthMode = 'sign_in' | 'create_account';

export function AuthPanel(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      toast.error('Enter your email and password first.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      toast.success('Signed in successfully.');
      setPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : parseApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async (): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      toast.error('Enter your email and password first.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email.trim(), password);
      toast.success('Account created successfully.');
      setPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : parseApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await signOutCurrentUser();
      toast.success('Signed out.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCreateMode = mode === 'create_account';
  const submitLabel = isCreateMode ? 'Create Account' : 'Sign In';
  const submitBusyLabel = isCreateMode ? 'Creating account...' : 'Signing in...';
  const title = isCreateMode ? 'Create your Echo AI account' : 'Sign in to Echo AI';
  const description = isCreateMode
    ? 'Create a secure workspace account to start uploading meetings and reviewing follow-up risk.'
    : 'Access your protected workspace, review meeting risk, and keep follow-ups moving without breaking your team’s workflow.';

  return (
    <section className="rounded-[36px] border border-border/90 bg-white/90 p-6 shadow-2xl shadow-slate-200/80 backdrop-blur sm:p-8 lg:p-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-panel text-accent shadow-sm">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
            Secure Workspace Access
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary sm:text-base">
            {description}
          </p>
        </div>
        {!user ? (
          <div className="grid w-full gap-3 rounded-3xl border border-border bg-brand/80 p-4 text-left sm:grid-cols-3">
            {[
              ['1', 'Sign in or create an account'],
              ['2', 'Upload a recording or transcript'],
              ['3', 'Review risk, owners, and next steps'],
            ].map(([step, label]) => (
              <div key={step} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <p className="font-mono text-xs font-semibold text-accent">Step {step}</p>
                <p className="mt-2 text-sm font-medium text-primary">{label}</p>
              </div>
            ))}
          </div>
        ) : null}
        {user ? (
          <div className="rounded-2xl border border-border bg-panel px-4 py-3 text-sm text-primary">
            Signed in as{' '}
            <span className="font-semibold">{user.email ?? 'Unknown user'}</span>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-6 rounded-2xl border border-border bg-panel px-4 py-6 text-sm text-secondary">
          Loading account status...
        </div>
      ) : user ? (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {isSubmitting ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-5">
          <div
            className="grid grid-cols-2 rounded-2xl border border-border bg-brand/70 p-1"
            role="tablist"
            aria-label="Authentication mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'sign_in'}
              onClick={() => setMode('sign_in')}
              disabled={isSubmitting}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === 'sign_in'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'create_account'}
              onClick={() => setMode('create_account')}
              disabled={isSubmitting}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === 'create_account'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Create Account
            </button>
          </div>
          <label className="relative flex min-w-0 flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary">
              Email
            </span>
            <input
              aria-label="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="min-w-0 rounded-2xl border border-gray-300 bg-white px-4 py-3.5 text-sm text-primary outline-none transition placeholder:text-secondary/80 focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary">
                Password
              </span>
              <span className="text-xs text-secondary">Minimum 6 characters</span>
            </div>
            <div className="relative">
              <input
                aria-label="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="min-w-0 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3.5 pr-14 text-sm text-primary outline-none transition placeholder:text-secondary/80 focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide characters' : 'Show characters'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
                disabled={isSubmitting}
                className="absolute inset-y-0 right-3 my-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-secondary transition hover:bg-brand hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <div className="flex flex-col gap-4 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => void (isCreateMode ? handleCreateAccount() : handleSubmit())}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-teal-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreateMode ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {isSubmitting ? submitBusyLabel : submitLabel}
            </button>
            <div className="text-center text-sm text-secondary">
              {isCreateMode
                ? 'Create your account here, then continue directly into the workspace.'
                : 'Use the toggle above if you need to create a new account.'}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
