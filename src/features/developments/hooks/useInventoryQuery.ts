import { useCallback, useMemo, useState } from 'react';
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import { listUnits } from '../api/developmentsApi';
import { useDebouncedValue } from './useDebouncedValue';
import type { UnitAvailability, UnitListQuery, UnitSort, UnitVisibility } from '../types';

export const INVENTORY_PAGE_SIZES = [25, 50, 100] as const;
export type InventorySortField = 'unitNumber' | 'floor' | 'price' | 'updatedAt';

export interface InventoryFilters {
  search: string;
  buildingId: string;
  floorId: string;
  availability: UnitAvailability | '';
  visibility: UnitVisibility | '';
}

const DEFAULT_FILTERS: InventoryFilters = {
  search: '',
  buildingId: '',
  floorId: '',
  availability: '',
  visibility: '',
};

/** Next sort for a column click: ascending → descending → ascending (other column → ascending). */
export const nextSort = (current: UnitSort, field: InventorySortField): UnitSort =>
  current === field ? (`-${field}` as UnitSort) : (field as UnitSort);

/** Sort direction of a column under the current sort, for aria-sort. */
export const sortDirection = (current: UnitSort, field: InventorySortField): 'ascending' | 'descending' | 'none' =>
  current === field ? 'ascending' : current === `-${field}` ? 'descending' : 'none';

/**
 * Server-side inventory query state: search (debounced 300 ms), filters, sort
 * and pagination. Any filter/sort/page-size change goes back to the first page.
 * The previous page stays on screen while the next one loads.
 */
export function useInventoryQuery(developmentId: string | undefined, initialSort: UnitSort = 'unitNumber') {
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [sort, setSortState] = useState<UnitSort>(initialSort);
  const [limit, setLimitState] = useState<number>(INVENTORY_PAGE_SIZES[0]);
  const [skip, setSkip] = useState(0);
  const debouncedSearch = useDebouncedValue(filters.search.trim(), 300);

  const query: UnitListQuery = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      buildingId: filters.buildingId || undefined,
      floorId: filters.floorId || undefined,
      availability: filters.availability || undefined,
      visibility: filters.visibility || undefined,
      sort,
      limit,
      skip,
    }),
    [debouncedSearch, filters.buildingId, filters.floorId, filters.availability, filters.visibility, sort, limit, skip]
  );

  const result = useQuery({
    queryKey: developmentKeys.units(developmentId ?? '', query),
    queryFn: () => listUnits(developmentId as string, query),
    enabled: !!developmentId,
    placeholderData: keepPreviousData,
  });

  const setFilter = useCallback(<K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      // A floor belongs to one building: changing building clears the floor.
      ...(key === 'buildingId' ? { floorId: '' } : {}),
    }));
    setSkip(0);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSkip(0);
  }, []);

  const toggleSort = useCallback((field: InventorySortField) => {
    setSortState((prev) => nextSort(prev, field));
    setSkip(0);
  }, []);

  const setLimit = useCallback((next: number) => {
    setLimitState(next);
    setSkip(0);
  }, []);

  const total = result.data?.total ?? 0;
  const hasFilters = Object.entries(filters).some(([, v]) => v !== '');

  return {
    filters,
    setFilter,
    resetFilters,
    hasFilters,
    sort,
    toggleSort,
    limit,
    setLimit,
    skip,
    setSkip,
    query,
    units: result.data?.items ?? [],
    total,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isPlaceholderData: result.isPlaceholderData,
    error: result.error,
    refetch: result.refetch,
  };
}

const COUNT_STATES = ['available', 'reserved', 'sold'] as const;

/** Unit totals for the overview (total + available/reserved/sold), one tiny count query each. */
export function useUnitCounts(developmentId: string | undefined) {
  const filters: UnitListQuery[] = [{ limit: 1 }, ...COUNT_STATES.map((availability) => ({ availability, limit: 1 }))];
  const results = useQueries({
    queries: filters.map((f) => ({
      queryKey: developmentKeys.units(developmentId ?? '', f),
      queryFn: () => listUnits(developmentId as string, f),
      enabled: !!developmentId,
    })),
  });
  const [total, available, reserved, sold] = results.map((r) => r.data?.total);
  return {
    total,
    available,
    reserved,
    sold,
    isLoading: results.some((r) => r.isLoading),
  };
}
