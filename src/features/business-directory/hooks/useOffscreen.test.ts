import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOffscreen } from './useOffscreen';

type Callback = (entries: Array<{ isIntersecting: boolean }>) => void;
let lastCallback: Callback | null = null;
const disconnect = vi.fn();

class FakeObserver {
  constructor(cb: Callback) { lastCallback = cb; }
  observe() {}
  disconnect() { disconnect(); }
}

afterEach(() => { vi.unstubAllGlobals(); lastCallback = null; disconnect.mockClear(); });

describe('useOffscreen', () => {
  it('is false without an element', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const { result } = renderHook(() => useOffscreen(null));
    expect(result.current).toBe(false);
  });

  it('follows the element in and out of view', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const el = document.createElement('button');
    const { result } = renderHook(() => useOffscreen(el));
    act(() => lastCallback?.([{ isIntersecting: false }]));
    expect(result.current).toBe(true);
    act(() => lastCallback?.([{ isIntersecting: true }]));
    expect(result.current).toBe(false);
  });

  it('stops observing and resets when the element goes away', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const el = document.createElement('button');
    const { result, rerender } = renderHook(({ e }) => useOffscreen(e), { initialProps: { e: el as HTMLElement | null } });
    act(() => lastCallback?.([{ isIntersecting: false }]));
    rerender({ e: null });
    expect(disconnect).toHaveBeenCalled();
    expect(result.current).toBe(false);
  });
});
