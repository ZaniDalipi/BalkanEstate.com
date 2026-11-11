import { SHORT_LANDSCAPE_QUERY } from '@/src/hooks/useMediaQuery';

/**
 * Where the apartment details card sits beside the showcase (tablet and up):
 * beside it on wide screens and phones held sideways (`lg:` / `landscape:`),
 * along the bottom on a tablet held upright, where side by side would leave the
 * plan ~300px. The stage area is what the card leaves free; the plan sizes
 * itself to it (container units), never to the whole screen.
 */
export const SIDE_BY_SIDE_QUERY = `(min-width: 1024px), ${SHORT_LANDSCAPE_QUERY}`;

export const STAGE_AREA =
  'absolute inset-x-0 top-0 bottom-[calc(44dvh+1.5rem)] lg:bottom-0 lg:right-[min(468px,45%)] landscape:bottom-0 landscape:right-[min(376px,47%)]';

export const CARD_POSITION =
  'absolute inset-x-4 bottom-4 max-h-[44dvh] lg:inset-x-auto lg:bottom-auto lg:right-6 lg:top-1/2 lg:max-h-[calc(100dvh-3rem)] lg:w-[min(420px,calc(100%-3rem))] lg:-translate-y-1/2 landscape:inset-x-auto landscape:bottom-auto landscape:right-3 landscape:top-1/2 landscape:max-h-[calc(100dvh-1.5rem)] landscape:w-[min(360px,46%)] landscape:-translate-y-1/2';
