import { useCallback, useEffect, useState } from 'react';
import { getSafeLocalStorage, hasSeenLayersHint, markLayersHintSeen } from '../../utils/layersHintStorage';

/** Wait before showing the hint, so it doesn't land on top of the map's first paint. */
export const HINT_DELAY_MS = 900;
/** Long enough to read; then it gets out of the way by itself. */
export const HINT_VISIBLE_MS = 7000;

/**
 * First-visit hint pointing at the phone Layers button. Shown once (remembered
 * in storage when it can be), hidden for good as soon as the sheet is opened,
 * dismissed, or it times out. `suppressed` (sheet open, drawing) hides it.
 */
export function useLayersHint(suppressed: boolean) {
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    markLayersHintSeen(getSafeLocalStorage());
  }, []);

  useEffect(() => {
    if (suppressed || hasSeenLayersHint(getSafeLocalStorage())) return undefined;
    const show = window.setTimeout(() => setVisible(true), HINT_DELAY_MS);
    return () => window.clearTimeout(show);
  }, [suppressed]);

  useEffect(() => {
    if (!visible) return undefined;
    const hide = window.setTimeout(dismiss, HINT_VISIBLE_MS);
    return () => window.clearTimeout(hide);
  }, [visible, dismiss]);

  // Opening the sheet (or starting to draw) means they found it.
  useEffect(() => {
    if (suppressed && visible) dismiss();
  }, [suppressed, visible, dismiss]);

  return { visible: visible && !suppressed, dismiss };
}
