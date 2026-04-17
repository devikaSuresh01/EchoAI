import { Loader2, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/adapter';
import { parseApiError } from '../api/errors';
import { withRetry } from '../api/retry';
import { selectMeetingData, useAppStore } from '../stores/appStore';
import type { ConfirmActionStatus } from '../types/meeting';
import { RiskBadge } from './RiskBadge';

const ACTIONS = [
  { label: 'Mark Done', value: 'done' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Not Started', value: 'not_started' },
] as const;

type RemovingState = Record<string, string>;

export function SmartConfirmPanel(): JSX.Element | null {
  const meetingData = useAppStore(selectMeetingData);
  const updateActionItemStatus = useAppStore((state) => state.updateActionItemStatus);
  const pendingItems = useMemo(
    () => meetingData?.actionItems.filter((item) => item.needsConfirmation) ?? [],
    [meetingData],
  );
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<RemovingState>({});

  if (meetingData === null || pendingItems.length === 0) {
    return null;
  }

  const handleConfirm = async (
    itemId: string,
    nextStatus: ConfirmActionStatus,
  ): Promise<void> => {
    const key = `${itemId}:${nextStatus}`;
    setLoadingKey(key);

    try {
      await withRetry(() => api.updateStatus(meetingData.id, itemId, nextStatus));

      setRemovingIds((state) => ({
        ...state,
        [itemId]: nextStatus,
      }));

      window.setTimeout(() => {
        updateActionItemStatus(meetingData.id, itemId, nextStatus);
        setRemovingIds((state) => {
          const nextState = { ...state };
          delete nextState[itemId];
          return nextState;
        });
      }, 300);
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" />
        <div>
          <h2 className="text-lg font-semibold text-primary">Smart Confirmation Panel</h2>
          <p className="text-xs text-secondary">
            Review low-confidence AI status detections.
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {pendingItems.map((item) => {
          const isRemoving = removingIds[item.id] !== undefined;
          const isBusy = loadingKey !== null;

          return (
            <article
              key={item.id}
              className={`rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                isRemoving ? 'translate-x-3 opacity-0' : 'opacity-100'
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                  AI Label
                </span>
                <RiskBadge risk={item.risk} score={item.score} status={item.status} />
                <span className="rounded-full border border-border bg-panel px-3 py-1 text-xs text-secondary">
                  Confidence {Math.round(item.confidence * 100)}%
                </span>
              </div>
              <h3 className="text-sm font-semibold text-primary">{item.task}</h3>
              <p className="mt-2 text-xs text-secondary">"{item.evidence}"</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-secondary">
                <span className="rounded-full border border-border bg-panel px-2 py-1">
                  Status: {item.status.replace('_', ' ')}
                </span>
                <span className="rounded-full border border-border bg-panel px-2 py-1">
                  Owner: {item.owner}
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {ACTIONS.map((action) => {
                  const key = `${item.id}:${action.value}`;
                  const isLoading = loadingKey === key;

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
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
