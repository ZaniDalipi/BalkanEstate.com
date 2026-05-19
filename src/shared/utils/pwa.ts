/** Returns true when the app is running as an installed PWA (standalone mode). */
export function isPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Returns true when an internal link should open in a new browser tab.
 * - PWA standalone → always false (everything stays in the single app window)
 * - Touch/mobile browser → false (new tabs are disruptive on small screens)
 * - Desktop browser → true (lets users compare multiple listings side-by-side)
 */
export function shouldOpenInNewTab(): boolean {
  if (isPWA()) return false;
  if (window.matchMedia('(pointer: coarse)').matches) return false;
  return true;
}
