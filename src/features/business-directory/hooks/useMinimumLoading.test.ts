import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMinimumLoading } from './useMinimumLoading';

afterEach(() => vi.useRealTimers());

describe('useMinimumLoading', () => {
  it('passes loading through when nothing has switched', () => {
    const { result, rerender } = renderHook(({ loading }) => useMinimumLoading('a', loading), { initialProps: { loading: true } });
    expect(result.current).toBe(true);
    rerender({ loading: false });
    expect(result.current).toBe(false);
  });

  it('holds a switch for the minimum time even when the data is ready at once', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ k }) => useMinimumLoading(k, false, 350), { initialProps: { k: 'a' } });
    rerender({ k: 'b' });
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(349); });
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(false);
  });

  it('keeps loading past the minimum while the data is still on its way', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ k, loading }) => useMinimumLoading(k, loading, 350), { initialProps: { k: 'a', loading: false } });
    rerender({ k: 'b', loading: true });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(true);
    rerender({ k: 'b', loading: false });
    expect(result.current).toBe(false);
  });

  it('restarts the hold on a quick second switch', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ k }) => useMinimumLoading(k, false, 350), { initialProps: { k: 'a' } });
    rerender({ k: 'b' });
    act(() => { vi.advanceTimersByTime(300); });
    rerender({ k: 'c' });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current).toBe(false);
  });
});
