import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBurstCoalescer } from './burstCoalescer';

describe('createBurstCoalescer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs once for a burst of events', () => {
    const action = vi.fn();
    const coalescer = createBurstCoalescer(action, { jitterMs: 0, random: () => 0 });

    for (let i = 0; i < 50; i++) coalescer.schedule();
    vi.advanceTimersByTime(1);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('spaces consecutive runs by at least minIntervalMs', () => {
    const action = vi.fn();
    const coalescer = createBurstCoalescer(action, {
      minIntervalMs: 15_000,
      jitterMs: 0,
      random: () => 0,
    });

    coalescer.schedule();
    vi.advanceTimersByTime(1);
    expect(action).toHaveBeenCalledTimes(1);

    // An event arriving during the cooldown waits for the window to pass.
    coalescer.schedule();
    vi.advanceTimersByTime(14_000);
    expect(action).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1_000);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('applies jitter so simultaneous clients do not fire together', () => {
    const timings: number[] = [];
    for (const roll of [0, 0.25, 0.5, 0.75]) {
      const action = vi.fn();
      const coalescer = createBurstCoalescer(action, { jitterMs: 4_000, random: () => roll });
      coalescer.schedule();

      let elapsed = 0;
      while (!action.mock.calls.length && elapsed <= 4_000) {
        vi.advanceTimersByTime(100);
        elapsed += 100;
      }
      timings.push(elapsed);
    }

    // Four "clients" reacting to the same event land in four different slots.
    expect(new Set(timings).size).toBe(timings.length);
  });

  it('cancel drops a pending run', () => {
    const action = vi.fn();
    const coalescer = createBurstCoalescer(action, { jitterMs: 0, random: () => 0 });

    coalescer.schedule();
    expect(coalescer.isPending).toBe(true);
    coalescer.cancel();
    vi.advanceTimersByTime(60_000);

    expect(action).not.toHaveBeenCalled();
    expect(coalescer.isPending).toBe(false);
  });
});
