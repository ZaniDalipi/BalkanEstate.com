import { HINTS, type HintDef, type HintPage } from './hintCatalog';
import { hintFitsDevice, type DeviceTraits } from './hintDevice';

/** At least this long between two tips that show up on their own. */
export const HINT_COOLDOWN_MS = 4 * 60 * 1000;
/** At most this many tips show up on their own per visit. */
export const MAX_AUTO_HINTS_PER_VISIT = 2;

/** The tips for a page that fit this device: the page's own first, then the global ones. */
export function hintsFor(page: HintPage, device: DeviceTraits, catalog: readonly HintDef[] = HINTS): HintDef[] {
  const fits = catalog.filter((h) => hintFitsDevice(h, device));
  const own = page === 'global' ? [] : fits.filter((h) => h.page === page);
  return [...own, ...fits.filter((h) => h.page === 'global')];
}

export interface PickHintInput {
  page: HintPage;
  device: DeviceTraits;
  enabled: boolean;
  seen: readonly string[];
  /** When the last tip showed up on its own (ms), or null. */
  lastShownAt: number | null;
  /** Tips that showed up on their own during this visit. */
  shownThisVisit: number;
  now: number;
  catalog?: readonly HintDef[];
}

/**
 * The tip to show on its own now, or null. Quiet by design: never when tips are
 * off, never twice the same tip, never sooner than the cooldown after the last
 * one, and only a couple per visit. Everything stays in the Tips panel.
 */
export function pickHint(input: PickHintInput): HintDef | null {
  const { page, device, enabled, seen, lastShownAt, shownThisVisit, now, catalog = HINTS } = input;
  if (!enabled) return null;
  if (shownThisVisit >= MAX_AUTO_HINTS_PER_VISIT) return null;
  if (lastShownAt !== null && now - lastShownAt < HINT_COOLDOWN_MS) return null;
  const seenIds = new Set(seen);
  return hintsFor(page, device, catalog).find((h) => !seenIds.has(h.id)) ?? null;
}
