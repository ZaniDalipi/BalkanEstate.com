/**
 * Liquid-glass surfaces for the business profile, in the Apple style. The
 * material itself (frost, light-catching rim, top sheen, layered shadow) lives
 * in src/index.css as .liquid-*; these add shape, spacing and type.
 */

/** A content card. */
export const GLASS_CARD = 'liquid-surface rounded-[28px]';

/** The card floating over the banner. */
export const GLASS_FLOAT = 'liquid-surface rounded-[30px]';

/** A frosted bar or capsule fixed to the screen edge. */
export const GLASS_BAR = 'liquid-surface';

/** A round icon button on glass (44px touch target). */
export const GLASS_ICON_BUTTON =
  'liquid-control inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-800 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** A small chip on glass (facts, highlights). */
export const GLASS_CHIP = 'liquid-control inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-neutral-800';

/** Primary action: blue tinted glass. */
export const PRIMARY_ACTION =
  'liquid-tint inline-flex items-center justify-center gap-2 rounded-2xl px-4 font-semibold active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

/** Secondary action: clear glass with blue text. */
export const SECONDARY_ACTION =
  'liquid-control inline-flex items-center justify-center gap-2 rounded-2xl px-4 font-semibold text-primary active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** A frosted tile (stats on phones, contact icons). */
export const GLASS_TILE = 'liquid-control rounded-2xl';

/** Smoky glass pill over a photo. */
export const GLASS_ON_PHOTO = 'liquid-dark rounded-full';
