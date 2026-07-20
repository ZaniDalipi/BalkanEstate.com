// Canonical list of banner placement slots across the site.
// Keep in sync with the backend list in `backend/src/models/AdBanner.ts`.

export type AdPlacement =
  | 'home-top'
  | 'home-below-hero'
  | 'home-mid'
  | 'search-top'
  | 'search-sidebar'
  | 'property-details-top'
  | 'property-details-sidebar'
  | 'agencies-top'
  | 'agents-top'
  | 'blog-sidebar'
  | 'global-sticky-bottom';

export interface PlacementDef {
  id: AdPlacement;
  /** Human-readable label shown in the admin UI. */
  label: string;
  /** Where on the site this slot renders. */
  description: string;
  /** Recommended creative dimensions (guidance for advertisers). */
  recommendedSize: string;
  /** Whether this slot is a sticky/fixed placement by nature. */
  sticky?: boolean;
}

export const PLACEMENTS: PlacementDef[] = [
  {
    id: 'home-top',
    label: 'Homepage — Top',
    description: 'Full-width banner at the very top of the homepage.',
    recommendedSize: '1200 × 200',
  },
  {
    id: 'home-below-hero',
    label: 'Homepage — Below Hero',
    description: 'Banner directly beneath the homepage hero/search area.',
    recommendedSize: '1200 × 200',
  },
  {
    id: 'home-mid',
    label: 'Homepage — Mid Page',
    description: 'Banner between homepage content sections.',
    recommendedSize: '1200 × 200',
  },
  {
    id: 'search-top',
    label: 'Search — Top',
    description: 'Banner above the property search results.',
    recommendedSize: '970 × 120',
  },
  {
    id: 'search-sidebar',
    label: 'Search — Sidebar',
    description: 'Vertical banner in the search results sidebar.',
    recommendedSize: '300 × 600',
  },
  {
    id: 'property-details-top',
    label: 'Property Details — Top',
    description: 'Banner at the top of a single property page.',
    recommendedSize: '970 × 120',
  },
  {
    id: 'property-details-sidebar',
    label: 'Property Details — Sidebar',
    description: 'Banner in the property details contact sidebar.',
    recommendedSize: '300 × 250',
  },
  {
    id: 'agencies-top',
    label: 'Agencies Page — Top',
    description: 'Banner at the top of the agencies directory.',
    recommendedSize: '970 × 120',
  },
  {
    id: 'agents-top',
    label: 'Agents Page — Top',
    description: 'Banner at the top of the agents directory.',
    recommendedSize: '970 × 120',
  },
  {
    id: 'blog-sidebar',
    label: 'Blog — Sidebar',
    description: 'Vertical banner in the blog sidebar.',
    recommendedSize: '300 × 600',
  },
  {
    id: 'global-sticky-bottom',
    label: 'Sticky Bottom Bar (site-wide)',
    description: 'Sticky banner fixed to the bottom of the viewport on every page.',
    recommendedSize: '970 × 90',
    sticky: true,
  },
];

export const PLACEMENT_MAP: Record<AdPlacement, PlacementDef> = PLACEMENTS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<AdPlacement, PlacementDef>
);

export const BILLING_PERIODS = ['weekly', 'monthly', 'quarterly', 'yearly', 'one-time'] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];
