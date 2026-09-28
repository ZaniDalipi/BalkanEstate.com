/**
 * The one way the app changes page.
 *
 * `navigate(paths.agent(id))` adds the language prefix, records which way the
 * page is moving for the transition, and hands the URL to React Router, which
 * renders whatever route matches it. Nothing else — no dispatch, no view name,
 * no `history.pushState` — is needed or allowed to change page: the URL is the
 * only record of where the user is, so a reload or a shared link always lands
 * on the page the click did.
 *
 * It is a plain module function rather than a hook so non-React code (auth
 * flows in AppContext, notification handlers) can navigate too. The router is
 * registered here once, when it is created.
 */

import type { DataRouter } from 'react-router-dom';
import { buildLocalizedPath, getCurrentLanguageFromUrl, parseLanguageFromPath } from '@/src/utils/languageRouting';
import type { LanguageCode } from '@/src/i18n';
import { canNavigateBack, setNavigationDirection, type NavigationDirection } from '@/src/app/navigation/navHistory';

let router: DataRouter | null = null;

export function registerRouter(instance: DataRouter): void {
  router = instance;
}

export interface NavigateOptions {
  /** Replace the current history entry instead of adding one. */
  replace?: boolean;
  /**
   * Data handed to the destination page alongside the URL — e.g. the listing
   * object a card already has, so the detail page renders without refetching.
   * The page must still work without it (a reload or a shared link has none).
   */
  state?: unknown;
  /** Which way the page moves; defaults to forward. */
  direction?: NavigationDirection;
}

/**
 * Prefix an app path (`/search?city=Tirana`) with the current language
 * (`/en/search?city=Tirana`). A path that already carries a language keeps it.
 */
export function localizePath(to: string): string {
  const match = to.match(/^([^?#]*)(.*)$/);
  const pathname = match?.[1] || '/';
  const rest = match?.[2] ?? '';
  if (parseLanguageFromPath(pathname).lang) return pathname + rest;
  // The URL's language, not i18n's: i18n switches only once the new language's
  // bundle has loaded, and navigating in that window must not undo the switch.
  return buildLocalizedPath(pathname, getCurrentLanguageFromUrl()) + rest;
}

/** Go to an app path (see `paths`). Absolute URLs leave the app. */
export function navigate(to: string, options: NavigateOptions = {}): void {
  if (/^https?:\/\//i.test(to)) {
    window.location.assign(to);
    return;
  }
  if (options.direction) setNavigationDirection(options.direction);
  const target = localizePath(to);
  if (!router) {
    // Only reachable before the router mounts; a full load still lands right.
    window.location.assign(target);
    return;
  }
  void router.navigate(target, { replace: options.replace, state: options.state });
}

/**
 * Step back to wherever the user came from, like the browser's own back
 * button. Opened straight onto this page (a shared link, a fresh install) there
 * is nothing in-app to return to, so `fallback` is shown instead, animated as a
 * step back.
 */
export function goBack(fallback: string): void {
  if (canNavigateBack() && router) {
    setNavigationDirection('back');
    void router.navigate(-1);
    return;
  }
  navigate(fallback, { direction: 'back' });
}

/**
 * Switch language by moving to the same page under the new prefix. The
 * language gate on the `:lang` route then loads and applies it, so the URL and
 * the UI language can never disagree.
 */
export function changeLanguage(lang: LanguageCode): void {
  const { path } = parseLanguageFromPath(window.location.pathname);
  const target = buildLocalizedPath(path, lang) + window.location.search + window.location.hash;
  if (!router) {
    window.location.assign(target);
    return;
  }
  void router.navigate(target, { replace: true, state: window.history.state?.usr, preventScrollReset: true });
}

/**
 * Rewrite the current URL's query string without navigating.
 *
 * For pages that mirror their own UI state into the address bar as it changes
 * — search filters, a map viewport — where a routing pass per keystroke or map
 * pan would re-render the whole tree for no visible change. The page stays
 * mounted; only the address bar (and so a reload or a copied link) updates.
 * Anything that changes *which page* is shown must use `navigate()`.
 */
export function replaceQueryString(search: string | URLSearchParams): void {
  const qs = typeof search === 'string' ? search.replace(/^\?/, '') : search.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', url);
}
