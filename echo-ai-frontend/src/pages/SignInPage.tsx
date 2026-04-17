import { Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthPanel } from '../components/AuthPanel';
import { useAuthStore } from '../stores/authStore';

export default function SignInPage(): JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (!authLoading && user !== null) {
      navigate('/upload', { replace: true });
    }
  }, [authLoading, navigate, user]);

  return (
    <main className="surface-grid min-h-screen bg-brand px-4 py-6 text-primary sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hero-glow hidden rounded-[36px] border border-border/80 bg-slate-950 px-8 py-10 text-white shadow-2xl shadow-slate-900/10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.34em] text-teal-100 backdrop-blur">
              <Sparkles className="h-5 w-5" />
              Echo AI
            </div>
            <h1 className="max-w-xl text-5xl font-extrabold tracking-tight">
              Meeting intelligence for accountable teams.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Consolidate recordings, transcripts, and follow-up risk into one operational
              workspace built for leaders, program managers, and compliance-minded teams.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Decision Traceability', 'Capture owners, evidence, and next actions in one place.'],
              ['Risk Visibility', 'Surface high-risk follow-ups before they stall delivery.'],
              ['Review Confidence', 'Quickly validate uncertain AI decisions without leaving the dashboard.'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col justify-center">
          <div className="mb-8 text-center lg:hidden">
            <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-teal-200 bg-teal-50 px-6 py-3 text-sm font-semibold uppercase tracking-[0.34em] text-accent shadow-sm transition-transform duration-200 hover:scale-[1.03]">
              <Sparkles className="h-5 w-5" />
              Echo AI
            </div>
            <p className="text-sm font-medium text-secondary">
              Secure sign in for meeting intelligence
            </p>
          </div>

          <AuthPanel />
        </section>
      </div>
    </main>
  );
}
