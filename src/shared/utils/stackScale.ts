/**
 * How small a card in a scroll stack shrinks while the next one slides over
 * it: the first card shrinks most, the last not at all, so the pile looks
 * like a deck seen from above (4% per card still to come).
 */
export const stackScaleTarget = (index: number, total: number): number => 1 - Math.max(0, total - 1 - index) * 0.04;

/** Each card sits this many px lower than the one before it, so their tops peek out of the pile. */
export const stackOffsetPx = (index: number): number => index * 24;
