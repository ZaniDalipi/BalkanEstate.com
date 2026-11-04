/** One full turn of the spinner, in seconds. Keep in step with `.be-circle-spinner` in index.css. */
export const SPINNER_TURN_S = 0.8;

/**
 * The spinner's angle right now, as a fraction of a turn in [0, 1).
 *
 * Measured from page start (`performance.now()`), which is also when the boot
 * spinner in index.html began turning, so every spinner on screen — and every
 * one that replaces another — points the same way.
 */
export function spinnerPhase(nowMs: number, turnS: number = SPINNER_TURN_S): number {
  const turnMs = turnS * 1000;
  const phase = (nowMs % turnMs) / turnMs;
  return phase < 0 ? phase + 1 : phase;
}

/** A negative `animation-delay` that starts the spin at the current angle. */
export function spinnerPhaseDelay(nowMs: number = typeof performance !== 'undefined' ? performance.now() : 0): string {
  const seconds = spinnerPhase(nowMs) * SPINNER_TURN_S;
  return `${-Number(seconds.toFixed(3))}s`;
}
