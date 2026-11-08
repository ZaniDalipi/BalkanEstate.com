/**
 * The warm paper the building washes out to when the buyer dives into an
 * apartment; the apartment showcase sits on the same colour, so the facade
 * fading away and the floor plan rising read as one move.
 */
export const DIVE_PAPER = '#f1ede6';

/** Bleaches the rendering into a white architectural model (warm, like card stock). */
export const GHOST_FILTER = 'grayscale(1) contrast(0.36) brightness(1.75) sepia(0.28)';

/**
 * The explorer canvas marks itself `data-immersed` while an apartment is being
 * dived into or is open. Stage controls (crumbs, chips, legend, camera arrows,
 * zoom) carry this class to fade out meanwhile and come back after; visibility
 * flips at the end of the fade, so hidden controls can't be clicked or tabbed to.
 */
export const HIDE_WHEN_IMMERSED =
  'transition-[opacity,visibility] duration-300 group-has-[[data-immersed=true]]/stage:invisible group-has-[[data-immersed=true]]/stage:opacity-0';
