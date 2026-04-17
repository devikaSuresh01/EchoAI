import { Download, Search } from 'lucide-react';
import { useEffect } from 'react';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { useAppStore } from '../stores/appStore';
import type { MeetingData } from '../types/meeting';
import { downloadCsv } from '../utils/exportCsv';
import { RiskBadge } from './RiskBadge';

const DESKTOP_COLUMN_TEMPLATE =
  'md:grid-cols-[minmax(260px,3.2fr)_minmax(110px,1.05fr)_minmax(110px,1.05fr)_minmax(110px,1fr)_minmax(110px,0.95fr)_minmax(72px,0.7fr)_minmax(88px,0.78fr)]';
const TABLE_INNER_WIDTH_CLASS = 'min-w-[940px] w-max md:min-w-full';
const PAGE_SIZE = 10;

interface ItemsTableProps {
  meetingData: MeetingData;
}

export function ItemsTable({ meetingData }: ItemsTableProps): JSX.Element | null {
  const selectedItemId = useAppStore((state) => state.selectedItemId);
  const setSelectedItemId = useAppStore((state) => state.setSelectedItemId);

  const items = meetingData.actionItems;
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

  return (
    <section className="rounded-[28px] border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md">
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
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
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

      <div className="space-y-4">
        <div className="grid gap-3 md:hidden">
          {paginatedItems.length === 0 ? (
            <div className="rounded-2xl border border-border bg-brand/70 px-4 py-10 text-center">
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
              className={`rounded-2xl border px-4 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                selectedItemId === item.id
                  ? 'border-teal-200 bg-panel shadow-sm ring-1 ring-accent/20'
                  : 'border-border bg-gradient-to-br from-white to-brand shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold leading-6 text-primary">{item.task}</p>
                <RiskBadge risk={item.risk} score={item.score} status={item.status} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Owner</p>
                  <p className="mt-2 text-sm text-primary">{item.owner}</p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Status</p>
                  <p className="mt-2 text-sm capitalize text-primary">{item.status.replace('_', ' ')}</p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Due Date</p>
                  <p className="mt-2 text-sm text-primary">{item.dueDate}</p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">Confidence</p>
                  <p className="mt-2 text-sm text-primary">{Math.round(item.confidence * 100)}%</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-border shadow-sm transition-all duration-200 hover:shadow-md md:block">
          <div className={TABLE_INNER_WIDTH_CLASS}>
          <div
            className={`hidden w-full bg-panel text-xs uppercase tracking-[0.24em] text-secondary md:grid ${DESKTOP_COLUMN_TEMPLATE}`}
          >
            {[
              { heading: 'Task', className: 'text-left' },
              { heading: 'Owner', className: 'text-center' },
              { heading: 'Status', className: 'text-center' },
              { heading: 'Due Date', className: 'text-center' },
              { heading: 'Risk', className: 'text-center' },
              { heading: 'Score', className: 'text-center' },
              { heading: 'Confidence', className: 'text-center' },
            ].map(({ heading, className }) => (
              <div
                key={heading}
                className={`px-4 py-3 ${className}`}
              >
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
                aria-label={`View item ${item.task}`}
                aria-pressed={selectedItemId === item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`grid w-full gap-3 bg-card px-4 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:items-center ${DESKTOP_COLUMN_TEMPLATE} ${
                  selectedItemId === item.id ? 'bg-panel ring-1 ring-accent/30' : 'hover:bg-gray-50'
                }`}
              >
                <div data-label="Task" className="table-card-cell md:pr-4">
                  <span className="md:hidden table-card-label">Task</span>
                  <span className="table-task-text text-sm text-primary">{item.task}</span>
                </div>
                <div data-label="Owner" className="table-card-cell table-card-cell-center">
                  <span className="md:hidden table-card-label">Owner</span>
                  <span className="text-sm text-secondary md:truncate">{item.owner}</span>
                </div>
                <div data-label="Status" className="table-card-cell table-card-cell-center">
                  <span className="md:hidden table-card-label">Status</span>
                  <span className="text-sm capitalize text-secondary">
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <div data-label="Due Date" className="table-card-cell table-card-cell-center">
                  <span className="md:hidden table-card-label">Due Date</span>
                  <span className="text-sm text-secondary">{item.dueDate}</span>
                </div>
                <div data-label="Risk" className="table-card-cell table-card-cell-center">
                  <span className="md:hidden table-card-label">Risk</span>
                  <RiskBadge risk={item.risk} score={item.score} status={item.status} />
                </div>
                <div data-label="Score" className="table-card-cell table-card-cell-center">
                  <span className="md:hidden table-card-label">Score</span>
                  <span className="text-sm font-semibold text-primary">{item.score}</span>
                </div>
                <div data-label="Confidence" className="table-card-cell table-card-cell-center">
                  <span className="md:hidden table-card-label">Confidence</span>
                  <span className="text-sm text-secondary">
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
          </div>
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
  );
}
