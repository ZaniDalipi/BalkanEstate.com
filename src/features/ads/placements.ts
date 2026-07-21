// Canonical list of banner placement slots across the site.
// Keep in sync with the backend list in `backend/src/models/AdBanner.ts`.

export type AdPlacement =
  | 'home-top'
  | 'home-below-hero'
  | 'home-mid'
  | 'search-sidebar'
  | 'property-details-top'
  | 'property-details-sidebar';

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
    label: 'Homepage — Left Rail',
    description: 'Tall vertical skyscraper on the far-left of the homepage, beside the "Top Agents" section (very wide screens only).',
    recommendedSize: '160 × 600',
  },
  {
    id: 'home-below-hero',
    label: 'Homepage — After Stats',
    description: 'Wide leaderboard in the gap between the hero stats bar and the content sections.',
    recommendedSize: '1200 × 200',
  },
  {
    id: 'home-mid',
    label: 'Homepage — Right Rail',
    description: 'Tall vertical skyscraper on the far-right of the homepage, beside the "Top Agents" section (very wide screens only).',
    recommendedSize: '160 × 600',
  },
  {
    id: 'search-sidebar',
    label: 'Search — In Results',
    description: 'Full-width banner inside the results list, between property rows.',
    recommendedSize: '728 × 90',
  },
  {
    id: 'property-details-top',
    label: 'Property — In Content',
    description: 'Wide banner in the property details column, directly below the features/amenities.',
    recommendedSize: '728 × 90',
  },
  {
    id: 'property-details-sidebar',
    label: 'Property — Side Column',
    description: 'Tall banner in the property page right-hand column, beside the neighborhood & price-history sections.',
    recommendedSize: '300 × 600',
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
