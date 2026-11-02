/** How far (px) a form sheet must be pulled down to close when let go slowly. */
export const SHEET_DISMISS_DISTANCE = 140;
/** A flick this fast (px/s) downwards closes it from a shorter pull. */
export const SHEET_DISMISS_VELOCITY = 500;

/**
 * Whether letting go of a pulled-down form sheet closes it, like an iOS sheet:
 * a long enough pull, or a quick downward flick that has started moving.
 */
export const shouldDismissSheet = (offsetY: number, velocityY: number): boolean =>
  offsetY >= SHEET_DISMISS_DISTANCE || (velocityY >= SHEET_DISMISS_VELOCITY && offsetY > 24);
