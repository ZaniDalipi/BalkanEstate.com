import { useEffect, useState } from 'react';

/**
 * The current time, ticking every `intervalMs` (and only while mounted).
 * Pass `null` to stop ticking.
 */
export function useNow(intervalMs: number | null = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (intervalMs == null) return undefined;
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
