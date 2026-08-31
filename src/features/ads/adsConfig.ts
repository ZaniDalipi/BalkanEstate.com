/**
 * Google AdSense configuration.
 *
 * Everything here is driven by build-time env vars so that no publisher or slot
 * id is hard-coded, and so an environment without them (local dev, preview
 * builds, self-hosted forks) simply renders no ads instead of empty grey boxes.
 *
 *   VITE_ADSENSE_CLIENT=ca-pub-0000000000000000
 *   VITE_ADSENSE_SLOT_<PLACEMENT>=1234567890
 *
 * A placement with no slot id configured is skipped entirely — nothing is
 * rendered and no space is reserved, so a partially configured account can
 * never leave a hole in the layout.
 */

/** Every ad position the app knows about. Add a slot id per placement in env. */
export type AdPlacement =
  | 'homeBillboard' // wide unit between the hero stats and "How it works"
  | 'homeRailLeft' // left skyscraper beside the agency/agent podiums
  | 'homeRailRight' // right skyscraper beside the agency/agent podiums
  | 'homeInFeed' // horizontal unit between two home sections
  | 'searchList' // inside the results list, between cards
  | 'propertyInArticle' // in the property page body, under the map
  | 'propertySidebar' // rectangle under the contact card on desktop
  | 'blogList' // between article cards on the blog index
  | 'blogArticle' // inside a blog article body
  | 'guides' // on the buying-guides page
  | 'cityDashboard' // on a city page, under the headline stats
  | 'anchor'; // dismissible bottom anchor unit

const rawClient = (import.meta.env.VITE_ADSENSE_CLIENT || '').trim();

/**
 * The publisher id, normalised to the `ca-pub-…` form AdSense expects. Empty
 * when ads are not configured for this environment.
 */
export const ADSENSE_CLIENT: string = rawClient
  ? rawClient.startsWith('ca-pub-')
    ? rawClient
    : `ca-pub-${rawClient.replace(/^pub-/, '')}`
  : '';

const SLOT_ENV: Record<AdPlacement, string | undefined> = {
  homeBillboard: import.meta.env.VITE_ADSENSE_SLOT_HOME_BILLBOARD,
  homeRailLeft: import.meta.env.VITE_ADSENSE_SLOT_HOME_RAIL_LEFT,
  homeRailRight: import.meta.env.VITE_ADSENSE_SLOT_HOME_RAIL_RIGHT,
  homeInFeed: import.meta.env.VITE_ADSENSE_SLOT_HOME_IN_FEED,
  searchList: import.meta.env.VITE_ADSENSE_SLOT_SEARCH_LIST,
  propertyInArticle: import.meta.env.VITE_ADSENSE_SLOT_PROPERTY_IN_ARTICLE,
  propertySidebar: import.meta.env.VITE_ADSENSE_SLOT_PROPERTY_SIDEBAR,
  blogList: import.meta.env.VITE_ADSENSE_SLOT_BLOG_LIST,
  blogArticle: import.meta.env.VITE_ADSENSE_SLOT_BLOG_ARTICLE,
  guides: import.meta.env.VITE_ADSENSE_SLOT_GUIDES,
  cityDashboard: import.meta.env.VITE_ADSENSE_SLOT_CITY_DASHBOARD,
  anchor: import.meta.env.VITE_ADSENSE_SLOT_ANCHOR,
};

/** The configured slot id for a placement, or null when it is not set up. */
export const getAdSlotId = (placement: AdPlacement): string | null => {
  const slot = (SLOT_ENV[placement] || '').trim();
  return slot ? slot : null;
};

/** True when this build has a publisher id, i.e. ads can be served at all. */
export const isAdSenseConfigured = (): boolean => ADSENSE_CLIENT.length > 0;

/** True when this specific placement is ready to render. */
export const isPlacementEnabled = (placement: AdPlacement): boolean =>
  isAdSenseConfigured() && getAdSlotId(placement) !== null;

/**
 * Views where ads are deliberately never shown: private/transactional surfaces
 * where a third-party ad would be a distraction, a policy risk, or plainly
 * inappropriate next to someone's own data or a payment form.
 */
const AD_FREE_VIEWS = new Set<string>([
  'admin',
  'agency-dashboard',
  'analytics',
  'inbox',
  'account',
  'my-listings',
  'create-listing',
  'create-rental',
  'createAgency',
  'createAgencyPayment',
  'createAgencyConfirm',
  'pricing',
  'reset-password',
  'verify-email',
]);

/** Whether ads may be shown on a given app view. */
export const isAdFreeView = (view: string | null | undefined): boolean =>
  !!view && AD_FREE_VIEWS.has(view);
