/**
 * What page is on screen, read from the matched route.
 *
 * Replaces `state.activeView` and the `selected*` ids that AppContext used to
 * keep in step with the URL by hand. Each route declares its view in `handle`
 * (see routes.tsx); this hook returns the deepest one that matched, so a
 * component asks "am I on the agents page?" of the router rather than of a copy
 * of it that could drift.
 */

import { useMatches, useParams } from 'react-router-dom';
import type { AppView } from '@/types';

/** A detail page open "inside" its section — a listing, a profile. */
export type DetailKind = 'property' | 'agency' | 'agent' | 'business-listing';

export interface RouteHandle {
  /** The section this page belongs to (sidebar highlight, ads, page title). */
  view: AppView;
  /** Set on detail pages. */
  detail?: DetailKind;
  /** Ask search engines not to index the page. */
  noindex?: boolean;
  /** Render without the app chrome (sidebar, header). */
  bare?: boolean;
  /**
   * Params whose change means a different page — the page remounts and scrolls
   * to the top. Params not listed (a tab, a section) swap content in place.
   */
  pageParams?: string[];
  /** Params whose change scrolls to the top without remounting the page. */
  scrollParams?: string[];
}

const FALLBACK: RouteHandle = { view: 'home' };

function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null && 'view' in value;
}

export interface RouteView extends RouteHandle {
  params: Readonly<Record<string, string | undefined>>;
  /** Identity of the page: changes exactly when a different page is shown. */
  pageKey: string;
  /** Changes whenever the page should scroll back to the top. */
  scrollKey: string;
}

export function useRouteView(): RouteView {
  const matches = useMatches();
  const params = useParams();
  let handle = FALLBACK;
  for (let i = matches.length - 1; i >= 0; i--) {
    const candidate = matches[i].handle;
    if (isRouteHandle(candidate)) {
      handle = candidate;
      break;
    }
  }
  const pick = (names?: string[]) => (names ?? []).map((name) => params[name] ?? '').join('/');
  // A detail page without its own `pageParams` (an agent profile, a business
  // listing) is the list page showing one entry: same page, still mounted, so
  // going back finds the list as it was left.
  const pageKey = `${handle.view}:${pick(handle.pageParams)}`;
  return {
    ...handle,
    params,
    pageKey,
    scrollKey: `${pageKey}:${pick(handle.scrollParams)}`,
  };
}
