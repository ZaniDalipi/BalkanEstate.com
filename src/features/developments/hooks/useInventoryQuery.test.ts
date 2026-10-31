import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/src/tests/test-utils';

vi.mock('../api/developmentsApi', () => ({ listUnits: vi.fn() }));

import * as api from '../api/developmentsApi';
import { nextSort, sortDirection, useInventoryQuery } from './useInventoryQuery';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: createTestQueryClient() }, children);

describe('sort helpers', () => {
  it('cycles a column ascending → descending and resets on a new column', () => {
    expect(nextSort('unitNumber', 'unitNumber')).toBe('-unitNumber');
    expect(nextSort('-unitNumber', 'unitNumber')).toBe('unitNumber');
    expect(nextSort('-unitNumber', 'price')).toBe('price');
    expect(sortDirection('-price', 'price')).toBe('descending');
    expect(sortDirection('price', 'floor')).toBe('none');
  });
});

describe('useInventoryQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listUnits).mockResolvedValue({ items: [], total: 120 });
  });

  it('resets to the first page on filter changes and clears floor when building changes', async () => {
    const { result } = renderHook(() => useInventoryQuery('dev1'), { wrapper });
    await waitFor(() => expect(result.current.total).toBe(120));
    act(() => result.current.setSkip(50));
    act(() => result.current.setFilter('floorId', 'f1'));
    expect(result.current.skip).toBe(0);
    act(() => result.current.setSkip(25));
    act(() => result.current.setFilter('buildingId', 'b2'));
    expect(result.current.filters.floorId).toBe('');
    expect(result.current.skip).toBe(0);
    await waitFor(() =>
      expect(vi.mocked(api.listUnits).mock.lastCall?.[1]).toMatchObject({ buildingId: 'b2', skip: 0 })
    );
    expect(vi.mocked(api.listUnits).mock.lastCall?.[1]?.floorId).toBeUndefined();
  });

  it('changing page size returns to the first page', () => {
    const { result } = renderHook(() => useInventoryQuery('dev1'), { wrapper });
    act(() => result.current.setSkip(100));
    act(() => result.current.setLimit(50));
    expect(result.current.skip).toBe(0);
    expect(result.current.query).toMatchObject({ limit: 50, skip: 0 });
  });
});
