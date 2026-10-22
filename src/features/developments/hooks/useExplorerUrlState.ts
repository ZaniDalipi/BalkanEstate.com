import { useCallback, useEffect, useRef, useState } from 'react';
import { replaceQueryString } from '@/src/app/router/navigation';
import { useDebouncedValue } from './useDebouncedValue';
import { UNIT_AVAILABILITY_STATES, type UnitAvailability } from '../types';
import { EMPTY_CRITERIA, UNIT_FLAGS, type UnitCriteria, type UnitFlag } from '../utils/unitFilters';

/** Where the explorer is looking: residence (none set) → building → floor, plus the camera view. */
export interface ExplorerNav {
  building?: string;
  floor?: string;
  view?: string;
}

export interface ExplorerUrlState {
  criteria: UnitCriteria;
  nav: ExplorerNav;
}

/** Every query param this hook owns; anything else in the URL (e.g. `unit`) is left alone. */
export const EXPLORER_PARAM_KEYS = [
  'beds', 'baths', 'type', 'feat', 'av', 'or', 'flags', 'area', 'floor', 'price', 'b', 'f', 'v',
] as const;

const list = (p: URLSearchParams, key: string): string[] =>
  (p.get(key) ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const ints = (p: URLSearchParams, key: string): number[] =>
  list(p, key).map(Number).filter((n) => Number.isInteger(n) && n >= 0);
const num = (raw: string | undefined): number | undefined => {
  if (raw == null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};
/** `lo~hi`, either side optional (`~` because floor levels can be negative). */
const range = (p: URLSearchParams, key: string): [number | undefined, number | undefined] => {
  const raw = p.get(key);
  if (!raw) return [undefined, undefined];
  const [lo, hi] = raw.split('~');
  return [num(lo), num(hi)];
};

/** Parse the explorer's filters and navigation from a query string. Unknown values are dropped. */
export function parseExplorerSearch(search: string): ExplorerUrlState {
  const p = new URLSearchParams(search);
  const [minArea, maxArea] = range(p, 'area');
  const [minLevel, maxLevel] = range(p, 'floor');
  const [minPrice, maxPrice] = range(p, 'price');
  const criteria: UnitCriteria = {
    ...EMPTY_CRITERIA,
    beds: ints(p, 'beds'),
    baths: ints(p, 'baths'),
    types: list(p, 'type'),
    features: list(p, 'feat'),
    availability: list(p, 'av').filter((s): s is UnitAvailability =>
      (UNIT_AVAILABILITY_STATES as readonly string[]).includes(s)
    ),
    orientations: list(p, 'or'),
    flags: list(p, 'flags').filter((s): s is UnitFlag => (UNIT_FLAGS as readonly string[]).includes(s)),
    minArea, maxArea, minLevel, maxLevel, minPrice, maxPrice,
  };
  const nav: ExplorerNav = {
    building: p.get('b') || undefined,
    floor: p.get('f') || undefined,
    view: p.get('v') || undefined,
  };
  return { criteria, nav };
}

/** Write the state onto `base` (a query string), preserving params this hook does not own. */
export function buildExplorerSearch({ criteria: c, nav }: ExplorerUrlState, base = ''): string {
  const p = new URLSearchParams(base);
  EXPLORER_PARAM_KEYS.forEach((k) => p.delete(k));
  const setList = (key: string, xs?: ReadonlyArray<string | number>) => {
    if (xs && xs.length) p.set(key, xs.join(','));
  };
  const setRange = (key: string, lo?: number, hi?: number) => {
    if (lo != null || hi != null) p.set(key, `${lo ?? ''}~${hi ?? ''}`);
  };
  setList('beds', c.beds);
  setList('baths', c.baths);
  setList('type', c.types);
  setList('feat', c.features);
  setList('av', c.availability);
  setList('or', c.orientations);
  setList('flags', c.flags);
  setRange('area', c.minArea, c.maxArea);
  setRange('floor', c.minLevel, c.maxLevel);
  setRange('price', c.minPrice, c.maxPrice);
  if (nav.building) p.set('b', nav.building);
  if (nav.floor) p.set('f', nav.floor);
  if (nav.view) p.set('v', nav.view);
  return p.toString();
}

const currentSearch = () => (typeof window === 'undefined' ? '' : window.location.search);

/**
 * Explorer filters + navigation, mirrored into the query string so a reload or
 * a shared link lands on the same view. React state is the source of truth and
 * updates immediately; the URL follows 300 ms later with `replaceState` (no
 * history entry per slider tick, no routing pass). Shared by the explorer and
 * the unit grid so both always show the same selection.
 */
export function useExplorerUrlState(delayMs = 300) {
  const [state, setState] = useState<ExplorerUrlState>(() => parseExplorerSearch(currentSearch()));
  const debounced = useDebouncedValue(state, delayMs);
  const latest = useRef(debounced);
  latest.current = debounced;

  useEffect(() => {
    const next = buildExplorerSearch(debounced, currentSearch());
    if (next !== currentSearch().replace(/^\?/, '')) replaceQueryString(next);
  }, [debounced]);

  // Back/forward (e.g. closing the unit drawer) lands on an entry whose query
  // was written earlier; re-stamp the current selection so the URL never lies.
  useEffect(() => {
    const onPop = () =>
      setTimeout(() => {
        const next = buildExplorerSearch(latest.current, currentSearch());
        if (next !== currentSearch().replace(/^\?/, '')) replaceQueryString(next);
      }, 0);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setCriteria = useCallback(
    (criteria: UnitCriteria) => setState((s) => ({ ...s, criteria })),
    []
  );
  const setNav = useCallback((nav: ExplorerNav) => setState((s) => ({ ...s, nav })), []);

  return { criteria: state.criteria, nav: state.nav, setCriteria, setNav };
}
