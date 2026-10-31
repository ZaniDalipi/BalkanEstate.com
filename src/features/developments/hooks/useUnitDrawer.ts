import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { navigate, goBack } from '@/src/app/router/navigation';

export const UNIT_PARAM = 'unit';
/** History-state marker: this entry was pushed by `open()`, so Back closes the drawer. */
const DRAWER_STATE = 'beUnitDrawer';

/**
 * The live query string. Filters are mirrored with `replaceState` (outside the
 * router), so the address bar can be ahead of the router's location — read the
 * real one whenever it is for the same page.
 */
const liveParams = (pathname: string, routerSearch: string): URLSearchParams =>
  typeof window !== 'undefined' && window.location.pathname === pathname
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams(routerSearch);

const withUnit = (pathname: string, params: URLSearchParams, unitId: string | null): string => {
  const p = new URLSearchParams(params);
  if (unitId) p.set(UNIT_PARAM, unitId);
  else p.delete(UNIT_PARAM);
  const qs = p.toString();
  return `${pathname}${qs ? `?${qs}` : ''}`;
};

/**
 * The unit details drawer, driven by `?unit=<id>`. Opening pushes a history
 * entry so the browser's Back button (or a phone's back gesture) closes the
 * drawer instead of leaving the page; a deep link `?unit=` opens it directly,
 * and closing that one replaces the entry rather than leaving the site.
 */
export function useUnitDrawer() {
  const location = useLocation();
  const unitId = new URLSearchParams(location.search).get(UNIT_PARAM);
  const pushedByUs = !!(location.state as Record<string, unknown> | null)?.[DRAWER_STATE];

  const open = useCallback(
    (id: string) => {
      const params = liveParams(location.pathname, location.search);
      const alreadyOpen = !!params.get(UNIT_PARAM);
      navigate(withUnit(location.pathname, params, id), {
        // Switching unit inside an open drawer must not stack entries.
        replace: alreadyOpen,
        state: { [DRAWER_STATE]: alreadyOpen ? pushedByUs : true },
      });
    },
    [location.pathname, location.search, pushedByUs]
  );

  const close = useCallback(() => {
    const target = withUnit(location.pathname, liveParams(location.pathname, location.search), null);
    if (pushedByUs) goBack(target);
    else navigate(target, { replace: true });
  }, [location.pathname, location.search, pushedByUs]);

  return { unitId, isOpen: !!unitId, open, close };
}
