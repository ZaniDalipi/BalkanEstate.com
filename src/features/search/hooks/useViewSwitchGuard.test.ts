import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewSwitchGuard } from './useViewSwitchGuard';
import { SWITCH_MARKER_KEY, SWITCH_SURVIVE_MS } from '../utils/viewSwitchGuard';

// The shared test setup replaces sessionStorage with inert mocks; give them a
// real in-memory behaviour so the marker can be written and read back.
const store = new Map<string, string>();
function useWorkingSessionStorage() {
  vi.mocked(window.sessionStorage.getItem).mockImplementation((k: string) => store.get(k) ?? null);
  vi.mocked(window.sessionStorage.setItem).mockImplementation((k: string, v: string) => { store.set(k, v); });
  vi.mocked(window.sessionStorage.removeItem).mockImplementation((k: string) => { store.delete(k); });
}

describe('useViewSwitchGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    store.clear();
    useWorkingSessionStorage();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts normal when nothing was pending', () => {
    const { result } = renderHook(() => useViewSwitchGuard());
    expect(result.current.recovered).toBe(false);
  });

  it('marks a switch, and clears the marker once the page has lived through it', () => {
    const { result } = renderHook(() => useViewSwitchGuard());
    act(() => result.current.beginSwitch());
    expect(result.current.switched).toBe(true);
    expect(window.sessionStorage.getItem(SWITCH_MARKER_KEY)).not.toBeNull();
    act(() => { vi.advanceTimersByTime(SWITCH_SURVIVE_MS + 1); });
    expect(window.sessionStorage.getItem(SWITCH_MARKER_KEY)).toBeNull();
  });

  it('recovers when the previous page died mid-switch (marker left behind)', () => {
    // First page: taps the switch, then is killed — no cleanup runs.
    window.sessionStorage.setItem(SWITCH_MARKER_KEY, String(Date.now()));
    const { result } = renderHook(() => useViewSwitchGuard());
    expect(result.current.recovered).toBe(true);
    expect(result.current.switched).toBe(false);
    // The visitor choosing a view lifts the "stay on the list" rule.
    act(() => result.current.beginSwitch());
    expect(result.current.switched).toBe(true);
    // And the next load after a healthy one is normal again.
    act(() => { vi.advanceTimersByTime(SWITCH_SURVIVE_MS + 1); });
    expect(renderHook(() => useViewSwitchGuard()).result.current.recovered).toBe(false);
  });

  it('leaves no marker behind when the visitor simply leaves the page', () => {
    const { result, unmount } = renderHook(() => useViewSwitchGuard());
    act(() => result.current.beginSwitch());
    unmount();
    expect(window.sessionStorage.getItem(SWITCH_MARKER_KEY)).toBeNull();
  });
});
