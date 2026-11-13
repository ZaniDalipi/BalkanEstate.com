/**
 * The thumb rail's preferences, and how a stored copy is read back.
 *
 * Device storage is a system boundary: what comes back may be from an older
 * version, edited by hand, or damaged. Each field is checked on its own, so
 * one bad value falls back to its default without losing the other.
 */

export type RailSide = 'left' | 'right';
/** always: a thin rail stays on the edge · scroll: it steps aside while scrolling · hidden: only a small tab. */
export type RailVisibility = 'always' | 'scroll' | 'hidden';

export interface NavPrefs {
  side: RailSide;
  visibility: RailVisibility;
}

export const DEFAULT_NAV_PREFS: NavPrefs = { side: 'right', visibility: 'always' };

const SIDES: readonly RailSide[] = ['left', 'right'];
const VISIBILITIES: readonly RailVisibility[] = ['always', 'scroll', 'hidden'];

export const isRailSide = (v: unknown): v is RailSide => SIDES.includes(v as RailSide);
export const isRailVisibility = (v: unknown): v is RailVisibility => VISIBILITIES.includes(v as RailVisibility);

/** Valid preferences from whatever storage returned; unknown or bad fields get their default. */
export const readNavPrefs = (stored: unknown): NavPrefs => {
  const s = typeof stored === 'object' && stored !== null ? (stored as Record<string, unknown>) : {};
  return {
    side: isRailSide(s.side) ? s.side : DEFAULT_NAV_PREFS.side,
    visibility: isRailVisibility(s.visibility) ? s.visibility : DEFAULT_NAV_PREFS.visibility,
  };
};
