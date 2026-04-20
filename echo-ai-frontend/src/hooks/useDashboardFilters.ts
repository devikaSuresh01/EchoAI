import { useEffect, useMemo, useState } from 'react';
import type { ActionItem } from '../types/meeting';

interface FiltersState {
  risk: 'all' | 'high' | 'medium' | 'low';
  status: 'all' | 'done' | 'in_progress' | 'not_started' | 'deferred';
  owner: string;
  sort: 'score_desc' | 'score_asc' | 'task_asc' | 'task_desc';
}

function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debouncedValue;
}

export function useDashboardFilters(items: ActionItem[], pageSize = 10) {
  const [filters, setFilters] = useState<FiltersState>({
    risk: 'all',
    status: 'all',
    owner: '',
    sort: 'score_desc',
  });
  const [page, setPageState] = useState(1);
  const debouncedOwner = useDebounce(filters.owner, 300);

  const updateFilters = (
    updater: FiltersState | ((current: FiltersState) => FiltersState),
  ) => {
    setFilters(updater);
    setPageState(1);
  };

  const filteredItems = useMemo(() => {
    const nextItems = items.filter((item) => {
      const riskMatches = filters.risk === 'all' || item.risk === filters.risk;
      const statusMatches =
        filters.status === 'all' || item.status === filters.status;
      const ownerMatches = item.owner
        .toLowerCase()
        .includes(debouncedOwner.toLowerCase());

      return riskMatches && statusMatches && ownerMatches;
    });

    nextItems.sort((left, right) => {
      if (filters.sort === 'score_asc') {
        return left.score - right.score;
      }

      if (filters.sort === 'task_asc') {
        return left.task.localeCompare(right.task);
      }

      if (filters.sort === 'task_desc') {
        return right.task.localeCompare(left.task);
      }

      return right.score - left.score;
    });

    return nextItems;
  }, [debouncedOwner, filters.risk, filters.sort, filters.status, items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return {
    filters,
    setFilters: updateFilters,
    page: currentPage,
    setPage: (nextPage: number) => {
      setPageState(Math.max(1, nextPage));
    },
    totalPages,
    filteredCount: filteredItems.length,
    filteredItems,
    pageSize,
    paginatedItems,
  };
}
