import { useEffect, useMemo } from 'react';
import { useRouteView } from '@/src/app/router/useRouteView';
import { hintPageFor } from '../utils/hintPage';
import { pickHint } from '../utils/pickHint';
import { readDeviceTraits } from '../utils/hintDevice';
import { otherLayerOpen } from '../utils/otherLayerOpen';
import { useHintsStore } from './hintsStore';

/** Wait this long on a page before a tip shows up, so it never greets a loading screen. */
export const HINT_DELAY_MS = 3500;
/** A tip leaves on its own after this long. */
export const HINT_VISIBLE_MS = 10000;
/** While another dialog is open, look again this often. */
export const HINT_RETRY_MS = 5000;

/**
 * Shows a tip on its own now and then: a few seconds after a page opens, if
 * pickHint allows one and no other dialog is open, and hides it again after
 * a while.
 */
export function useAutoHint(): void {
  const { view, detail, pageKey } = useRouteView();
  const page = hintPageFor(view, detail);
  const currentId = useHintsStore((s) => s.currentId);
  const panelOpen = useHintsStore((s) => s.panelOpen);
  const device = useMemo(readDeviceTraits, []);

  useEffect(() => {
    let timer = 0;
    const attempt = () => {
      const s = useHintsStore.getState();
      if (s.panelOpen || s.currentId) return;
      if (otherLayerOpen()) {
        timer = window.setTimeout(attempt, HINT_RETRY_MS);
        return;
      }
      const now = Date.now();
      const next = pickHint({ page, device, enabled: s.enabled, seen: s.seen, lastShownAt: s.lastShownAt, shownThisVisit: s.shownThisVisit, now });
      if (next) s.show(next.id, now);
    };
    timer = window.setTimeout(attempt, HINT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [page, pageKey, device]);

  // A tip belongs to the page it was shown on.
  useEffect(() => () => useHintsStore.getState().hide(), [pageKey]);

  useEffect(() => {
    if (!currentId || panelOpen) return undefined;
    const timer = window.setTimeout(() => useHintsStore.getState().hide(), HINT_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [currentId, panelOpen]);
}
