import { useState } from 'react';
import type React from 'react';
import type { PublicSceneView } from '../../../../types';
import { usePseudoFullscreen } from '../usePseudoFullscreen';
import { useDisplayMode } from '../useDisplayMode';
import { useViewOrbit } from '../orbit/useViewOrbit';

/**
 * What every explorer stage layout shares: full screen, the filters panel,
 * the region display mode, and switching camera views (the arrows, the dots,
 * ←/→) as one camera circling the building (`orbit`). `targetKey` names what
 * the views are of (the residence, a building, a floor); `level` is the
 * floor's, so moving between floors rides the elevator.
 */
export function useStageControls(views: PublicSceneView[], viewIndex: number, onViewIndex: (i: number) => void, targetKey: string, level?: number) {
  const fs = usePseudoFullscreen<HTMLElement>();
  const [showFilters, setShowFilters] = useState(false);
  const [mode, setMode] = useDisplayMode();
  const orbit = useViewOrbit(views, viewIndex, targetKey, onViewIndex, level);
  const n = views.length;

  const onKeyDown = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || n < 2) return;
    if (e.key === 'ArrowRight') orbit.switchTo((viewIndex + 1) % n, 1);
    else if (e.key === 'ArrowLeft') orbit.switchTo((viewIndex - 1 + n) % n, -1);
  };

  return { fs, showFilters, setShowFilters, mode, setMode, onKeyDown, orbit };
}
