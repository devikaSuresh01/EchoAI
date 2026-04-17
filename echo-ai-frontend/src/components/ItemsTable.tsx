import { Download, Search } from 'lucide-react';
import { useEffect } from 'react';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { selectMeetingData, useAppStore } from '../stores/appStore';
import { downloadCsv } from '../utils/exportCsv';
import { RiskBadge } from './RiskBadge';

export function ItemsTable(): JSX.Element | null {
  const meetingData = useAppStore(selectMeetingData);
  const selectedItemId = useAppStore((state) => state.selectedItemId);
  const setSelectedItemId = useAppStore((state) => state.setSelectedItemId);

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
  } = useDashboardFilters(items);

  useEffect(() => {
    if (!selectedItemId) {
      return;
    }

    const selectedIndex = filteredItems.findIndex((item) => item.id === selectedItemId);
    if (selectedIndex === -1) {
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

  if (meetingData === null) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Items Table</h2>
          <p className="text-xs text-secondary">{filteredCount} items in current view</p>
        </div>
        <button
          type="button"
          disabled={items.length === 0}
          aria-label="Export items as CSV"
          onClick={() => downloadCsv('echo-ai-items.csv', items)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-secondary">
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
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent"
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
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent"
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
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary outline-none focus:ring-2 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="score_desc">Score Desc</option>
          <option value="score_asc">Score Asc</option>
          <option value="task_asc">Task A-Z</option>
          <option value="task_desc">Task Z-A</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="hidden bg-panel text-xs uppercase tracking-[0.24em] text-secondary md:grid md:grid-cols-[2.4fr_1fr_1fr_1fr_1fr_0.8fr_0.8fr]">
          {['Task', 'Owner', 'Status', 'Due Date', 'Risk', 'Score', 'Confidence'].map(
            (heading) => (
              <div key={heading} className="px-4 py-3">
                {heading}
              </div>
            ),
          )}
        </div>
        <div className="divide-y divide-border">
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
              aria-label={`View item ${item.task}`}
              aria-pressed={selectedItemId === item.id}
              onClick={() => setSelectedItemId(item.id)}
              className={`grid w-full gap-3 bg-card px-4 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:grid-cols-[2.4fr_1fr_1fr_1fr_1fr_0.8fr_0.8fr] md:items-center ${
                selectedItemId === item.id ? 'bg-panel ring-1 ring-accent/30' : 'hover:bg-gray-50'
              }`}
            >
              <div data-label="Task" className="table-card-cell">
                <span className="md:hidden table-card-label">Task</span>
                <span className="text-sm text-primary">{item.task}</span>
              </div>
              <div data-label="Owner" className="table-card-cell">
                <span className="md:hidden table-card-label">Owner</span>
                <span className="text-sm text-secondary">{item.owner}</span>
              </div>
              <div data-label="Status" className="table-card-cell">
                <span className="md:hidden table-card-label">Status</span>
                <span className="text-sm text-secondary">
                  {item.status.replace('_', ' ')}
                </span>
              </div>
              <div data-label="Due Date" className="table-card-cell">
                <span className="md:hidden table-card-label">Due Date</span>
                <span className="text-sm text-secondary">{item.dueDate}</span>
              </div>
              <div data-label="Risk" className="table-card-cell">
                <span className="md:hidden table-card-label">Risk</span>
                <RiskBadge risk={item.risk} score={item.score} status={item.status} />
              </div>
              <div data-label="Score" className="table-card-cell">
                <span className="md:hidden table-card-label">Score</span>
                <span className="text-sm font-semibold text-primary">{item.score}</span>
              </div>
              <div data-label="Confidence" className="table-card-cell">
                <span className="md:hidden table-card-label">Confidence</span>
                <span className="text-sm text-secondary">
                  {Math.round(item.confidence * 100)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-secondary">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page === 1}
            aria-label="Go to previous page"
            onClick={() => setPage(page - 1)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page === totalPages}
            aria-label="Go to next page"
            onClick={() => setPage(page + 1)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
