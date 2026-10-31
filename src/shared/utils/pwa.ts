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

/** Decodes a base64 `data:` URL into a Blob synchronously (keeps user activation). */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data = ''] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
  const isBase64 = header.includes(';base64');
  const raw = isBase64 ? atob(data) : decodeURIComponent(data);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Saves an image (a `data:` URL or a Blob) to the user's device, including on
 * iOS Safari and installed PWAs.
 *
 * `<a href="data:..." download>` does nothing in iOS Safari and, in a standalone
 * PWA, navigates the app window to the data URL (showing an error page). On
 * touch devices / PWAs we hand the file to the native share sheet instead, which
 * offers "Save Image" (Photos) and "Save to Files". Elsewhere we download a
 * blob: URL via a programmatic anchor click.
 *
 * Must be called directly from a click handler: decoding is synchronous so the
 * user activation required by `navigator.share` is still valid.
 */
export async function saveImage(source: string | Blob, filename: string): Promise<void> {
  const blob = typeof source === 'string' ? dataUrlToBlob(source) : source;
  const preferShare = isPWA() || window.matchMedia('(pointer: coarse)').matches;

  if (preferShare && typeof File !== 'undefined' && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type || 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err: any) {
        // User closed the share sheet — nothing else to do.
        if (err?.name === 'AbortError') return;
        // Otherwise (e.g. NotAllowedError) fall through to a regular download.
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Give the browser time to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
