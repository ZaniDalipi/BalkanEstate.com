/** Returns true when the app is running as an installed PWA (standalone mode). */
export function isPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Opens an external URL reliably from any context, including installed PWAs.
 *
 * `window.open(url, '_blank')` is unreliable on mobile: in iOS standalone PWAs
 * it frequently returns null and opens nothing, and on all mobile browsers the
 * call is blocked unless it happens synchronously inside a user gesture.
 * A programmatic anchor click hands the URL to the OS/browser (so map links can
 * deep-link into the native Maps app) and preserves the user-activation, so it
 * must be called directly from the event handler — never after an await or an
 * async callback such as `navigator.geolocation.getCurrentPosition`.
 */
export function openExternalUrl(url: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
