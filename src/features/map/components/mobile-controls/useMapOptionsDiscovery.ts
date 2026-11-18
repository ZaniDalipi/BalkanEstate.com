import { useCallback, useState } from 'react';
import { getSafeLocalStorage, hasOpenedMapOptions, markMapOptionsOpened } from '../../utils/mapOptionsSeen';

/**
 * Whether the "Map options" button should still draw attention (it has never
 * been opened on this device). `markOpened` stops the pulse for good.
 */
export function useMapOptionsDiscovery() {
  const [isNew, setIsNew] = useState(() => !hasOpenedMapOptions(getSafeLocalStorage()));
  const markOpened = useCallback(() => {
    setIsNew(false);
    markMapOptionsOpened(getSafeLocalStorage());
  }, []);
  return { isNew, markOpened };
}
