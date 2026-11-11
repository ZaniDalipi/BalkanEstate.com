import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSmoothFlag } from './useSmoothFlag';

describe('useSmoothFlag', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ignores a flag that is true only briefly', () => {
    const { result, rerender } = renderHook(({ f }) => useSmoothFlag(f, { showDelay: 150, minVisible: 500 }), { initialProps: { f: true } });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ f: false });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(false);
  });

  it('shows after the delay and stays for the minimum time once shown', () => {
    const { result, rerender } = renderHook(({ f }) => useSmoothFlag(f, { showDelay: 150, minVisible: 500 }), { initialProps: { f: true } });
    act(() => { vi.advanceTimersByTime(160); });
    expect(result.current).toBe(true);
    rerender({ f: false });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe(true);   // not yet: still inside the minimum
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe(false);
  });
});
