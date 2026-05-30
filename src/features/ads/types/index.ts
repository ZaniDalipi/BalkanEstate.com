export type AdFormat =
  | 'auto'
  | 'horizontal'
  | 'vertical'
  | 'rectangle'
  | 'fluid';

export type AdLayout = 'in-article' | 'in-feed' | 'display';

export interface AdSlot {
  /** Google AdSense data-ad-slot value */
  slotId: string;
  format: AdFormat;
  layout?: AdLayout;
  /** Responsive auto-sizing — leave false only for fixed-size slots */
  responsive?: boolean;
}

export interface AdUnitProps {
  slot: AdSlot;
  className?: string;
  /** Suppress the ad entirely (e.g. during SSR or test env) */
  disabled?: boolean;
}

/** Ad slot registry — add new placements here only */
export const AD_SLOTS = {
  /** Leaderboard between hero and property grid on the home page */
  HOME_LEADERBOARD: {
    slotId: '1234567890',
    format: 'horizontal',
    responsive: true,
  } satisfies AdSlot,

  /** Rectangle between property cards in the search results feed */
  SEARCH_IN_FEED: {
    slotId: '0987654321',
    format: 'fluid',
    layout: 'in-feed',
    responsive: true,
  } satisfies AdSlot,

  /** Sidebar rectangle on property detail pages */
  PROPERTY_DETAIL_SIDEBAR: {
    slotId: '1122334455',
    format: 'rectangle',
    responsive: true,
  } satisfies AdSlot,

  /** In-article unit between description sections */
  PROPERTY_DETAIL_IN_ARTICLE: {
    slotId: '5544332211',
    format: 'fluid',
    layout: 'in-article',
    responsive: true,
  } satisfies AdSlot,

  /** Footer banner shown on all pages */
  FOOTER_BANNER: {
    slotId: '6677889900',
    format: 'horizontal',
    responsive: true,
  } satisfies AdSlot,
} as const;
