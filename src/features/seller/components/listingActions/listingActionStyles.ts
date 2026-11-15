// Look of each listing-action tone. Every button shares one size and shape
// (LISTING_ACTION_BASE); only the colours change.

import type { ListingActionTone } from '../../utils/listingActions';

/**
 * Shared size and shape. Inside the bar's container: a row (icon beside the
 * label) on narrow cards, a tile (icon above the label) once the card is wide
 * enough to hold every action in one line.
 */
export const LISTING_ACTION_BASE =
  'group relative flex h-full min-h-[44px] w-full min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 ' +
  '@md:min-h-[4.25rem] @md:flex-col @md:gap-1 @md:px-2 ' +
  'text-sm font-semibold leading-tight transition-all duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary ' +
  'motion-safe:active:scale-[0.98]';

export const LISTING_ACTION_LABEL =
  'line-clamp-2 min-w-0 text-left break-words hyphens-auto @md:text-center @md:text-[13px]';

/** Grid cell width on narrow cards; wide cards always use one equal column per action. */
export const LISTING_ACTION_SPAN: Record<'full' | 'half', string> = {
  full: 'col-span-2 @md:col-span-1',
  half: 'col-span-1',
};

/** Narrow: two columns. Wide: every action in one row of equal columns. */
export const LISTING_ACTION_GRID =
  'grid auto-rows-fr grid-cols-2 gap-2 @md:grid-flow-col @md:auto-cols-fr @md:grid-cols-none';

export const LISTING_ACTION_TONES: Record<ListingActionTone, string> = {
  promote: 'border-transparent bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm hover:from-violet-700 hover:to-purple-700 hover:shadow-md',
  extend: 'border-transparent bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:from-amber-600 hover:to-orange-600 hover:shadow-md',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  neutral: 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100',
  amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
  green: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
  blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
};

/** A blocked action stays focusable and clickable (to explain why) but looks inactive. */
export const LISTING_ACTION_BLOCKED = 'cursor-not-allowed opacity-55 saturate-50 hover:shadow-sm';
