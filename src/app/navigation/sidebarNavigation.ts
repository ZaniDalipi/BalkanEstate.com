/**
 * Sidebar navigation: where each entry goes, and which way the page moves to
 * get there.
 *
 * The sidebar used to navigate by hand — three dispatches and a `pushState`,
 * inline in the click handler — which is why it was the one navigation in the
 * app with no motion at all. Every other route change goes through the paired
 * page transition (`pageTransition.ts`): the page being left slides away as the
 * one arriving comes in. The sidebar bypassed it entirely, so tapping an entry
 * replaced one page with another in a single frame, on top of a drawer that was
 * still animating shut and a full-screen blur that was still unwinding. That
 * combination is what read as slow — not the routing, which was already
 * instant, but three unrelated pieces of motion landing on the same frame.
 *
 * This module holds the parts of that decision that are pure, so they can be
 * tested without a DOM: the destination of every entry, whether a tap is worth
 * navigating for at all, and which direction the page should travel.
 */

import type { AppView } from '@/types';
import type { NavigationDirection } from './navHistory';

/**
 * Where each sidebar destination lives, before the language prefix is applied.
 *
 * These are the paths `App.tsx`'s route map already resolves back to the same
 * view, so a reload or a shared link lands where the tap did. A view missing
 * from here is a view the sidebar must not navigate to — see `resolveRoute`.
 */
const VIEW_ROUTES: Partial<Record<AppView, string>> = {
  home: '/',
  search: '/search',
  rentals: '/rentals',
  villas: '/villas',
  'explore-cities': '/explore-cities',
  'saved-searches': '/saved-searches',
  'saved-properties': '/saved-properties',
  agents: '/agents',
  agencies: '/agencies',
  'business-directory': '/business-directory',
  'how-it-works': '/how-it-works',
  blog: '/blog',
  admin: '/admin',
  valuation: '/valuation',
  'mortgage-calculator': '/mortgage-calculator',
  analytics: '/analytics',
  inbox: '/inbox',
  account: '/account',
  'create-listing': '/create-listing',
  pricing: '/subscribe',
};

/**
 * The order the entries appear in the drawer, top to bottom.
 *
 * The sidebar is a vertical list of peers, so the page travels the way the list
 * does: an entry below the current one arrives from the right, an entry above
 * it arrives from the left. That is what makes the motion mean something —
 * without it every tap slides the same way and the animation is just decoration
 * that costs 340ms. Any view not listed sorts last, which is the honest answer
 * for a destination the drawer does not itself contain.
 */
const VIEW_ORDER: AppView[] = [
  'home',
  'search',
  'rentals',
  'villas',
  'explore-cities',
  'saved-searches',
  'saved-properties',
  'agents',
  'agencies',
  'business-directory',
  'how-it-works',
  'blog',
  'admin',
  'valuation',
  'mortgage-calculator',
  'create-listing',
  'pricing',
  'analytics',
  'inbox',
  'account',
];

/** Destinations that require a signed-in user; a tap opens the auth modal instead. */
export const AUTH_REQUIRED_VIEWS: ReadonlySet<AppView> = new Set<AppView>([
  'inbox',
  'account',
  'saved-searches',
  'saved-properties',
  'analytics',
]);

export interface RouteResolution {
  isValid: boolean;
  path?: string;
  error?: string;
}

/**
 * The path a sidebar entry navigates to.
 *
 * Follows the app's validation convention (`{ isValid, error? }`) rather than
 * returning a path and hoping: a view with no route would otherwise be pushed
 * to the URL as `/undefined`, which routing resolves to the not-found page —
 * a broken destination presented as a real one. The caller closes the drawer
 * and stays put instead.
 */
export function resolveRoute(view: AppView): RouteResolution {
  const path = VIEW_ROUTES[view];
  if (!path) {
    return { isValid: false, error: `No sidebar route is defined for view "${view}"` };
  }
  return { isValid: true, path };
}

/** Position in the drawer; unlisted views sort after everything listed. */
function orderOf(view: AppView): number {
  const index = VIEW_ORDER.indexOf(view);
  return index === -1 ? VIEW_ORDER.length : index;
}

/**
 * Which way the page travels for a move between two entries.
 *
 * `up` is reserved for the views the app already presents as a sheet (a
 * listing composer), which `ViewTransition` resolves for itself once it knows
 * what arrived — the direction here is only the opening guess.
 */
export function directionFor(from: AppView, to: AppView): NavigationDirection {
  return orderOf(to) < orderOf(from) ? 'back' : 'forward';
}

export interface DestinationState {
  activeView: AppView;
  /** A listing is open on top of the view — its own page, not `activeView`'s. */
  hasSelectedProperty?: boolean;
  /** An agency profile is open on top of the view. */
  hasSelectedAgency?: boolean;
  /** An agent profile is open on top of the view. */
  hasSelectedAgent?: boolean;
  /** A business listing is open on top of the view. */
  hasSelectedBusinessListing?: boolean;
}

/**
 * Whether tapping `view` would actually take the user somewhere.
 *
 * Tapping the entry you are already on used to push a duplicate history entry
 * and run a full transition against an identical page: a third of a second of
 * animation, a back button that now needs two presses, and nothing on screen
 * to show for either. It only closes the drawer now.
 *
 * A detail page open over the view is the exception — the listing you are
 * reading is not `activeView`, so "Search" while a listing is open is a real
 * navigation back out to the results.
 */
export function isNavigationNeeded(view: AppView, state: DestinationState): boolean {
  if (
    state.hasSelectedProperty ||
    state.hasSelectedAgency ||
    state.hasSelectedAgent ||
    state.hasSelectedBusinessListing
  ) {
    return true;
  }
  return state.activeView !== view;
}

export const __testing = { VIEW_ROUTES, VIEW_ORDER };
