import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicSceneView } from '../../../../types';
import { orbitDirection, type OrbitDir } from './orbitDirection';
import { preloadViewPicture } from './viewSources';

/**
 * Switching camera views as one camera circling one building. `switchTo`
 * first makes sure the next picture is downloaded and decoded (the neighbours
 * of the current view preload in the background), then switches; `dir` says
 * which way to swing: the way the buyer pressed (← / →), else the short way
 * round (a link, Back, the budget helper's trip). A different building or the
 * residence (`targetKey`) is no orbit: it fades.
 */
export function useViewOrbit(views: PublicSceneView[], viewIndex: number, targetKey: string, onViewIndex: (i: number) => void) {
  const viewKey = views[viewIndex]?.viewKey ?? '';
  const [dir, setDir] = useState<OrbitDir>(0);
  const [asked, setAsked] = useState<{ key: string; dir: OrbitDir } | null>(null);
  const [shown, setShown] = useState({ viewKey, targetKey, index: viewIndex });
  const request = useRef(0);

  // A new view is on show: work out which way the camera went (adjusting state as the view changes).
  if (shown.viewKey !== viewKey || shown.targetKey !== targetKey) {
    const sameBuilding = shown.targetKey === targetKey;
    setDir(!sameBuilding ? 0 : asked?.key === viewKey ? asked.dir : orbitDirection(shown.index, viewIndex, views.length));
    setShown({ viewKey, targetKey, index: viewIndex });
    setAsked(null);
  }

  const switchTo = useCallback(
    (index: number, step?: number) => {
      const next = views[index];
      if (!next || index === viewIndex) return;
      const way: OrbitDir = step ? (Math.sign(step) as OrbitDir) : orbitDirection(viewIndex, index, views.length);
      const ticket = ++request.current;
      void preloadViewPicture(next.imageUrl).then(() => {
        if (ticket !== request.current) return; // the buyer asked for another view meanwhile
        setAsked({ key: next.viewKey, dir: way });
        onViewIndex(index);
      });
    },
    [views, viewIndex, onViewIndex]
  );

  // The views either side load quietly, so the next swing never waits.
  useEffect(() => {
    if (views.length < 2) return undefined;
    const warm = () =>
      [1, -1].forEach((step) => {
        const v = views[(viewIndex + step + views.length) % views.length];
        if (v) void preloadViewPicture(v.imageUrl);
      });
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(warm, 800);
    return () => window.clearTimeout(timer);
  }, [views, viewIndex]);

  useEffect(
    () => () => {
      request.current += 1;
    },
    []
  );

  return { dir, switchTo };
}
