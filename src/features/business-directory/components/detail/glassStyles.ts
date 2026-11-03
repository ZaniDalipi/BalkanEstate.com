/**
 * Liquid-glass surfaces for the business profile, in the Apple light style:
 * translucent white over a soft tinted backdrop, a hairline edge, an inner
 * top highlight and a wide, faint shadow. Blur is kept to the few surfaces
 * that float over moving content (bars, the identity card) — see the WebKit
 * note in src/index.css.
 */

/** A content card. */
export const GLASS_CARD =
  'relative rounded-[28px] bg-white/75 ring-1 ring-black/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_40px_-12px_rgba(15,23,42,0.12)]';

/** A card floating over the banner or page: carries the blur. */
export const GLASS_FLOAT =
  'relative rounded-[28px] bg-white/70 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_20px_50px_-20px_rgba(15,23,42,0.25)]';

/** A frosted bar fixed to the top or bottom of the screen. */
export const GLASS_BAR = 'bg-white/72 backdrop-blur-xl backdrop-saturate-150';

/** A round icon button on glass (44px touch target). */
export const GLASS_ICON_BUTTON =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/60 text-neutral-800 ring-1 ring-black/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:bg-white active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** A small chip on glass (facts, services, areas). */
export const GLASS_CHIP =
  'inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-sm font-medium text-neutral-700 ring-1 ring-black/[0.06]';

/** Primary filled action (Apple blue). */
export const PRIMARY_ACTION =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-semibold text-white shadow-[0_8px_20px_-8px_rgba(2,82,205,0.6)] transition hover:bg-primary-dark active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

/** Secondary tinted action. */
export const SECONDARY_ACTION =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-primary/10 px-4 font-semibold text-primary transition hover:bg-primary/15 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
