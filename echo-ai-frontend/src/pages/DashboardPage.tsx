import { AlertTriangle, ArrowLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AccountToolbar } from '../components/AccountToolbar';
import { HighRiskList } from '../components/HighRiskList';
import { MeetingHistoryBrowser } from '../components/MeetingHistoryBrowser';
import { SummaryCard } from '../components/SummaryCard';
import { selectMeetingData, useAppStore } from '../stores/appStore';
import { formatDate } from '../utils/helpers';

const RiskChart = lazy(() =>
  import('../components/RiskChart').then((module) => ({
    default: module.RiskChart,
  })),
);

function DashboardSkeleton(): JSX.Element {
  return (
    <div
      className="space-y-6 animate-pulse"
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard"
    >
      <div className="mb-8 space-y-4">
        <div className="h-4 w-40 rounded bg-panel" />
        <div className="h-10 w-full max-w-2xl rounded bg-panel" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-8 w-24 rounded-full bg-panel" />
          ))}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-24 rounded-xl border border-border bg-card shadow-sm" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="h-6 w-40 rounded bg-panel" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 rounded-lg bg-panel" />
          ))}
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="h-6 w-36 rounded bg-panel" />
          <div className="h-[260px] rounded-2xl bg-panel" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="h-6 w-44 rounded bg-panel" />
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-36 rounded-xl bg-panel" />
          ))}
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="h-6 w-32 rounded bg-panel" />
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-11 rounded-lg bg-panel" />
            ))}
          </div>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-14 rounded-lg bg-panel" />
        ))}
        </div>
      </div>
    </div>
  );
}

function RiskChartFallback(): JSX.Element {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="h-6 w-36 animate-pulse rounded bg-panel" />
      <div className="mt-4 h-[240px] animate-pulse rounded-2xl bg-panel" />
    </section>
  );
}

export default function DashboardPage(): JSX.Element | null {
  const navigate = useNavigate();
  const meetingData = useAppStore(selectMeetingData);
  const meetings = useAppStore((state) => state.meetings);
  const setMeetingData = useAppStore((state) => state.setMeetingData);
  const setSelectedItemId = useAppStore((state) => state.setSelectedItemId);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!meetingData) {
      navigate('/upload', { replace: true });
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsLoading(false);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [meetingData, navigate]);

  const stats = useMemo(() => {
    if (!meetingData) {
      return null;
    }

    const totalItems = meetingData.actionItems.length;
    const highRisk = meetingData.actionItems.filter((item) => item.risk === 'high').length;
    const averageScore =
      totalItems === 0
        ? 0
        : Math.round(
            meetingData.actionItems.reduce((sum, item) => sum + item.score, 0) /
              totalItems,
          );
    const needReview = meetingData.actionItems.filter(
      (item) => item.needsConfirmation,
    ).length;

    return {
      totalItems,
      highRisk,
      averageScore,
      needReview,
      date: meetingData.meta.date,
    };
  }, [meetingData]);

  if (!meetingData || !stats) {
    return null;
  }

  return (
    <main className="surface-grid min-h-screen bg-brand px-4 pb-16 pt-28 text-primary">
      <div className="mx-auto max-w-7xl">
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="hero-glow mb-8 rounded-[32px] border border-border/80 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/10 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-slate-300">
                    Dashboard &gt; {meetingData.meta.title}
                  </p>
                  <h1 className="mt-2 text-3xl font-bold text-white">
                    {meetingData.meta.title} - {formatDate(meetingData.meta.date)}
                  </h1>
                  <p className="mt-3 max-w-2xl text-lg leading-6 text-slate-300">
                    Review meeting risk, resolve uncertain AI decisions and keep ownership
                    visible across the full follow-up list.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {meetingData.meta.participants.map((participant) => (
                      <span
                        key={participant}
                        className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-teal-100"
                      >
                        {participant}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3 self-start">
                  <Link
                    to="/upload"
                    aria-label="Start a new analysis"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/15 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    <PlusCircle className="h-4 w-4" />
                    New Analysis
                  </Link>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <AccountToolbar showDashboardLink={false} variant="inverted" />
                  </div>
                </div>
              </div>
            </div>

            <MeetingHistoryBrowser
              meetings={meetings}
              currentMeetingId={meetingData.id}
              onSelectMeeting={(meeting) => {
                setMeetingData(meeting);
              }}
            />

            <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
              <SummaryCard
                label="Total Items"
                value={stats.totalItems}
                subtitle="Action Items Found"
                valueClassName="text-primary"
              />
              <SummaryCard
                label="High Risk"
                value={stats.highRisk}
                subtitle="Need Attention"
                valueClassName="text-danger"
              />
              <SummaryCard
                label="Avg Score"
                value={stats.averageScore}
                subtitle="Average Risk Score"
                valueClassName="text-warning"
              />
              <SummaryCard
                label="Need Review"
                value={stats.needReview}
                subtitle="Awaiting your Input"
                valueClassName="text-accent"
              />
              <SummaryCard
                label="Date"
                value={formatDate(stats.date)}
                subtitle="Meeting Date"
                valueClassName="text-primary"
              />
            </div>

            {meetingData.actionItems.length === 0 ? (
              <section className="rounded-[28px] border border-border bg-card p-8 text-center shadow-sm transition-all duration-200 hover:shadow-md">
                <AlertTriangle className="mx-auto h-8 w-8 text-secondary" />
                <h2 className="mt-4 text-xl font-semibold text-primary">No Action Items Found</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary">
                  This meeting was processed successfully, but Echo AI did not detect any actionable follow-ups. Try another file if you expected task extraction.
                </p>
                <Link
                  to="/upload"
                  aria-label="Return to input page"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-teal-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Input
                </Link>
              </section>
            ) : (
              <>
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <HighRiskList
                    items={meetingData.actionItems}
                    onSelect={(itemId) => {
                      setSelectedItemId(itemId);
                      navigate(`/review?item=${itemId}`);
                    }}
                  />
                  <Suspense fallback={<RiskChartFallback />}>
                    <RiskChart analytics={meetingData.analytics} />
                  </Suspense>
                </div>

                <section className="mt-6 rounded-[28px] border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
                        Review Workspace
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-primary">
                        Keep the dashboard for insight, and handle tickets in a focused review view.
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary">
                        Open the review workspace to filter every action item, inspect ticket evidence, and resolve low-confidence AI status suggestions from a dedicated desktop layout.
                      </p>
                    </div>
                    <Link
                      to="/review"
                      className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-teal-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Open Review Workspace
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
