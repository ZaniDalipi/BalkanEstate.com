/**
 * When to show the "loading" circle for a page change — pure, so it can be
 * tested without rendering.
 *
 * A page change is loading in two stages, and the circle covers both:
 *
 *  1. `navigating` — the router has moved but the next page is not on screen
 *     yet (its code is still downloading). The old page stays up meanwhile.
 *  2. `settling` — the new page is on screen and fetching its data (a listing
 *     opened from a link, a list gone stale while the user was away and now
 *     refreshing on the way back). It ends once nothing has been fetching for
 *     `QUIET_MS`, so a part of the page that starts its own fetch a moment
 *     later (a lazily loaded section) is still counted, while polling that
 *     runs long after the page has loaded is not.
 *
 * Nothing shows for a change that finishes within `SHOW_DELAY_MS`: a circle
 * that appears for a few frames is a flicker, not progress. Once shown, it
 * stays at least `MIN_VISIBLE_MS` so it never blinks.
 */

export const SHOW_DELAY_MS = 100;
export const MIN_VISIBLE_MS = 400;
export const QUIET_MS = 150;
/** Give up on a page that keeps fetching (live updates, a stuck request). */
export const MAX_MS = 15_000;

export type NavPhase =
  | { kind: 'idle' }
  | { kind: 'navigating'; since: number }
  /** `quietSince`: when fetching last stopped; null while something is fetching. */
  | { kind: 'settling'; since: number; quietSince: number | null };

export type NavEvent =
  /** The router moved to a location that is not on screen yet. */
  | { type: 'start'; at: number }
  /** The new page has been committed to the screen. */
  | { type: 'shown'; at: number; fetching: number }
  /** The number of requests in flight changed. */
  | { type: 'fetching'; at: number; count: number }
  /** Time passed. */
  | { type: 'tick'; at: number };

export const IDLE: NavPhase = { kind: 'idle' };

export function navReducer(phase: NavPhase, event: NavEvent): NavPhase {
  switch (event.type) {
    case 'start':
      // A second tap while the first is still loading keeps the first start
      // time, so the circle does not wait out its delay all over again.
      return { kind: 'navigating', since: phase.kind === 'idle' ? event.at : phase.since };
    case 'shown': {
      const since = phase.kind === 'idle' ? event.at : phase.since;
      return { kind: 'settling', since, quietSince: event.fetching > 0 ? null : event.at };
    }
    case 'fetching':
      if (phase.kind !== 'settling') return phase;
      if (event.count > 0) return phase.quietSince === null ? phase : { ...phase, quietSince: null };
      return phase.quietSince === null ? { ...phase, quietSince: event.at } : phase;
    case 'tick':
      if (phase.kind === 'idle') return phase;
      if (event.at - phase.since >= MAX_MS) return IDLE;
      if (phase.kind === 'settling' && phase.quietSince !== null && event.at - phase.quietSince >= QUIET_MS) return IDLE;
      return phase;
  }
}

/** Whether something is loading right now. */
export function isBusy(phase: NavPhase): boolean {
  return phase.kind === 'navigating' || (phase.kind === 'settling' && phase.quietSince === null);
}

/**
 * Whether the circle should be on screen at `now`, given when it was last
 * shown (`visibleSince`, null when hidden).
 */
export function shouldShow(phase: NavPhase, now: number, visibleSince: number | null): boolean {
  if (visibleSince !== null && now - visibleSince < MIN_VISIBLE_MS) return true;
  if (!isBusy(phase) || phase.kind === 'idle') return false;
  return now - phase.since >= SHOW_DELAY_MS;
}
