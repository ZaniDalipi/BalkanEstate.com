/**
 * Route elements that do more than render a page: resolve the language, load
 * the record a detail URL names, guard a page, or redirect an old URL.
 *
 * Each reads what it needs from the URL (`useParams`) and optionally from the
 * navigation state a link passed along (`useLocation().state`) — the listing a
 * card already had, say — but never depends on it: a reload or a shared link
 * carries no state and must land on the same page.
 */

import React, { lazy, useEffect, useLayoutEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/context/AppContext';
import { UserRole, type Agency, type Property } from '@/types';
import { isLanguageSupported, type LanguageCode } from '@/src/i18n';
import { activateLanguage, detectPreferredLanguage } from '@/src/utils/languageRouting';
import { QueryErrorBoundary } from '@/src/app/components/QueryErrorBoundary';
import { RouteLoader } from '@/src/shared/components/ui/RouteLoader';
import { tokenService } from '@/src/shared/api/tokenService';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { getProperty, propertyKeys } from '@/src/features/properties/api';
import { routeImporters } from '@/src/app/navigation/routePreload';
import { lazyWithRetry } from './lazyWithRetry';
import { localizePath } from './navigation';
import { paths } from './paths';
import { useOpenSidebar } from './layoutContext';

const PropertyDetailsPage = lazyWithRetry(routeImporters.propertyDetails);
const AgencyDetailPage = lazyWithRetry(routeImporters.agencyDetail);
const SellerDashboard = lazy(() => import('@/src/features/seller/components/SellerDashboard'));
const SearchPage = lazy(() => import('@/src/features/search/components').then(m => ({ default: m.SearchPage })));
const NotFoundPage = lazy(() => import('@/src/components/ui/not-found-2').then(m => ({ default: m.NotFound })));

/** Navigation state a page may be handed by the link that opened it. */
export interface RouteState {
  property?: Property;
  agency?: Agency;
  importDraft?: import('@/types').ImportDraftToPublish;
}

export function useRouteState(): RouteState {
  const { state } = useLocation();
  return (state && typeof state === 'object' ? state : {}) as RouteState;
}

/** Redirect to an app path in the current language, keeping the query string. */
export const Redirect: React.FC<{ to: string; keepQuery?: boolean }> = ({ to, keepQuery = true }) => {
  const { search } = useLocation();
  return <Navigate replace to={localizePath(to) + (keepQuery ? search : '')} />;
};

/** `/` → `/{lang}` — the language the user last chose, or the browser's. */
export const LanguageRedirect: React.FC = () => {
  const { search, hash, state } = useLocation();
  return <Navigate replace to={`/${detectPreferredLanguage()}${search}${hash}`} state={state} />;
};

/**
 * `/:lang/*`. A supported language is applied and its pages render; anything
 * else in that slot is an old unprefixed URL (`/agents/12`), which is moved
 * under the preferred language with its query and hash intact.
 */
export const LanguageGate: React.FC = () => {
  const { lang = '' } = useParams();
  const { pathname, search, hash, state } = useLocation();
  const supported = isLanguageSupported(lang);

  // Before paint, so the first frame of a page is already in its language when
  // the bundle is cached.
  useLayoutEffect(() => {
    if (supported) activateLanguage(lang as LanguageCode);
  }, [lang, supported]);

  if (!supported) {
    return <Navigate replace to={`/${detectPreferredLanguage()}${pathname}${search}${hash}`} state={state} />;
  }
  return <Outlet />;
};

const PageLoader: React.FC = () => <RouteLoader />;

/** `/property/:propertyId` — the listing a card passed along, or fetched. */
export const PropertyRoute: React.FC = () => {
  const { propertyId = '' } = useParams();
  const passed = useRouteState().property;
  // A card's copy is shown at once; the detail page refreshes it itself.
  const usePassed = !!passed && passed.id === propertyId;
  const { data, isLoading, isError } = useQuery({
    queryKey: propertyKeys.detail(propertyId),
    queryFn: () => getProperty(propertyId),
    enabled: !usePassed && !!propertyId,
    placeholderData: undefined,
    retry: (count, error: any) => error?.response?.status !== 404 && count < 2,
  });

  const property = usePassed ? passed : data;
  if (!property) {
    if (isError || (!isLoading && !usePassed)) return <NotFoundPage />;
    return <PageLoader />;
  }
  return (
    <QueryErrorBoundary>
      <PropertyDetailsPage property={property} />
    </QueryErrorBoundary>
  );
};

/** `/create-listing`, `/create-rental`, `/edit-listing/:propertyId`. */
export const ListingEditorRoute: React.FC<{ kind: 'sale' | 'rent' | 'edit' }> = ({ kind }) => {
  const { propertyId } = useParams();
  const { property: passed, importDraft } = useRouteState();
  const usePassed = kind === 'edit' && !!passed && passed.id === propertyId;
  const { data, isError } = useQuery({
    queryKey: propertyKeys.detail(propertyId ?? ''),
    queryFn: () => getProperty(propertyId!),
    enabled: kind === 'edit' && !usePassed && !!propertyId,
    placeholderData: undefined,
  });

  if (kind === 'edit') {
    // A listing that cannot be loaded cannot be edited: back to the search.
    if (isError) return <Redirect to={paths.search()} keepQuery={false} />;
    const property = usePassed ? passed : data;
    if (!property) return <PageLoader />;
    return <SellerDashboard key={property.id} propertyToEdit={property} />;
  }
  return (
    <SellerDashboard
      // A different draft is a different listing — start its form afresh.
      key={importDraft?.draftId ?? kind}
      initialListingType={kind}
      importDraft={importDraft ?? null}
    />
  );
};

/**
 * The agency's slug from the URL — `country/name`, or an id. Old links joined
 * the two with a comma (`serbia,belgrade-homes`).
 */
function normalizeAgencySlug(slug: string): string {
  return slug.replace(',', '/').replace(/\/+$/, '');
}

async function fetchAgency(slug: string): Promise<Agency | null> {
  // The token lets the backend recognise the owner (and add them as a member).
  const token = tokenService.getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const path = slug.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${API_CONFIG.BASE_URL}/agencies/${path}`, { headers });
  const contentType = response.headers.get('content-type');
  if (!response.ok || !contentType?.includes('application/json')) return null;
  const data = await response.json();
  return (data.agency as Agency) ?? null;
}

/** `/agencies/:country/:name` (or `/agencies/:id`) */
export const AgencyRoute: React.FC = () => {
  const slug = normalizeAgencySlug(useParams()['*'] ?? '');
  const passed = useRouteState().agency;
  const [agency, setAgency] = useState<Agency | null | undefined>(passed ?? undefined);

  useEffect(() => {
    if (passed) {
      setAgency(passed);
      return;
    }
    let cancelled = false;
    setAgency(undefined);
    fetchAgency(slug)
      .catch(() => null)
      .then((result) => {
        if (!cancelled) setAgency(result);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, passed]);

  if (agency === undefined) return <PageLoader />;
  if (agency === null) return <NotFoundPage />;
  return (
    <QueryErrorBoundary>
      <AgencyDetailPage agency={agency} />
    </QueryErrorBoundary>
  );
};

/** Admin pages: admins only; anyone else is sent to the search page. */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAppContext();
  const role = state.currentUser?.role;
  if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
    return <Redirect to={paths.search()} keepQuery={false} />;
  }
  return <>{children}</>;
};

/** Pages that need a signed-in user; others see the search page instead. */
export const SignedInRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAppContext();
  if (!state.isAuthenticated) {
    return <Redirect to={paths.search()} keepQuery={false} />;
  }
  return <>{children}</>;
};

/** `/login`, `/register` — the auth modal over the search page. */
export const AuthModalRoute: React.FC<{ view: 'login' | 'signup' }> = ({ view }) => {
  const { dispatch } = useAppContext();
  const onToggleSidebar = useOpenSidebar();
  useEffect(() => {
    dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view } });
  }, [dispatch, view]);
  return (
    <QueryErrorBoundary>
      <SearchPage onToggleSidebar={onToggleSidebar} />
    </QueryErrorBoundary>
  );
};
