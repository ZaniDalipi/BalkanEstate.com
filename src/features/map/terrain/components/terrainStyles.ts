/**
 * The look shared by every terrain panel and control: frosted glass surfaces,
 * pill buttons, quiet secondary text. Touch targets are 44 px.
 */

/** A frosted-glass surface floating over the map. */
export const GLASS =
  'bg-white/[0.88] backdrop-blur-2xl backdrop-saturate-150 border border-white/70 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.4)]';

export const PRIMARY_BUTTON =
  'w-full min-h-11 px-5 inline-flex items-center justify-center gap-2 text-[15px] font-semibold tracking-tight rounded-full bg-primary text-white hover:bg-primary-dark active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 disabled:cursor-not-allowed transition';

export const SECONDARY_BUTTON =
  'flex-1 min-h-11 px-4 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold rounded-full bg-black/[0.06] text-gray-900 hover:bg-black/10 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 disabled:cursor-not-allowed transition';

/** A round icon-only button. */
export const ICON_BUTTON =
  'flex items-center justify-center w-11 h-11 rounded-full text-gray-700 hover:bg-black/[0.06] active:bg-black/10 transition-colors';

/** A tinted card inside a panel. */
export const CARD = 'rounded-2xl bg-black/[0.045]';

export const BODY_TEXT = 'text-[13px] leading-relaxed text-gray-600';
export const CAPTION = 'text-[11px] leading-snug text-gray-500';
