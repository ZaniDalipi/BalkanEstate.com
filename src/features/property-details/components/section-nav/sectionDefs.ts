// The property page's bookmarkable sections, and how to find them in the DOM.
// Shared by every presentation of the "On this page" menu (chip bar, desktop
// dash rail, mobile thumb rail).

import type { SoftIconName } from '@/src/shared/illustrations';

export interface SectionDef {
  /** Matches the data-section attribute on the target element ('top' = page top) */
  key: string;
  labelKey: string;
  fallback: string;
  icon: SoftIconName;
}

/** A section as shown in a menu: its definition plus the translated label. */
export interface NavSection extends SectionDef {
  label: string;
}

// Only the starting order: once the page is laid out, the menu follows where
// each section really is (see sectionPositions.ts).
export const SECTION_DEFS: readonly SectionDef[] = [
  { key: 'top', labelKey: 'property:sectionNav.overview', fallback: 'Overview', icon: 'info' },
  { key: 'details', labelKey: 'property:sectionNav.details', fallback: 'Details', icon: 'clipboard' },
  { key: 'neighborhood', labelKey: 'property:sectionNav.neighborhood', fallback: 'Neighborhood', icon: 'houses' },
  { key: 'air-quality', labelKey: 'property:sectionNav.airQuality', fallback: 'Air Quality', icon: 'leaf' },
  { key: 'noise', labelKey: 'property:sectionNav.noise', fallback: 'Noise', icon: 'mic' },
  { key: 'traffic', labelKey: 'property:sectionNav.traffic', fallback: 'Traffic', icon: 'car' },
  { key: 'availability', labelKey: 'property:sectionNav.availability', fallback: 'Availability', icon: 'calendar' },
  { key: 'map', labelKey: 'property:sectionNav.map', fallback: '3D Map', icon: 'mapGrid' },
  { key: 'calculators', labelKey: 'property:sectionNav.calculators', fallback: 'Calculators', icon: 'calculator' },
  { key: 'price-history', labelKey: 'property:sectionNav.priceHistory', fallback: 'Price History', icon: 'chart' },
  { key: 'area-prices', labelKey: 'property:sectionNav.areaPrices', fallback: 'Area Prices', icon: 'pin' },
  { key: 'zone-dynamics', labelKey: 'property:sectionNav.zoneDynamics', fallback: 'Zone Dynamics', icon: 'scales' },
  { key: 'similar', labelKey: 'property:sectionNav.similar', fallback: 'Similar Homes', icon: 'home' },
];

/**
 * Returns the first on-screen-rendered element matching the section key.
 * `PropertyContact` / `PropertyInfo` are rendered twice (mobile + desktop) —
 * only one is laid out, so we pick the element whose `offsetParent` is non-null.
 */
export const findTarget = (key: string): HTMLElement | null => {
  if (key === 'top') return null;
  if (typeof document === 'undefined') return null;
  try {
    const sel = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(key) : key;
    const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-section="${sel}"]`));
    return els.find((el) => el.offsetParent !== null) || els[0] || null;
  } catch {
    return null;
  }
};

/**
 * The property page scrolls inside an `overflow-y-auto` container (not the
 * window), so "scroll to top" must target that element. Walk up from a known
 * section to find the nearest scrollable ancestor; fall back to the window.
 */
export const getScrollContainer = (): HTMLElement | Window => {
  if (typeof document === 'undefined') return window;
  let el: HTMLElement | null =
    findTarget('details') || document.querySelector<HTMLElement>('[data-section]');
  while (el) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    el = el.parentElement;
  }
  return window;
};

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
