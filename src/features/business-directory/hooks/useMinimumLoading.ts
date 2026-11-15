import { useEffect, useState } from 'react';

/**
 * Loading, held on for at least `minMs` each time `key` changes, so a switch
 * (tab, category, page) always shows its loading state, even when the answer
 * was cached and arrives at once. Computed during render, so the new results
 * never flash in for a frame before the hold starts.
 */
export function useMinimumLoading(key: string, loading: boolean, minMs = 350): boolean {
  const [settledKey, setSettledKey] = useState(key);
  useEffect(() => {
    if (key === settledKey) return undefined;
    const id = window.setTimeout(() => setSettledKey(key), minMs);
    return () => window.clearTimeout(id);
  }, [key, settledKey, minMs]);
  return loading || key !== settledKey;
}
