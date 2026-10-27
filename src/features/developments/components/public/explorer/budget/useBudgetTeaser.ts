import { useEffect, useState } from 'react';

const STORAGE_KEY = 'be:budgetTeaserDismissed';
/** Let the buyer look at the picture first. */
const TEASER_DELAY_MS = 3500;

const readDismissed = (): boolean => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false; // storage blocked (private mode, previews): just show it
  }
};

/**
 * The "What's your budget?" teaser bubble: appears a few seconds after the
 * explorer opens, once per browser session. Dismissing it is remembered for
 * the session; opening the helper hides it too.
 */
export function useBudgetTeaser(enabled: boolean) {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [due, setDue] = useState(false);

  useEffect(() => {
    if (!enabled || dismissed) return undefined;
    const timer = setTimeout(() => setDue(true), TEASER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enabled, dismissed]);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* remembered for this page view only */
    }
  };

  return { visible: enabled && due && !dismissed, dismiss };
}
