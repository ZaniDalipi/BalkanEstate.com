// Recovery for stale-deploy chunk-load failures.
//
// After a deploy, Vite fingerprints every JS/CSS chunk with a new content hash
// and the old files are removed from the server. A client still running the
// previous build — an open tab, or (more commonly) a service worker serving a
// precached index.html that references the old hashes — will request a chunk
// like `auth.C3N3A8sS.js` that no longer exists. The SPA fallback then answers
// with index.html (Content-Type: text/html) and the browser reports
// "Failed to load module script … MIME type text/html".
//
// A plain window.location.reload() is NOT enough here: when the stale source is
// a precached service worker, the reload re-serves the very same stale HTML and
// the same chunk 404s again. So recovery must first tear down the service worker
// and every cache, then reload to fetch a clean bundle. Every recovery path in
// the app (index.tsx module-script listeners, the React ErrorBoundary, and the
// lazyWithRetry wrapper) funnels through this one function so behaviour and the
// loop-prevention throttle stay consistent.

const HARD_RECOVER_KEY = 'be:hard-recover';
const THROTTLE_MS = 30000;

/**
 * Returns true if a recovery was attempted within the throttle window (so the
 * caller should back off and let the in-app ErrorBoundary render a fallback
 * instead of reloading forever). Records the attempt timestamp otherwise.
 */
function recentlyAttempted(): boolean {
  try {
    const last = Number(sessionStorage.getItem(HARD_RECOVER_KEY) || '0');
    if (last && Date.now() - last < THROTTLE_MS) return true;
    sessionStorage.setItem(HARD_RECOVER_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode / blocked storage): fall through
    // and attempt recovery once, accepting we can't track loops here.
  }
  return false;
}

/**
 * Heuristic: does this error look like a stale-deploy chunk-load failure?
 * Covers the various messages browsers and bundlers use across engines.
 */
export function isChunkLoadError(error: unknown): boolean {
  const err = error as { message?: string; name?: string } | null;
  const message = err?.message || '';
  const name = err?.name || '';
  return (
    name === 'ChunkLoadError' ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk') ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Failed to load module script')
  );
}

/**
 * Hard recovery for a stale-deploy chunk failure: unregister every service
 * worker, delete every cache, then reload once to pull a fresh bundle. Throttled
 * to once per short window so a problem recovery cannot fix does not turn into an
 * endless reload loop. Best-effort — reloads even if teardown partially fails.
 */
export async function recoverFromStaleChunk(): Promise<void> {
  if (recentlyAttempted()) return;
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // best-effort cleanup; reload regardless
  }
  window.location.reload();
}
