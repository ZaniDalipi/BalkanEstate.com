import { useCallback, useState } from 'react';
import type { RegionDisplayMode } from './regionPaint';

const KEY = 'be.explorer.displayMode';

const read = (): RegionDisplayMode => {
  try {
    return window.localStorage.getItem(KEY) === 'availability' ? 'availability' : 'clean';
  } catch {
    return 'clean';
  }
};

/** The explorer's region display mode, remembered per browser (a convenience only). */
export function useDisplayMode(): [RegionDisplayMode, (m: RegionDisplayMode) => void] {
  const [mode, setModeState] = useState<RegionDisplayMode>(() => (typeof window === 'undefined' ? 'clean' : read()));
  const setMode = useCallback((m: RegionDisplayMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(KEY, m);
    } catch {
      // Storage unavailable (private mode): the choice just isn't remembered.
    }
  }, []);
  return [mode, setMode];
}
