/**
 * `useDeferredMount` keeps an expensive subtree out of the commit a navigation
 * lands in. What matters is the shape of the flip: never during that commit,
 * always afterwards, immediately when the thing is wanted on screen, and never
 * back again.
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useDeferredMount } from '@/src/shared/hooks/useDeferredMount';

function Probe({ defer }: { defer: boolean }) {
  const mounted = useDeferredMount(defer);
  return <div data-testid="state">{mounted ? 'mounted' : 'waiting'}</div>;
}

const state = () => screen.getByTestId('state').textContent;

/** Run the frame callback the hook queued, then let its idle fallback fire. */
function settle() {
  act(() => {
    vi.advanceTimersByTime(16); // requestAnimationFrame shim
  });
  act(() => {
    vi.advanceTimersByTime(1000); // idle fallback
  });
}

describe('useDeferredMount', () => {
  let frames: number;

  beforeEach(() => {
    vi.useFakeTimers();
    frames = 0;
    // jsdom has neither of these; a timer-backed frame is enough to prove the
    // wait starts after the commit rather than inside it.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames += 1;
      return window.setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle));
    vi.stubGlobal('requestIdleCallback', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('mounts straight away when nothing is being deferred', () => {
    render(<Probe defer={false} />);
    expect(state()).toBe('mounted');
    expect(frames).toBe(0);
  });

  it('waits past the commit, then mounts', () => {
    render(<Probe defer />);
    expect(state()).toBe('waiting');
    settle();
    expect(state()).toBe('mounted');
  });

  it('mounts immediately once the subtree is wanted on screen', () => {
    const { rerender } = render(<Probe defer />);
    expect(state()).toBe('waiting');

    // The user switched to the map tab before idle ever came around.
    act(() => {
      rerender(<Probe defer={false} />);
    });
    expect(state()).toBe('mounted');
  });

  it('never unmounts something already on screen', () => {
    const { rerender } = render(<Probe defer />);
    settle();
    expect(state()).toBe('mounted');

    act(() => {
      rerender(<Probe defer />);
    });
    expect(state()).toBe('mounted');
  });
});
