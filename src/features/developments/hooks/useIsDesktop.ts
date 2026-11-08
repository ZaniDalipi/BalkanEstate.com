import { useEffect, useState } from 'react';

const QUERY = '(min-width: 768px)';

/** Tablet and up: the apartment details open as a column beside a stage, not as a bottom sheet. */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq?.addEventListener) return undefined;
    const on = () => setDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}
