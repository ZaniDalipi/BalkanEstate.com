/**
 * Every in-app URL, built in one place.
 *
 * Paths here carry no language prefix — `navigate()` and `localizePath()` add
 * it — so a caller only ever says *where* to go, never *how* the URL is
 * spelled. Add a builder here before linking to a new page; a hand-written
 * `'/agents/' + id` somewhere else is how two spellings of one page start.
 *
 * Dynamic segments are encoded, so an id or slug containing `/`, `?` or `#`
 * cannot break out of its segment. `useParams()` decodes them again.
 */

import type { AppView, AdminSection, AgencyDashboardSection, HowItWorksTab } from '@/types';

export type QueryInit = Record<string, string | number | boolean | null | undefined>;

const seg = (value: string | number) => encodeURIComponent(String(value));

/** Append a query string built from `query`, skipping empty values. */
export function withQuery(path: string, query?: QueryInit): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export type BusinessDirectoryTab = 'businesses' | 'individuals' | 'mine';

export const paths = {
  home: () => '/',
  search: (query?: QueryInit) => withQuery('/search', query),
  rentals: (query?: QueryInit) => withQuery('/rentals', query),
  villas: (query?: QueryInit) => withQuery('/villas', query),

  exploreCities: (query?: QueryInit) => withQuery('/explore-cities', query),
  cityDashboard: (city: string, country: string) => `/explore-cities/${seg(city)}/${seg(country)}`,

  property: (idOrSlug: string) => `/property/${seg(idOrSlug)}`,
  createListing: () => '/create-listing',
  createRental: () => '/create-rental',
  editListing: (propertyId: string) => `/edit-listing/${seg(propertyId)}`,

  agents: () => '/agents',
  agent: (agentId: string) => `/agents/${seg(agentId)}`,
  agencies: () => '/agencies',
  /**
   * An agency's slug is `country/name` — two segments. The legacy comma form
   * (`serbia,belgrade-homes`) is written the same way.
   */
  agency: (slug: string) => `/agencies/${slug.split(/[,/]/).filter(Boolean).map(seg).join('/')}`,
  /** An agency record's page: by slug when it has one, else by id. */
  agencyOf: (agency: { slug?: string; _id?: string; id?: string }): string =>
    paths.agency(agency.slug || agency._id || agency.id || ''),
  createAgency: () => '/create-agency',
  createAgencyPayment: () => '/create-agency/payment',
  createAgencyConfirm: () => '/create-agency/confirm',

  businessDirectory: (tab?: BusinessDirectoryTab) =>
    tab ? `/business-directory/${tab}` : '/business-directory',
  businessListing: (slugOrId: string) => `/business-directory/${seg(slugOrId)}`,

  savedSearches: () => '/saved-searches',
  savedProperties: () => '/saved-properties',
  inbox: (query?: QueryInit) => withQuery('/inbox', query),
  account: (tab?: string) => (tab ? `/account/${seg(tab)}` : '/account'),
  analytics: () => '/analytics',

  admin: (section?: AdminSection) => (section && section !== 'dashboard' ? `/admin/${section}` : '/admin'),
  agencyDashboard: (section?: AgencyDashboardSection) =>
    section && section !== 'overview' ? `/agency-dashboard/${section}` : '/agency-dashboard',

  howItWorks: (tab?: HowItWorksTab) => (tab ? `/how-it-works/${tab}` : '/how-it-works'),
  blog: () => '/blog',
  blogArticle: (slug: string) => `/blog/${seg(slug)}`,
  guides: () => '/guides',
  valuation: () => '/valuation',
  mortgageCalculator: () => '/mortgage-calculator',
  pricing: () => '/subscribe',
  contact: () => '/contact',
  privacy: () => '/privacy',
  terms: () => '/terms',
  cookies: () => '/cookies',
  refund: () => '/refund',

  login: () => '/login',
  register: () => '/register',
  resetPassword: () => '/reset-password',
  verifyEmail: () => '/verify-email',
  paymentSuccess: () => '/payment/success',
  paymentCancel: () => '/payment/cancel',
} as const;

/**
 * The landing path of each top-level view — what the sidebar, the bottom nav
 * and a post-login redirect navigate to when all they know is a view name.
 * Views that only exist with an id in the URL (a listing, a profile) are
 * absent: there is no page to land on without one.
 */
const VIEW_PATHS: Partial<Record<AppView, string>> = {
  home: paths.home(),
  search: paths.search(),
  rentals: paths.rentals(),
  villas: paths.villas(),
  'explore-cities': paths.exploreCities(),
  'saved-searches': paths.savedSearches(),
  'saved-properties': paths.savedProperties(),
  inbox: paths.inbox(),
  account: paths.account(),
  'my-listings': paths.account('listings'),
  'create-listing': paths.createListing(),
  'create-rental': paths.createRental(),
  agents: paths.agents(),
  agencies: paths.agencies(),
  'business-directory': paths.businessDirectory(),
  admin: paths.admin(),
  'agency-dashboard': paths.agencyDashboard(),
  analytics: paths.analytics(),
  'how-it-works': paths.howItWorks(),
  blog: paths.blog(),
  guides: paths.guides(),
  valuation: paths.valuation(),
  'mortgage-calculator': paths.mortgageCalculator(),
  pricing: paths.pricing(),
  contact: paths.contact(),
  privacy: paths.privacy(),
  terms: paths.terms(),
  cookies: paths.cookies(),
  refund: paths.refund(),
  'reset-password': paths.resetPassword(),
  'verify-email': paths.verifyEmail(),
  createAgency: paths.createAgency(),
  createAgencyPayment: paths.createAgencyPayment(),
  createAgencyConfirm: paths.createAgencyConfirm(),
};

/** The landing path for `view`, or null when the view has no page of its own. */
export function pathForView(view: AppView): string | null {
  return VIEW_PATHS[view] ?? null;
}
