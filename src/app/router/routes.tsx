/**
 * The route table: every URL the app answers, and what it renders.
 *
 * All pages live under `/:lang` (`/en/search`, `/sq/agents/12`). A URL without
 * a language (`/search`, a link from an old email) is redirected by
 * `LanguageGate`, so nothing below has to think about prefixes.
 *
 * Each route's `handle` names the view it belongs to (see `RouteHandle`) — the
 * layout reads it for the sidebar highlight, the page title, ad targeting and
 * whether the page is indexable. Pages read their own ids and tabs with
 * `useParams()`.
 *
 * To add a page: add a builder to `paths.ts`, a lazy import and a route here.
 */

import React, { lazy } from 'react';
import { createBrowserRouter, useParams, type RouteObject } from 'react-router-dom';
import { QueryErrorBoundary } from '@/src/app/components/QueryErrorBoundary';
import type { RouteHandle } from './useRouteView';
import { useOpenSidebar } from './layoutContext';
import { lazyWithRetry } from './lazyWithRetry';
import { paths, type BusinessDirectoryTab } from './paths';
import { registerRouter } from './navigation';
import {
  AdminRoute,
  AgencyRoute,
  AuthModalRoute,
  LanguageGate,
  LanguageRedirect,
  ListingEditorRoute,
  PropertyRoute,
  Redirect,
  SignedInRoute,
} from './routeElements';

const HomePage = lazyWithRetry(() => import('@/src/features/home/components/HomePage'));
const SearchPage = lazy(() => import('@/src/features/search/components').then(m => ({ default: m.SearchPage })));
const RentalSearchPage = lazy(() => import('@/src/features/rental/components/RentalSearchPage'));
const VillaSearchPage = lazy(() => import('@/src/features/villas/components/VillaSearchPage'));
const CityRecommendations = lazy(() => import('@/src/features/cities/components/CityRecommendations'));
const CityDashboard = lazy(() => import('@/src/features/cities/components/CityDashboard'));
const SavedSearchesPage = lazy(() => import('@/src/features/saved/components/SavedSearchesPage'));
const SavedPropertiesPage = lazy(() => import('@/src/features/saved/components/SavedHomesPage'));
const InboxPage = lazy(() => import('@/src/features/messaging/components/InboxPage'));
const MyAccountPage = lazy(() => import('@/components/shared/MyAccountPage'));
const AgentsPage = lazy(() => import('@/src/features/agents/components/AgentsPage'));
const AgenciesListPage = lazy(() => import('@/components/AgenciesListPage'));
const BusinessDirectoryPage = lazy(() => import('@/src/features/business-directory/components/BusinessDirectoryPage'));
const AdminDashboard = lazy(() => import('@/src/features/admin/components/AdminDashboard'));
const AgencyDashboardPage = lazy(() => import('@/src/features/agency-dashboard/components/AgencyDashboardPage'));
const ResetPasswordPage = lazyWithRetry(() => import('@/src/features/auth/components/ResetPasswordPage'));
const VerifyEmailPage = lazyWithRetry(() => import('@/src/features/auth/components/VerifyEmailPage'));
const AnalyticsPage = lazy(() => import('@/src/features/analytics/components/AnalyticsPage'));
const HowItWorksPage = lazy(() => import('@/components/shared/HowItWorksPage'));
const ValuationPage = lazy(() => import('@/src/features/valuation/components/ValuationPage'));
const MortgageCalculatorPage = lazy(() => import('@/src/features/calculators/components/MortgageCalculatorPage'));
const PricingPage = lazy(() => import('@/src/features/pricing/components/PricingPage'));
const PrivacyPolicyPage = lazy(() => import('@/src/features/legal/components/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('@/src/features/legal/components/TermsOfServicePage'));
const CookiePolicyPage = lazy(() => import('@/src/features/legal/components/CookiePolicyPage'));
const RefundPolicyPage = lazy(() => import('@/src/features/legal/components/RefundPolicyPage'));
const ContactUsPage = lazy(() => import('@/src/features/contact/components/ContactUsPage'));
const BuyingGuidesPage = lazy(() => import('@/src/features/guides/components/BuyingGuidesPage'));
const BlogPage = lazy(() => import('@/src/features/blog/components/BlogPage'));
const CreateAgencyPage = lazy(() => import('@/src/features/agencies/components/CreateAgencyPage'));
const AgencyPaymentPage = lazy(() => import('@/src/features/agencies/components/AgencyPaymentPage'));
const PaymentSuccess = lazy(() => import('@/src/features/payments/components/PaymentSuccess'));
const PaymentCancel = lazy(() => import('@/src/features/payments/components/PaymentCancel'));

const guarded = (node: React.ReactNode) => <QueryErrorBoundary>{node}</QueryErrorBoundary>;

/** Pages with their own mobile header open the sidebar drawer themselves. */
type SidebarPage = React.ComponentType<{ onToggleSidebar: () => void }>;
const WithSidebar: React.FC<{ page: SidebarPage }> = ({ page: Page }) => {
  const openSidebar = useOpenSidebar();
  return <Page onToggleSidebar={openSidebar} />;
};

/** `/business-directory/{businesses,individuals,mine}` pick a tab; anything else is a listing. */
const BusinessDirectoryRoute: React.FC<{ tab?: BusinessDirectoryTab }> = ({ tab }) => {
  const { listingSlug } = useParams();
  // SEO slugs end in `_EncodedId` ("acme-law-in-skopje_Ab12"); plain ids have none.
  const underscore = listingSlug?.lastIndexOf('_') ?? -1;
  const listingId = listingSlug && underscore > 0 ? listingSlug.slice(underscore + 1) : listingSlug ?? null;
  return guarded(<BusinessDirectoryPage selectedListingId={listingId} initialTab={tab} />);
};

type AppRoute = RouteObject & { handle?: RouteHandle };

const page = (path: string, handle: RouteHandle, element: React.ReactNode): AppRoute => ({ path, handle, element });

/** The same page answering at several paths — kept because they are published. */
const aliases = (pathList: string[], handle: RouteHandle, element: React.ReactNode): AppRoute[] =>
  pathList.map((path) => page(path, handle, element));

const noindex = { noindex: true } as const;

const pageRoutes: AppRoute[] = [
  { index: true, handle: { view: 'home' }, element: guarded(<WithSidebar page={HomePage} />) },
  page('home', { view: 'home' }, guarded(<WithSidebar page={HomePage} />)),

  // Browsing
  page('search', { view: 'search' }, guarded(<WithSidebar page={SearchPage} />)),
  ...aliases(['rentals', 'rent'], { view: 'rentals' }, guarded(<WithSidebar page={RentalSearchPage} />)),
  ...aliases(['villas', 'luxury-villas'], { view: 'villas' }, guarded(<WithSidebar page={VillaSearchPage} />)),
  page('property/:propertyId', { view: 'search', detail: 'property', pageParams: ['propertyId'] }, <PropertyRoute />),
  page('explore-cities', { view: 'explore-cities' }, <CityRecommendations />),
  page('explore-cities/:city/:country', { view: 'city-dashboard', pageParams: ['city', 'country'] }, <CityDashboard />),

  // People and businesses
  page('agents', { view: 'agents' }, guarded(<AgentsPage />)),
  page('agents/:agentId', { view: 'agents', detail: 'agent', scrollParams: ['agentId'] }, guarded(<AgentsPage />)),
  page('agencies', { view: 'agencies' }, guarded(<AgenciesListPage />)),
  page('agencies/*', { view: 'agencies', detail: 'agency', pageParams: ['*'] }, <AgencyRoute />),
  page('business-directory', { view: 'business-directory' }, <BusinessDirectoryRoute />),
  page('business-directory/businesses', { view: 'business-directory' }, <BusinessDirectoryRoute tab="businesses" />),
  page('business-directory/individuals', { view: 'business-directory' }, <BusinessDirectoryRoute tab="individuals" />),
  page('business-directory/mine', { view: 'business-directory' }, <BusinessDirectoryRoute tab="mine" />),
  page(
    'business-directory/:listingSlug',
    { view: 'business-directory', detail: 'business-listing', scrollParams: ['listingSlug'] },
    <BusinessDirectoryRoute />,
  ),

  // The user's own space
  page('saved-searches', { view: 'saved-searches', ...noindex }, <SavedSearchesPage />),
  page('saved-properties', { view: 'saved-properties', ...noindex }, <SavedPropertiesPage />),
  page('inbox', { view: 'inbox', ...noindex }, <InboxPage />),
  page('account', { view: 'account', ...noindex }, <MyAccountPage />),
  page('account/:tab', { view: 'account', ...noindex }, <MyAccountPage />),
  page('settings/notifications', { view: 'account', ...noindex }, <Redirect to={paths.account('notifications')} />),
  page('create-listing', { view: 'create-listing', ...noindex }, <ListingEditorRoute kind="sale" />),
  page('create-rental', { view: 'create-rental', ...noindex }, <ListingEditorRoute kind="rent" />),
  page('edit-listing/:propertyId', { view: 'create-listing', ...noindex, pageParams: ['propertyId'] }, <ListingEditorRoute kind="edit" />),
  page('analytics', { view: 'analytics' }, guarded(<AnalyticsPage />)),

  // Dashboards
  ...aliases(['admin', 'admin/:section'], { view: 'admin', ...noindex }, <AdminRoute>{guarded(<AdminDashboard />)}</AdminRoute>),
  ...aliases(
    ['agency-dashboard', 'agency-dashboard/:section'],
    { view: 'agency-dashboard', ...noindex },
    <SignedInRoute>{guarded(<AgencyDashboardPage />)}</SignedInRoute>,
  ),
  page('create-agency', { view: 'createAgency' }, <CreateAgencyPage />),
  page('create-agency/payment', { view: 'createAgencyPayment' }, <AgencyPaymentPage />),
  page('create-agency/confirm', { view: 'createAgencyConfirm' }, <AgencyPaymentPage />),

  // Content
  ...aliases(['how-it-works', 'how-it-works/:tab'], { view: 'how-it-works' }, <HowItWorksPage />),
  page('blog', { view: 'blog' }, guarded(<BlogPage />)),
  page('blog/:slug', { view: 'blog', pageParams: ['slug'] }, guarded(<BlogPage />)),
  page('guides', { view: 'guides' }, <BuyingGuidesPage />),
  page('valuation', { view: 'valuation' }, <ValuationPage />),
  page('mortgage-calculator', { view: 'mortgage-calculator' }, <MortgageCalculatorPage />),
  page('subscribe', { view: 'pricing' }, <PricingPage />),
  page('pricing', { view: 'pricing' }, <Redirect to={paths.pricing()} />),
  page('contact', { view: 'contact' }, <ContactUsPage />),
  ...aliases(['privacy', 'privacy-policy'], { view: 'privacy' }, <PrivacyPolicyPage />),
  ...aliases(['terms', 'terms-of-service'], { view: 'terms' }, <TermsOfServicePage />),
  ...aliases(['cookies', 'cookie-policy'], { view: 'cookies' }, <CookiePolicyPage />),
  ...aliases(['refund', 'refund-policy'], { view: 'refund' }, <RefundPolicyPage />),

  // Auth and payment callbacks
  page('login', { view: 'search' }, <AuthModalRoute view="login" />),
  page('register', { view: 'search' }, <AuthModalRoute view="signup" />),
  // The OAuth token is read off this URL by AppShell before anything renders.
  page('auth/callback', { view: 'search' }, guarded(<WithSidebar page={SearchPage} />)),
  page('reset-password', { view: 'reset-password' }, <ResetPasswordPage />),
  page('verify-email', { view: 'verify-email' }, <VerifyEmailPage />),
  page('payment/success', { view: 'pricing', ...noindex }, <PaymentSuccess />),
  page('payment/cancel', { view: 'pricing', ...noindex }, <PaymentCancel />),

  // Anything else goes to the landing page.
  page('*', { view: 'home' }, <Redirect to={paths.home()} keepQuery={false} />),
];

/**
 * The route tree around the app shell. The shell (layout, modals, auth gates)
 * renders once and hosts the matched page in its `<Outlet />`.
 */
export function appRoutes(shell: React.ReactNode): RouteObject[] {
  return [
    {
      path: '/',
      element: shell,
      children: [
        { index: true, element: <LanguageRedirect /> },
        { path: ':lang', element: <LanguageGate />, children: pageRoutes },
      ],
    },
  ];
}

export function createAppRouter(shell: React.ReactNode) {
  const router = createBrowserRouter(appRoutes(shell));
  registerRouter(router);
  return router;
}
