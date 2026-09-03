/**
 * Route chunk prefetching.
 *
 * The property detail page is the most-navigated route in the app and one of
 * the heaviest chunks, so the first tap on a listing paid for a network round
 * trip before anything could render — the loader everyone saw. Fetching the
 * chunk while the user is still deciding (pointer over a card, finger down on
 * it, or simply idle on a results page) usually means the tap resolves
 * synchronously from the module cache and no loader appears at all.
 *
 * The importers here are the same module specifiers `App.tsx` passes to
 * `lazy()`, so both resolve to one chunk and the second import is a cache hit.
 */

const importers = {
  propertyDetails: () => import('@/features/property-details/components/PropertyDetailsPage'),
  agencyDetail: () => import('@/components/AgencyDetailPage'),
} as const;

export type PreloadableRoute = keyof typeof importers;

const started = new Set<PreloadableRoute>();

/** Start fetching a route's chunk. Safe to call repeatedly and from events. */
export function preloadRoute(route: PreloadableRoute): void {
  if (started.has(route)) return;
  started.add(route);
  // A failure here is not the user's problem — the real navigation retries via
  // lazyWithRetry, which knows how to recover from a stale deploy.
  importers[route]().catch(() => started.delete(route));
}

/** Prefetch once the browser is idle, so it never competes with first paint. */
export function preloadRouteWhenIdle(route: PreloadableRoute): void {
  if (typeof window === 'undefined' || started.has(route)) return;
  const run = () => preloadRoute(route);
  const idle = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (idle) {
    idle(run, { timeout: 3000 });
  } else {
    // Safari has no requestIdleCallback; a plain delay keeps the fetch off the
    // critical path well enough.
    window.setTimeout(run, 1500);
  }
}

export const routeImporters = importers;
