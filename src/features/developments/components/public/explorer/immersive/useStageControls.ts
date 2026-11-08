import { useState } from 'react';
import type React from 'react';
import { usePseudoFullscreen } from '../usePseudoFullscreen';
import { useDisplayMode } from '../useDisplayMode';

/**
 * What every explorer stage layout shares: full screen, the filters panel,
 * the region display mode, and ←/→ switching camera views.
 */
export function useStageControls(views: number, viewIndex: number, onViewIndex: (i: number) => void) {
  const fs = usePseudoFullscreen<HTMLElement>();
  const [showFilters, setShowFilters] = useState(false);
  const [mode, setMode] = useDisplayMode();

  const onKeyDown = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || views < 2) return;
    if (e.key === 'ArrowRight') onViewIndex((viewIndex + 1) % views);
    else if (e.key === 'ArrowLeft') onViewIndex((viewIndex - 1 + views) % views);
  };

  return { fs, showFilters, setShowFilters, mode, setMode, onKeyDown };
}
