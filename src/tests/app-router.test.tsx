import { describe, it, expect, vi } from 'vitest';
import { matchRoutes } from 'react-router-dom';
import type { RouteHandle } from '@/src/app/router/useRouteView';

// The route table only needs its shape here — nothing is rendered.
vi.mock('@/context/AppContext', () => ({ useAppContext: () => ({ state: {}, dispatch: vi.fn() }) }));
vi.mock('@sentry/react', () => ({
    ErrorBoundary: ({ children }: { children?: unknown }) => children,
    withProfiler: <T,>(c: T) => c,
    withErrorBoundary: <T,>(c: T) => c,
    captureException: vi.fn(), captureMessage: vi.fn(), init: vi.fn(), setUser: vi.fn(),
    withScope: vi.fn(), addBreadcrumb: vi.fn(),
    browserTracingIntegration: vi.fn(), replayIntegration: vi.fn(),
}));

const { appRoutes } = await import('@/src/app/router/routes');
const { paths, pathForView, withQuery } = await import('@/src/app/router/paths');
const { localizePath } = await import('@/src/app/router/navigation');

const routes = appRoutes(null);

/** The deepest matched route's handle and params, as `useRouteView` reads them. */
function resolve(url: string) {
  const matches = matchRoutes(routes, url);
  if (!matches) return null;
  const last = matches[matches.length - 1];
  const handle = [...matches].reverse().find((m) => m.route.handle)?.route.handle as RouteHandle | undefined;
  return { handle, params: last.params, depth: matches.length };
}

describe('path builders', () => {
  it('encodes dynamic segments so an id cannot break out of its segment', () => {
    expect(paths.property('a/b?c')).toBe('/property/a%2Fb%3Fc');
    expect(paths.agent('42')).toBe('/agents/42');
  });

  it('writes an agency slug as its two segments, legacy comma form included', () => {
    expect(paths.agency('albania/zano-real-estate')).toBe('/agencies/albania/zano-real-estate');
    expect(paths.agency('serbia,belgrade-homes')).toBe('/agencies/serbia/belgrade-homes');
    expect(paths.agencyOf({ _id: 'abc123' })).toBe('/agencies/abc123');
  });

  it('builds query strings and drops empty values', () => {
    expect(paths.search({ city: 'Tirana', country: 'albania', q: undefined })).toBe('/search?city=Tirana&country=albania');
    expect(withQuery('/contact', { topic: '' })).toBe('/contact');
  });

  it('leaves default tabs and sections out of the URL', () => {
    expect(paths.admin('dashboard')).toBe('/admin');
    expect(paths.admin('users')).toBe('/admin/users');
    expect(paths.agencyDashboard('overview')).toBe('/agency-dashboard');
    expect(paths.account('import-review')).toBe('/account/import-review');
  });

  it('maps a view to its landing page, and nothing for id-only views', () => {
    expect(pathForView('pricing')).toBe('/subscribe');
    expect(pathForView('home')).toBe('/');
    expect(pathForView('not-found')).toBeNull();
  });
});

describe('localizePath', () => {
  it('prefixes the current language and keeps query and hash', () => {
    window.history.replaceState(null, '', '/sq/search');
    expect(localizePath('/agents?x=1#top')).toBe('/sq/agents?x=1#top');
    expect(localizePath('/')).toBe('/sq');
  });

  it('keeps a path that already names its language', () => {
    window.history.replaceState(null, '', '/sq/search');
    expect(localizePath('/en/agents')).toBe('/en/agents');
  });
});

describe('route table', () => {
  it.each([
    ['/en', 'home', undefined],
    ['/en/search?city=Tirana', 'search', undefined],
    ['/sq/rent', 'rentals', undefined],
    ['/en/property/p1', 'search', 'property'],
    ['/en/agents/a7', 'agents', 'agent'],
    ['/en/agencies/albania/zano-real-estate', 'agencies', 'agency'],
    ['/en/business-directory/acme-law_Ab12', 'business-directory', 'business-listing'],
    ['/en/explore-cities/Tirana/Albania', 'city-dashboard', undefined],
    ['/en/account/subscription', 'account', undefined],
    ['/en/edit-listing/p1', 'create-listing', undefined],
    ['/en/privacy-policy', 'privacy', undefined],
  ])('%s is the %s view', (url, view, detail) => {
    const result = resolve(url);
    expect(result?.handle?.view).toBe(view);
    expect(result?.handle?.detail).toBe(detail);
  });

  it('reads ids and tabs as params', () => {
    expect(resolve('/en/property/p1')?.params.propertyId).toBe('p1');
    expect(resolve('/en/agencies/albania/zano-real-estate')?.params['*']).toBe('albania/zano-real-estate');
    expect(resolve('/en/account/subscription')?.params.tab).toBe('subscription');
    expect(resolve('/en/explore-cities/Tirana/Albania')?.params).toMatchObject({ city: 'Tirana', country: 'Albania' });
  });

  it('gives the directory tabs their own routes rather than reading them as listings', () => {
    for (const tab of ['businesses', 'individuals', 'mine']) {
      const result = resolve(`/en/business-directory/${tab}`);
      expect(result?.handle?.detail).toBeUndefined();
      expect(result?.params.listingSlug).toBeUndefined();
    }
  });

  it('sends a URL without a language through the language gate', () => {
    // `/agents/12` matches `:lang` = "agents"; LanguageGate sees an unsupported
    // language and redirects to `/{preferred}/agents/12`.
    const matches = matchRoutes(routes, '/agents/12');
    expect(matches?.[1].params.lang).toBe('agents');
  });

  it('marks personal pages as not indexable', () => {
    expect(resolve('/en/inbox')?.handle?.noindex).toBe(true);
    expect(resolve('/en/search')?.handle?.noindex).toBeUndefined();
  });
});
