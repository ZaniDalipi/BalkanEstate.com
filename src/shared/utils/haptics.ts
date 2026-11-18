/** Shortest pulse most phones will actually render, in ms. */
const TAP_MS = 8;

/**
 * A light "tick" for a tap that changes something (a switch, a picker), like
 * iOS selection feedback. Where the browser has no vibration (iOS Safari) it
 * does nothing, and it never throws.
 */
export function tapHaptic(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(TAP_MS);
  } catch {
    /* feedback is a nicety; never let it break the tap */
  }
}
