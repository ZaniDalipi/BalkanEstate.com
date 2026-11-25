import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { navigate, goBack } from '@/src/app/router/navigation';
import { canNavigateBack } from '@/src/app/navigation/navHistory';
import { parsePhotoParam, withPhotoParam, PHOTO_VIEWER_PUSHED } from '../utils/photoParam';

/**
 * The full-screen photo viewer driven by the URL (`?photo=N`). Opening adds a
 * history entry (Back closes the viewer); paging between photos replaces it,
 * so Back does not walk through every photo. The route state (e.g. the listing
 * a card handed over) is kept so the page never refetches.
 */
export function usePhotoViewerUrl(photoCount: number) {
  const { pathname, search, hash, state } = useLocation();
  const photoIndex = parsePhotoParam(search, photoCount);
  const routeState = useMemo(
    () => (state && typeof state === 'object' ? (state as Record<string, unknown>) : {}),
    [state],
  );

  const go = useCallback(
    (index: number | null, replace: boolean, nextState: Record<string, unknown>) =>
      navigate(`${pathname}${withPhotoParam(search, index)}${hash}`, { inPage: true, replace, state: nextState }),
    [pathname, search, hash],
  );

  const open = useCallback(
    (index: number) => go(index, false, { ...routeState, [PHOTO_VIEWER_PUSHED]: true }),
    [go, routeState],
  );

  const show = useCallback(
    (index: number) => {
      if (index !== photoIndex) go(index, true, routeState);
    },
    [go, photoIndex, routeState],
  );

  const close = useCallback(() => {
    if (routeState[PHOTO_VIEWER_PUSHED] && canNavigateBack()) {
      goBack(`${pathname}${withPhotoParam(search, null)}${hash}`);
      return;
    }
    // Arrived on a photo link: nothing of ours to step back to. Keep the route
    // state so the listing handed over by a card is not fetched again.
    const rest = { ...routeState };
    delete rest[PHOTO_VIEWER_PUSHED];
    go(null, true, rest);
  }, [routeState, pathname, search, hash, go]);

  return { photoIndex, open, show, close };
}
