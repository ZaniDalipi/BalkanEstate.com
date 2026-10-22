import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { buildExplorerSearch, parseExplorerSearch, useExplorerUrlState } from './useExplorerUrlState';
import { EMPTY_CRITERIA, type UnitCriteria } from '../utils/unitFilters';

const full: UnitCriteria = {
  beds: [1, 3],
  baths: [2],
  types: ['apartment', 'duplex'],
  features: ['sea_view'],
  availability: ['available', 'reserved'],
  orientations: ['south'],
  flags: ['terrace', 'balcony'],
  minArea: 40,
  maxArea: 95,
  minLevel: -1,
  maxLevel: 6,
  minPrice: 100000,
};

describe('explorer URL state (pure)', () => {
  it('round-trips every criterion and the navigation', () => {
    const nav = { building: 'b1', floor: 'f2', view: 'east' };
    const qs = buildExplorerSearch({ criteria: full, nav });
    const back = parseExplorerSearch(qs);
    expect(back.nav).toEqual(nav);
    expect(back.criteria).toEqual({ ...full, maxPrice: undefined });
  });

  it('keeps params it does not own (e.g. unit) and drops stale ones', () => {
    const qs = buildExplorerSearch({ criteria: { ...EMPTY_CRITERIA, beds: [2] }, nav: {} }, '?unit=u1&beds=4&area=1~2');
    const p = new URLSearchParams(qs);
    expect(p.get('unit')).toBe('u1');
    expect(p.get('beds')).toBe('2');
    expect(p.has('area')).toBe(false);
  });

  it('ignores garbage values', () => {
    const s = parseExplorerSearch('?beds=x,2&av=nope,sold&flags=terrace,bogus&area=abc~');
    expect(s.criteria.beds).toEqual([2]);
    expect(s.criteria.availability).toEqual(['sold']);
    expect(s.criteria.flags).toEqual(['terrace']);
    expect(s.criteria.minArea).toBeUndefined();
  });

  it('writes an empty query for empty criteria', () => {
    expect(buildExplorerSearch({ criteria: EMPTY_CRITERIA, nav: {} })).toBe('');
  });
});

describe('useExplorerUrlState', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/en/developments/x?unit=u9&beds=2');
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('reads the initial state and writes changes back after 300 ms with replaceState', () => {
    const push = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useExplorerUrlState());
    expect(result.current.criteria.beds).toEqual([2]);

    act(() => result.current.setCriteria({ ...result.current.criteria, beds: [3], minArea: 50 }));
    expect(result.current.criteria.beds).toEqual([3]);
    act(() => vi.advanceTimersByTime(299));
    expect(new URLSearchParams(window.location.search).get('beds')).toBe('2');
    act(() => vi.advanceTimersByTime(1));
    const p = new URLSearchParams(window.location.search);
    expect(p.get('beds')).toBe('3');
    expect(p.get('area')).toBe('50~');
    expect(p.get('unit')).toBe('u9');
    expect(push).not.toHaveBeenCalled();

    act(() => result.current.setNav({ building: 'b2' }));
    act(() => vi.advanceTimersByTime(300));
    expect(new URLSearchParams(window.location.search).get('b')).toBe('b2');
  });
});
