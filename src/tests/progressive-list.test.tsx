/**
 * `useProgressiveList` keeps the *size* of a subtree out of the commit a
 * navigation lands in: the search page's map carries a marker per listing, and
 * mounting several hundred of them at once was seconds of frozen screen on the
 * frame a back press arrived. What matters is that the first batch is small,
 * that the rest all arrive, and that nothing already on screen is ever taken
 * away again.
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useProgressiveList } from '@/src/shared/hooks/useProgressiveList';

function Probe({ items, initial = 3, chunk = 2 }: { items: number[]; initial?: number; chunk?: number }) {
  const shown = useProgressiveList(items, { initial, chunk });
  return <div data-testid="shown">{shown.join(',')}</div>;
}

const shown = () => screen.getByTestId('shown').textContent;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Let one queued chunk run. */
function tick() {
  act(() => {
    vi.advanceTimersByTime(100);
  });
}

describe('useProgressiveList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom has no requestIdleCallback; the hook's timer fallback is the path
    // Safari takes too, so exercising it covers both.
    vi.stubGlobal('requestIdleCallback', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('renders only the first batch to begin with', () => {
    render(<Probe items={range(10)} />);
    expect(shown()).toBe('0,1,2');
  });

  it('grows a chunk at a time until the whole list is on screen', () => {
    render(<Probe items={range(10)} />);
    tick();
    expect(shown()).toBe('0,1,2,3,4');
    tick();
    expect(shown()).toBe('0,1,2,3,4,5,6');
    tick();
    tick();
    expect(shown()).toBe('0,1,2,3,4,5,6,7,8,9');
  });

  it('stops scheduling once everything is shown', () => {
    render(<Probe items={range(4)} />);
    tick();
    expect(shown()).toBe('0,1,2,3');
    const before = vi.getTimerCount();
    tick();
    expect(shown()).toBe('0,1,2,3');
    expect(before).toBe(0);
  });

  it('passes a list shorter than the first batch straight through', () => {
    render(<Probe items={range(2)} />);
    expect(shown()).toBe('0,1');
  });

  it('does not send what is already on screen back to the start', () => {
    // A poll returning the same rows hands down a new array every time. Markers
    // already on the map must not be torn down and rebuilt because of it.
    const { rerender } = render(<Probe items={range(10)} />);
    tick();
    tick();
    expect(shown()).toBe('0,1,2,3,4,5,6');

    rerender(<Probe items={range(10)} />);
    expect(shown()).toBe('0,1,2,3,4,5,6');
  });

  it('keeps growing when the list itself grows', () => {
    const { rerender } = render(<Probe items={range(4)} />);
    tick();
    expect(shown()).toBe('0,1,2,3');

    rerender(<Probe items={range(8)} />);
    tick();
    expect(shown()).toBe('0,1,2,3,4,5');
    tick();
    expect(shown()).toBe('0,1,2,3,4,5,6,7');
  });

  it('clamps to a list that shrinks under it', () => {
    const { rerender } = render(<Probe items={range(10)} />);
    tick();
    rerender(<Probe items={range(2)} />);
    expect(shown()).toBe('0,1');
  });
});
