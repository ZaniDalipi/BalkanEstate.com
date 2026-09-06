import { describe, it, expect } from 'vitest';
import type { AppView } from '@/types';
import {
  AUTH_REQUIRED_VIEWS,
  directionFor,
  isNavigationNeeded,
  resolveRoute,
  __testing as navTesting,
} from '@/app/navigation/sidebarNavigation';
import { __testing as preloadTesting } from '@/app/navigation/routePreload';

const { VIEW_ROUTES, VIEW_ORDER } = navTesting;

describe('sidebar route resolution', () => {
  it('gives every sidebar destination an absolute in-app path', () => {
    const entries = Object.entries(VIEW_ROUTES) as [AppView, string][];
    expect(entries.length).toBeGreaterThan(0);
    for (const [view, path] of entries) {
      expect(path, `route for ${view}`).toMatch(/^\//);
    }
  });

  it('refuses a view it has no route for, rather than pushing /undefined', () => {
    const result = resolveRoute('not-found' as AppView);
    expect(result.isValid).toBe(false);
    expect(result.path).toBeUndefined();
    expect(result.error).toContain('not-found');
  });

  it('resolves a known view to its path', () => {
    expect(resolveRoute('agents')).toEqual({ isValid: true, path: '/agents' });
    // The subscription entry is the one whose path does not match its view name.
    expect(resolveRoute('pricing')).toEqual({ isValid: true, path: '/subscribe' });
  });

  it('gates exactly the destinations that need a signed-in user', () => {
    for (const view of AUTH_REQUIRED_VIEWS) {
      expect(resolveRoute(view).isValid, `${view} needs a route too`).toBe(true);
    }
    expect(AUTH_REQUIRED_VIEWS.has('search')).toBe(false);
    expect(AUTH_REQUIRED_VIEWS.has('inbox')).toBe(true);
  });
});

describe('sidebar transition direction', () => {
  it('sends the page right-to-left for an entry further down the list', () => {
    expect(directionFor('home', 'agents')).toBe('forward');
    expect(directionFor('search', 'blog')).toBe('forward');
  });

  it('sends the page left-to-right for an entry further up the list', () => {
    expect(directionFor('agents', 'home')).toBe('back');
    expect(directionFor('account', 'search')).toBe('back');
  });

  it('is symmetric, so back undoes forward', () => {
    const pairs: [AppView, AppView][] = [
      ['home', 'inbox'],
      ['rentals', 'agencies'],
      ['blog', 'villas'],
    ];
    for (const [a, b] of pairs) {
      expect(directionFor(a, b)).not.toBe(directionFor(b, a));
    }
  });

  it('treats a view the drawer does not list as further down', () => {
    // 'city-dashboard' is reachable, but not from the drawer.
    expect(directionFor('city-dashboard' as AppView, 'home')).toBe('back');
    expect(directionFor('home', 'city-dashboard' as AppView)).toBe('forward');
  });

  it('orders only views it also routes to', () => {
    for (const view of VIEW_ORDER) {
      expect(resolveRoute(view).isValid, `${view} is ordered but not routed`).toBe(true);
    }
  });
});

describe('deciding whether a tap navigates at all', () => {
  it('does nothing for the entry already on screen', () => {
    expect(isNavigationNeeded('search', { activeView: 'search' })).toBe(false);
  });

  it('navigates for any other entry', () => {
    expect(isNavigationNeeded('agents', { activeView: 'search' })).toBe(true);
  });

  it('navigates out of a detail page even when it sits on the same view', () => {
    // Reading a listing opened from the results: `activeView` is still
    // 'search', but the page on screen is the listing, so tapping Search is a
    // real navigation back out to the results.
    expect(
      isNavigationNeeded('search', { activeView: 'search', hasSelectedProperty: true }),
    ).toBe(true);
    expect(
      isNavigationNeeded('agencies', { activeView: 'agencies', hasSelectedAgency: true }),
    ).toBe(true);
    expect(
      isNavigationNeeded('agents', { activeView: 'agents', hasSelectedAgent: true }),
    ).toBe(true);
    expect(
      isNavigationNeeded('business-directory', {
        activeView: 'business-directory',
        hasSelectedBusinessListing: true,
      }),
    ).toBe(true);
  });
});

describe('route prefetching covers the drawer', () => {
  it('knows which chunk to warm for every destination the sidebar can reach', () => {
    const routed = Object.keys(VIEW_ROUTES) as AppView[];
    const warmable = new Set(Object.keys(preloadTesting.viewImporters));
    const missing = routed.filter((view) => !warmable.has(view));
    // A destination with no importer still navigates — it just pays for its
    // chunk after the tap, which is the loader this whole mechanism removes.
    expect(missing, 'sidebar destinations with no preloadable chunk').toEqual([]);
  });
});
