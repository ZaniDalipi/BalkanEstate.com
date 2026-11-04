import { describe, it, expect } from 'vitest';
import {
  IDLE, MAX_MS, MIN_VISIBLE_MS, QUIET_MS, SHOW_DELAY_MS,
  isBusy, navReducer, shouldShow, type NavEvent, type NavPhase,
} from './navActivity';

const run = (events: NavEvent[], from: NavPhase = IDLE) => events.reduce(navReducer, from);

describe('navReducer', () => {
  it('is busy from the tap until the next page is showing', () => {
    const navigating = run([{ type: 'start', at: 0 }]);
    expect(isBusy(navigating)).toBe(true);
    const shown = navReducer(navigating, { type: 'shown', at: 300, fetching: 0 });
    expect(isBusy(shown)).toBe(false);
  });

  it('stays busy while the new page fetches its data', () => {
    const fetching = run([
      { type: 'start', at: 0 },
      { type: 'shown', at: 50, fetching: 0 },
      { type: 'fetching', at: 60, count: 2 },
    ]);
    expect(isBusy(fetching)).toBe(true);
    const done = navReducer(fetching, { type: 'fetching', at: 900, count: 0 });
    expect(isBusy(done)).toBe(false);
    expect(done.kind).toBe('settling');
    expect(navReducer(done, { type: 'tick', at: 900 + QUIET_MS }).kind).toBe('idle');
  });

  it('counts a fetch that starts just after the page appears', () => {
    const phase = run([
      { type: 'start', at: 0 },
      { type: 'shown', at: 50, fetching: 0 },
      { type: 'tick', at: 50 + QUIET_MS - 1 },
      { type: 'fetching', at: 50 + QUIET_MS - 1, count: 1 },
    ]);
    expect(isBusy(phase)).toBe(true);
  });

  it('ignores fetches once the page has settled (polling, live updates)', () => {
    const settled = run([
      { type: 'shown', at: 0, fetching: 0 },
      { type: 'tick', at: QUIET_MS },
    ]);
    expect(settled).toEqual(IDLE);
    expect(navReducer(settled, { type: 'fetching', at: 5000, count: 3 })).toEqual(IDLE);
  });

  it('keeps the first start time when tapping again mid-load', () => {
    const phase = run([{ type: 'start', at: 0 }, { type: 'start', at: 80 }]);
    expect(phase).toEqual({ kind: 'navigating', since: 0 });
  });

  it('gives up on a page that never stops fetching', () => {
    const phase = run([{ type: 'start', at: 0 }, { type: 'shown', at: 10, fetching: 1 }]);
    expect(navReducer(phase, { type: 'tick', at: MAX_MS }).kind).toBe('idle');
  });
});

describe('shouldShow', () => {
  const navigating: NavPhase = { kind: 'navigating', since: 0 };

  it('waits out a short delay, so an instant page change never flashes a circle', () => {
    expect(shouldShow(navigating, SHOW_DELAY_MS - 1, null)).toBe(false);
    expect(shouldShow(navigating, SHOW_DELAY_MS, null)).toBe(true);
  });

  it('stays up for a minimum time once shown, so it never blinks', () => {
    expect(shouldShow(IDLE, 150 + MIN_VISIBLE_MS - 1, 150)).toBe(true);
    expect(shouldShow(IDLE, 150 + MIN_VISIBLE_MS, 150)).toBe(false);
  });

  it('is hidden while the page is waiting out its quiet period', () => {
    const quiet: NavPhase = { kind: 'settling', since: 0, quietSince: 500 };
    expect(shouldShow(quiet, 520, null)).toBe(false);
  });
});
