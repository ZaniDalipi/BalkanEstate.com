import React from 'react';
import AdSlot from './Slot';
import type { AdPage } from '../types';

/** How many listing cards go between one in-feed ad and the next. */
const DEFAULT_EVERY = 6;
/**
 * Most in-feed ads on one screenful of results. Results lists are infinite, so
 * without a cap a long scroll would turn into more ad than listing — which
 * reads as spam and is the sort of thing AdSense penalises.
 */
const DEFAULT_MAX = 3;

/**
 * The first `index` an in-feed slot may use.
 *
 * Index 0 of the `in-content` placement belongs to the banner at the top of the
 * page, so in-feed slots start at 1. That also means they only show a booked
 * banner once the admin has more than one for the page; otherwise they fall
 * through to AdSense, which is the point of them.
 */
const FIRST_INDEX = 1;

interface InFeedAdProps {
  page: AdPage;
  /** Which banner within the `in-content` placement this slot draws from. */
  index: number;
}

/**
 * One ad sitting in a listing grid, between the cards.
 *
 * It spans every column, so it reads as a break in the feed rather than
 * something pretending to be a listing — cards and ads look alike enough that
 * an ad shaped like a listing is genuinely misleading.
 *
 * `hidePlaceholder` is set deliberately: the "Your Ad Here" card is right on a
 * page about advertising, but three of them interleaved with someone's search
 * results just looks broken. With nothing to show, the slot disappears.
 */
export const InFeedAd: React.FC<InFeedAdProps> = ({ page, index }) => (
  <div style={{ gridColumn: '1 / -1' }} className="my-1">
    <AdSlot
      page={page}
      placement="in-content"
      index={index}
      format="leaderboard"
      hidePlaceholder
    />
  </div>
);

/**
 * Splices in-feed ads into a list of listing cards.
 *
 * Returns a new array for the grid to render, so a call site only changes from
 * `items.map(...)` to `interleaveInFeedAds(items.map(...), page)`.
 */
export function interleaveInFeedAds(
  cards: React.ReactNode[],
  page: AdPage,
  { every = DEFAULT_EVERY, max = DEFAULT_MAX }: { every?: number; max?: number } = {},
): React.ReactNode[] {
  // Nothing to break up: a short result set gets no ads at all.
  if (cards.length <= every) return cards;

  const out: React.ReactNode[] = [];
  let placed = 0;

  cards.forEach((card, i) => {
    out.push(card);
    const isBreak = (i + 1) % every === 0;
    // Never trail an ad after the last card — that is the page's own banner
    // slot's job, and two in a row at the end looks like a mistake.
    const hasMoreCards = i < cards.length - 1;
    if (isBreak && hasMoreCards && placed < max) {
      out.push(
        <InFeedAd key={`in-feed-ad-${placed}`} page={page} index={FIRST_INDEX + placed} />,
      );
      placed += 1;
    }
  });

  return out;
}

export default InFeedAd;
