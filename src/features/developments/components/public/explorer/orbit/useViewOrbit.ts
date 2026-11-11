import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicSceneView } from '../../../../types';
import { orbitDirection, type OrbitDir } from './orbitDirection';
import { FADE, sceneMove, type SceneMove } from './sceneMove';
import { preloadViewPicture } from './viewSources';

/**
 * Moving between the explorer's pictures as one camera: switching camera views
 * circles the building, switching floors rides the elevator, entering a floor
 * zooms in (see `sceneMove`). `switchTo` first makes sure the next camera
 * view's picture is downloaded and decoded (the neighbours of the current view
 * preload in the background), then switches, swinging the way the buyer
 * pressed (← / →); a link or Back goes the short way round. `level` is the
 * floor's level while a floor is on show.
 */
export function useViewOrbit(views: PublicSceneView[], viewIndex: number, targetKey: string, onViewIndex: (i: number) => void, level?: number) {
  const viewKey = views[viewIndex]?.viewKey ?? '';
  const [move, setMove] = useState<SceneMove>(FADE);
  const [asked, setAsked] = useState<{ key: string; dir: OrbitDir } | null>(null);
  const [shown, setShown] = useState({ viewKey, targetKey, index: viewIndex, level });
  const request = useRef(0);

  // A new picture is on show: work out how the camera got there (adjusting state as the view changes).
  if (shown.viewKey !== viewKey || shown.targetKey !== targetKey) {
    const way = asked?.key === viewKey && shown.targetKey === targetKey ? asked.dir : undefined;
    setMove(sceneMove({ ...shown, count: views.length }, { targetKey, index: viewIndex, level, count: views.length }, way));
    setShown({ viewKey, targetKey, index: viewIndex, level });
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

  return { move, switchTo };
}
