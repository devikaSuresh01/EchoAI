import { AlertTriangle } from 'lucide-react';
import type { ActionItem } from '../types/meeting';
import { RiskBadge } from './RiskBadge';

interface HighRiskListProps {
  items: ActionItem[];
  onSelect: (itemId: string) => void;
}

export function HighRiskList({
  items,
  onSelect,
}: HighRiskListProps): JSX.Element {
  const topItems = [...items]
    .filter((item) => item.risk === 'high')
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-danger" />
        <h2 className="text-lg font-semibold text-primary">High Risk Items</h2>
      </div>
      {topItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-panel px-4 py-6 text-center shadow-sm transition-all duration-200 hover:shadow-md">
          <p className="text-sm font-medium text-primary">No high risk items detected.</p>
          <p className="mt-2 text-xs leading-5 text-secondary">
            Critical and high-priority follow-ups will appear here when identified.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {topItems.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={`View high risk item ${item.task}`}
              onClick={() => onSelect(item.id)}
              className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <div className="flex flex-wrap items-center gap-3">
                <RiskBadge risk={item.risk} score={item.score} status={item.status} />
                <span className="text-sm font-medium text-primary">
                  {item.task.length > 70 ? `${item.task.slice(0, 67)}...` : item.task}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-secondary">
                <span>Owner: {item.owner}</span>
                <span>Due: {item.dueDate}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
