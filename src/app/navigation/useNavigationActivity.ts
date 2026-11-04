import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { onRouteChange, routerLocationKey } from '@/src/app/router/navigation';
import { IDLE, navReducer, shouldShow, type NavEvent, type NavPhase } from './navActivity';

/** How often the phase is re-checked while a page change is in progress. */
const TICK_MS = 50;

/**
 * Whether the navigation "loading" circle should be on screen: from the tap
 * until the next page is showing and has finished fetching its data. The rules
 * (delay, minimum time on screen, when loading counts as done) live in
 * `navActivity.ts`; this only feeds it the router's and TanStack Query's
 * events. The phase is kept in a ref, so the many query-cache events only
 * re-render this hook's component when the answer actually changes.
 */
export function useNavigationActivity(): boolean {
  // Inside the router tree this is the committed location — the page showing.
  const { key } = useLocation();
  const queryClient = useQueryClient();
  const shownKey = useRef(key);
  const phase = useRef<NavPhase>(IDLE);
  const visibleSince = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const poll = useRef<() => void>(() => undefined);

  // Apply an event, then bring `visible` in line and keep ticking while
  // anything is still in progress.
  const send = useRef((event: NavEvent) => {
    phase.current = navReducer(phase.current, event);
    const show = shouldShow(phase.current, event.at, visibleSince.current);
    if (show && visibleSince.current === null) visibleSince.current = event.at;
    if (!show) visibleSince.current = null;
    setVisible(show);
    if (phase.current.kind !== 'idle' || show) poll.current();
  }).current;

  useEffect(() => {
    let timer = 0;
    poll.current = () => {
      if (timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        send({ type: 'tick', at: performance.now() });
      }, TICK_MS);
    };
    const stopRoutes = onRouteChange(() => {
      if (routerLocationKey() !== shownKey.current) send({ type: 'start', at: performance.now() });
    });
    const stopQueries = queryClient.getQueryCache().subscribe(() => {
      if (phase.current.kind !== 'settling') return;
      send({ type: 'fetching', at: performance.now(), count: queryClient.isFetching() });
    });
    return () => {
      stopRoutes();
      stopQueries();
      window.clearTimeout(timer);
      poll.current = () => undefined;
    };
  }, [queryClient, send]);

  // The new page is on screen. Its queries may not have started yet (this
  // runs before the page's own effects), so the count is read now and the
  // cache subscription above catches any fetch that starts a moment later.
  useEffect(() => {
    if (shownKey.current === key) return;
    shownKey.current = key;
    send({ type: 'shown', at: performance.now(), fetching: queryClient.isFetching() });
  }, [key, queryClient, send]);

  return visible;
}
