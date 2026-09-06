/**
 * Route chunk prefetching.
 *
 * Every page in this app is a lazy chunk, so the first tap on any of them paid
 * for a network round trip before anything could render — the loader everyone
 * saw. Fetching the chunk while the user is still deciding (pointer over a card
 * or a nav row, finger down on it, or simply idle on a results page) usually
 * means the tap resolves synchronously from the module cache and no loader
 * appears at all.
 *
 * That matters twice over now that navigation runs as a paired transition. The
 * browser holds an image of the outgoing page against one of the incoming page,
 * and it captures the incoming one shortly after the view commits — so a route
 * that is still fetching its chunk gets captured as an empty frame, and the
 * real page appears afterwards with no animation at all. A warm chunk is what
 * keeps the arriving page in the shot.
 *
 * The specifiers here resolve to the same modules `App.tsx` hands to `lazy()`,
 * so both share one chunk and the second import is a cache hit.
 */

import type { AppView } from '@/types';

const importers = {
  propertyDetails: () => import('@/features/property-details/components/PropertyDetailsPage'),
  agencyDetail: () => import('@/components/AgencyDetailPage'),
} as const;

export type PreloadableRoute = keyof typeof importers;

/**
 * The page behind each view the sidebar can reach.
 *
 * Only views with a chunk of their own appear here: warming is an optimisation,
 * so an unmapped view is a no-op rather than an error — the navigation itself
 * works either way.
 */
const viewImporters: Partial<Record<AppView, () => Promise<unknown>>> = {
  home: () => import('@/features/home/components/HomePage'),
  search: () => import('@/features/search/components'),
  rentals: () => import('@/features/rental/components/RentalSearchPage'),
  villas: () => import('@/features/villas/components/VillaSearchPage'),
  'explore-cities': () => import('@/features/cities/components/CityRecommendations'),
  'saved-searches': () => import('@/features/saved/components/SavedSearchesPage'),
  'saved-properties': () => import('@/features/saved/components/SavedHomesPage'),
  agents: () => import('@/features/agents/components/AgentsPage'),
  agencies: () => import('@/components/AgenciesListPage'),
  'business-directory': () => import('@/features/business-directory/components/BusinessDirectoryPage'),
  'how-it-works': () => import('@/components/shared/HowItWorksPage'),
  blog: () => import('@/features/blog/components/BlogPage'),
  admin: () => import('@/features/admin/components/AdminDashboard'),
  valuation: () => import('@/features/valuation/components/ValuationPage'),
  'mortgage-calculator': () => import('@/features/calculators/components/MortgageCalculatorPage'),
  analytics: () => import('@/features/analytics/components/AnalyticsPage'),
  inbox: () => import('@/features/messaging/components/InboxPage'),
  account: () => import('@/components/shared/MyAccountPage'),
  'create-listing': () => import('@/features/seller/components/SellerDashboard'),
  pricing: () => import('@/features/pricing/components/PricingPage'),
};

const started = new Set<string>();

/** Fetch a chunk once, and never let a failed fetch be the user's problem. */
function warm(key: string, load: () => Promise<unknown>): void {
  if (started.has(key)) return;
  started.add(key);
  // A failure here is not the user's problem — the real navigation retries via
  // lazyWithRetry, which knows how to recover from a stale deploy. Dropping the
  // key lets a later attempt try again rather than assuming it is warm.
  load().catch(() => started.delete(key));
}

/** Start fetching a route's chunk. Safe to call repeatedly and from events. */
export function preloadRoute(route: PreloadableRoute): void {
  warm(route, importers[route]);
}

/**
 * Start fetching the chunk behind a view. Safe to call from a pointer event on
 * every frame of a hover — the first call is the only one that fetches.
 */
export function preloadView(view: AppView): void {
  const load = viewImporters[view];
  if (!load) return;
  warm(`view:${view}`, load);
}

/** Whether a chunk fetch has already been started (used by tests). */
export function isRouteWarm(key: string): boolean {
  return started.has(key);
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
export const __testing = { viewImporters, started };
