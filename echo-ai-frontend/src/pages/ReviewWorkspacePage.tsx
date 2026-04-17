import { ArrowLeft, CalendarDays, Download, Loader2, Search, Sparkles, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AccountToolbar } from '../components/AccountToolbar';
import { RiskBadge } from '../components/RiskBadge';
import { api } from '../api/adapter';
import { parseApiError } from '../api/errors';
import { withRetry } from '../api/retry';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { selectMeetingData, useAppStore } from '../stores/appStore';
import type { ActionItem, ConfirmActionStatus } from '../types/meeting';
import { formatDate } from '../utils/helpers';
import { downloadCsv } from '../utils/exportCsv';

const DESKTOP_COLUMN_TEMPLATE =
  'grid-cols-[minmax(260px,3.2fr)_minmax(110px,1.05fr)_minmax(110px,1.05fr)_minmax(110px,1fr)_minmax(110px,0.95fr)_minmax(72px,0.7fr)_minmax(88px,0.78fr)]';
const TABLE_INNER_WIDTH_CLASS = 'min-w-[940px] w-max xl:min-w-full';
const PAGE_SIZE = 10;
const ACTIONS = [
  { label: 'Mark Done', value: 'done' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Not Started', value: 'not_started' },
] as const;

function ReviewWorkspaceSkeleton(): JSX.Element {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-live="polite" aria-label="Loading review workspace">
      <div className="h-28 rounded-[28px] border border-border bg-card shadow-sm" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_380px]">
        <div className="space-y-4 rounded-[28px] border border-border bg-card p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-11 rounded-xl bg-panel" />
            ))}
          </div>
          <div className="h-[520px] rounded-2xl bg-panel" />
        </div>
        <div className="h-[620px] rounded-[28px] border border-border bg-card shadow-sm" />
      </div>
    </div>
  );
}

function DetailValue({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-border bg-brand/70 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">{label}</p>
      <p className="mt-2 text-sm text-primary">{value}</p>
    </div>
  );
}

function ReviewDetailPanel({
  meetingId,
  item,
  onClose,
}: {
  meetingId: string;
  item: ActionItem | null;
  onClose: () => void;
}): JSX.Element {
  const updateActionItemStatus = useAppStore((state) => state.updateActionItemStatus);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleConfirm = async (
    itemId: string,
    nextStatus: ConfirmActionStatus,
  ): Promise<void> => {
    const key = `${itemId}:${nextStatus}`;
    setLoadingKey(key);

    try {
      await withRetry(() => api.updateStatus(meetingId, itemId, nextStatus));
      updateActionItemStatus(meetingId, itemId, nextStatus);
      toast.success('Item status updated.');
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setLoadingKey(null);
    }
  };

  if (item === null) {
    return (
      <aside className="sticky top-28 h-fit rounded-[28px] border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary">Ticket Detail</h2>
            <p className="text-sm text-secondary">Select any ticket to open its full review context.</p>
          </div>
        </div>
        <div className="mt-6 rounded-3xl border border-dashed border-border bg-brand/60 px-5 py-12 text-center">
          <p className="text-sm font-medium text-primary">Nothing selected yet.</p>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Use the table to inspect a ticket, verify evidence, and confirm low-confidence AI status calls.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-28 h-fit rounded-[28px] border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-secondary">Ticket Detail</p>
          <h2 className="mt-2 text-xl font-semibold text-primary">{item.task}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ticket details"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <RiskBadge risk={item.risk} score={item.score} status={item.status} />
        <span className="rounded-full border border-border bg-panel px-3 py-1 text-xs text-secondary">
          Confidence {Math.round(item.confidence * 100)}%
        </span>
        {item.needsConfirmation ? (
          <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Human review
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3">
        <DetailValue label="Owner" value={item.owner} />
        <DetailValue label="Due Date" value={item.dueDate} />
        <DetailValue label="Status" value={item.status.replace('_', ' ')} />
        <DetailValue
          label="Keywords"
          value={item.riskKeywords.length > 0 ? item.riskKeywords.join(', ') : 'No keywords attached'}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-brand/70 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">Evidence</p>
        <p className="mt-3 text-sm leading-6 text-primary">"{item.evidence}"</p>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-brand/70 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">Why EchoAI flagged this</p>
        <p className="mt-3 text-sm leading-6 text-primary">{item.reason}</p>
      </div>

      {item.needsConfirmation ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold text-primary">Resolve AI status suggestion</p>
          </div>
          <div className="grid gap-2">
            {ACTIONS.map((action) => {
              const key = `${item.id}:${action.value}`;
              const isLoading = loadingKey === key;
              const isBusy = loadingKey !== null;

              return (
                <button
                  key={action.value}
                  type="button"
                  disabled={isBusy}
                  aria-busy={isLoading}
                  aria-label={`${action.label} for ${item.task}`}
                  onClick={() => {
                    void handleConfirm(item.id, action.value);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-border bg-panel px-4 py-3">
          <p className="text-sm font-medium text-primary">Status already confirmed.</p>
          <p className="mt-1 text-sm text-secondary">This item no longer needs a manual AI review decision.</p>
        </div>
      )}
    </aside>
  );
}

export default function ReviewWorkspacePage(): JSX.Element | null {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const meetingData = useAppStore(selectMeetingData);
  const meetings = useAppStore((state) => state.meetings);
  const selectedItemId = useAppStore((state) => state.selectedItemId);
  const setSelectedItemId = useAppStore((state) => state.setSelectedItemId);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!meetingData) {
      navigate('/upload', { replace: true });
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsLoading(false);
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [meetingData, navigate]);

  const items = meetingData?.actionItems ?? [];
  const {
    filters,
    setFilters,
    page,
    setPage,
    totalPages,
    filteredCount,
    filteredItems,
    pageSize,
    paginatedItems,
  } = useDashboardFilters(items, PAGE_SIZE);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  const pendingReviewCount = useMemo(
    () => items.filter((item) => item.needsConfirmation).length,
    [items],
  );
  const selectedItemQuery = searchParams.get('item');

  const updateSelection = (itemId: string | null, replace = false): void => {
    setSelectedItemId(itemId);

    const nextParams = new URLSearchParams(searchParams);
    if (itemId) {
      nextParams.set('item', itemId);
    } else {
      nextParams.delete('item');
    }
    setSearchParams(nextParams, { replace });
  };

  useEffect(() => {
    if (!meetingData) {
      return;
    }
    const itemId = selectedItemQuery;

    if (itemId === null) {
      if (selectedItemId !== null) {
        setSelectedItemId(null);
      }
      return;
    }

    const itemExists = meetingData.actionItems.some((item) => item.id === itemId);
    if (!itemExists) {
      updateSelection(null, true);
      return;
    }

    if (selectedItemId !== itemId) {
      setSelectedItemId(itemId);
    }
  }, [meetingData, selectedItemId, selectedItemQuery, setSelectedItemId]);

  useEffect(() => {
    if (!selectedItemId) {
      return;
    }

    const selectedIndex = filteredItems.findIndex((item) => item.id === selectedItemId);
    if (selectedIndex === -1) {
      updateSelection(null, true);
      return;
    }

    const targetPage = Math.floor(selectedIndex / pageSize) + 1;
    if (page !== targetPage) {
      setPage(targetPage);
      return;
    }

    const row = document.getElementById(`item-row-${selectedItemId}`);
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [filteredItems, page, pageSize, selectedItemId, setPage]);

  if (!meetingData) {
    return null;
  }

  return (
    <main className="surface-grid min-h-screen bg-brand px-4 pb-16 pt-28 text-primary">
      <div className="mx-auto max-w-7xl">
        {isLoading ? (
          <ReviewWorkspaceSkeleton />
        ) : (
          <>
            <section className="hero-glow mb-8 rounded-[32px] border border-border/80 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/10 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                    <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-300 transition hover:text-white">
                      <ArrowLeft className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <span>/</span>
                    <span>Review Workspace</span>
                  </div>
                  <h1 className="mt-3 text-3xl font-bold text-white">
                    Review tickets for {meetingData.meta.title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-lg leading-6 text-slate-300">
                    Work through action items in a focused desktop workspace without losing the meeting context.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-200">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(meetingData.meta.date)}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                      <Users className="h-4 w-4" />
                      {meetingData.meta.participants.length} participants
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                      <Sparkles className="h-4 w-4" />
                      {pendingReviewCount} items need review
                    </span>
                  </div>
                </div>
                <div className="flex min-w-[280px] flex-col gap-3 self-start">
                  <Link
                    to="/upload"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/15 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    New Analysis
                  </Link>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <AccountToolbar
                      dashboardEnabled={meetings.length > 0}
                      showDashboardLink={false}
                      variant="inverted"
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_380px]">
              <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">Review Queue</p>
                    <h2 className="mt-2 text-2xl font-semibold text-primary">All action items</h2>
                    <p className="mt-2 text-sm text-secondary">
                      {filteredCount} items match the current filters. Select a row to inspect the full ticket.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={items.length === 0}
                    aria-label="Export items as CSV"
                    onClick={() => downloadCsv('echoai-items.csv', items)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>

                <div className="mb-4 grid gap-3 xl:grid-cols-4">
                  <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-secondary">
                    <Search className="h-4 w-4 text-secondary" />
                    <input
                      value={filters.owner}
                      onChange={(event) =>
                        setFilters((state) => ({
                          ...state,
                          owner: event.target.value,
                        }))
                      }
                      aria-label="Filter items by owner"
                      placeholder="Filter by owner"
                      className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-secondary"
                    />
                  </label>
                  <select
                    value={filters.risk}
                    onChange={(event) =>
                      setFilters((state) => ({
                        ...state,
                        risk: event.target.value as typeof filters.risk,
                      }))
                    }
                    aria-label="Filter items by risk"
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <option value="all">All Risks</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    value={filters.status}
                    onChange={(event) =>
                      setFilters((state) => ({
                        ...state,
                        status: event.target.value as typeof filters.status,
                      }))
                    }
                    aria-label="Filter items by status"
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <option value="all">All Statuses</option>
                    <option value="done">Done</option>
                    <option value="in_progress">In Progress</option>
                    <option value="not_started">Not Started</option>
                    <option value="deferred">Deferred</option>
                  </select>
                  <select
                    value={filters.sort}
                    onChange={(event) =>
                      setFilters((state) => ({
                        ...state,
                        sort: event.target.value as typeof filters.sort,
                      }))
                    }
                    aria-label="Sort items"
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <option value="score_desc">Score Desc</option>
                    <option value="score_asc">Score Asc</option>
                    <option value="task_asc">Task A-Z</option>
                    <option value="task_desc">Task Z-A</option>
                  </select>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
                  <div className={TABLE_INNER_WIDTH_CLASS}>
                    <div className={`grid w-full bg-panel text-xs uppercase tracking-[0.24em] text-secondary ${DESKTOP_COLUMN_TEMPLATE}`}>
                      {[
                        { heading: 'Task', className: 'text-left' },
                        { heading: 'Owner', className: 'text-center' },
                        { heading: 'Status', className: 'text-center' },
                        { heading: 'Due Date', className: 'text-center' },
                        { heading: 'Risk', className: 'text-center' },
                        { heading: 'Score', className: 'text-center' },
                        { heading: 'Confidence', className: 'text-center' },
                      ].map(({ heading, className }) => (
                        <div key={heading} className={`px-4 py-3 ${className}`}>
                          {heading}
                        </div>
                      ))}
                    </div>
                    <div className="w-full divide-y divide-border">
                      {paginatedItems.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <p className="text-sm font-medium text-primary">No items match these filters.</p>
                          <p className="mt-2 text-xs text-secondary">
                            Adjust owner, risk, status, or sort options to broaden the results.
                          </p>
                        </div>
                      ) : null}
                      {paginatedItems.map((item) => (
                        <button
                          id={`item-row-${item.id}`}
                          key={item.id}
                          type="button"
                          aria-label={`Open ticket ${item.task}`}
                          aria-pressed={selectedItemId === item.id}
                          onClick={() => updateSelection(item.id)}
                          className={`grid w-full gap-3 bg-card px-4 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:items-center ${DESKTOP_COLUMN_TEMPLATE} ${
                            selectedItemId === item.id ? 'bg-panel ring-1 ring-accent/30' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="pr-4">
                            <div className="flex items-center gap-3">
                              <span className="line-clamp-2 text-sm text-primary">{item.task}</span>
                              {item.needsConfirmation ? (
                                <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                                  Review
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-center text-sm text-secondary">{item.owner}</div>
                          <div className="text-center text-sm capitalize text-secondary">{item.status.replace('_', ' ')}</div>
                          <div className="text-center text-sm text-secondary">{item.dueDate}</div>
                          <div className="flex justify-center">
                            <RiskBadge risk={item.risk} score={item.score} status={item.status} />
                          </div>
                          <div className="text-center text-sm font-semibold text-primary">{item.score}</div>
                          <div className="text-center text-sm text-secondary">{Math.round(item.confidence * 100)}%</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-secondary">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page === 1}
                      aria-label="Go to previous page"
                      onClick={() => setPage(page - 1)}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page === totalPages}
                      aria-label="Go to next page"
                      onClick={() => setPage(page + 1)}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </section>

              <ReviewDetailPanel
                meetingId={meetingData.id}
                item={selectedItem}
                onClose={() => updateSelection(null)}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
