import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SWITCH_SURVIVE_MS,
  clearSwitchMarker,
  consumeSwitchCrash,
  getMarkerStorage,
  markSwitchStart,
} from '../utils/viewSwitchGuard';

/**
 * Notice that the last page died during a List / Map switch, and mark the
 * switches of this one so the next load can tell (see `viewSwitchGuard`).
 *
 * `recovered` is decided once, on the first render, and never changes: it says
 * "open in the lighter mode", not "the page is currently unhealthy".
 * `beginSwitch` is called when the visitor taps the switch; until then a
 * recovered page opens on the list, not on the heavier map.
 */
export function useViewSwitchGuard(): { recovered: boolean; switched: boolean; beginSwitch: () => void } {
  const [recovered] = useState(() => consumeSwitchCrash(getMarkerStorage(), Date.now()));
  // Once the visitor has chosen a view themselves, a recovered page obeys it.
  const [switched, setSwitched] = useState(false);
  const surviveTimer = useRef<number | null>(null);

  const stopTimer = () => {
    if (surviveTimer.current !== null) {
      window.clearTimeout(surviveTimer.current);
      surviveTimer.current = null;
    }
  };

  const beginSwitch = useCallback(() => {
    setSwitched(true);
    const storage = getMarkerStorage();
    markSwitchStart(storage, Date.now());
    stopTimer();
    surviveTimer.current = window.setTimeout(() => {
      surviveTimer.current = null;
      clearSwitchMarker(storage);
    }, SWITCH_SURVIVE_MS);
  }, []);

  // Leaving the page is not a crash: it must not leave a marker behind.
  useEffect(() => () => {
    stopTimer();
    clearSwitchMarker(getMarkerStorage());
  }, []);

  return { recovered, switched, beginSwitch };
}

export default useViewSwitchGuard;
