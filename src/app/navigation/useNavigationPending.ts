import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { onRouteChange, routerLocationKey } from '@/src/app/router/navigation';

/**
 * Whether a navigation has started but its page is not on screen yet.
 *
 * React Router renders each navigation as a React transition, and the page
 * Suspense boundary is already showing the current page, so React keeps that
 * page up while the next one's code (or suspended data) loads instead of
 * blanking it. That is what stops the flash between pages — but on a slow
 * phone network it also means a tap can look ignored. This reports `true` once
 * the wait has lasted `delayMs`, so a small spinner can acknowledge the tap;
 * fast navigations never see it.
 */
export function useNavigationPending(delayMs = 150): boolean {
  // Inside the router tree this is the committed location — the page showing.
  const { key } = useLocation();
  const shownKey = useRef(key);
  const [pending, setPending] = useState(false);

  useLayoutEffect(() => {
    shownKey.current = key;
    setPending(false);
  }, [key]);

  useEffect(() => {
    let timer = 0;
    const unsubscribe = onRouteChange(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setPending(routerLocationKey() !== shownKey.current);
      }, delayMs);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [delayMs]);

  return pending;
}
