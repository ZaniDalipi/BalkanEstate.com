/**
 * Safari Mobile fix: "Response served by service worker has redirections"
 *
 * Safari (WebKit) rejects any Response served by a service worker's
 * `FetchEvent.respondWith()` when `response.redirected === true`.
 * This happens when the original fetch (e.g. for index.html during precache
 * or a CDN-level redirect like HTTP→HTTPS / www→apex) returned a 3xx that
 * was transparently followed by the browser, leaving the flag set.
 *
 * Fix: For navigation requests, we intercept before Workbox's handlers and
 * serve a clean copy of the response with `redirected` stripped out.
 * This script is loaded via Workbox's `importScripts` so it registers its
 * fetch listener before Workbox, giving it first-responder priority.
 */
self.addEventListener('fetch', (event) => {
  // Only handle top-level navigation (HTML page loads)
  if (event.request.mode !== 'navigate') return;

  const url = new URL(event.request.url);

  // Let API and auth routes pass through without SW intervention
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/callback')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Look for precached index.html first (any Workbox precache version)
        const allCacheNames = await caches.keys();
        for (const name of allCacheNames) {
          if (!name.startsWith('workbox-precache')) continue;
          const cache = await caches.open(name);
          // Workbox stores precache entries with a revision query param
          const keys = await cache.keys();
          for (const key of keys) {
            if (new URL(key.url).pathname === '/index.html') {
              const cached = await cache.match(key);
              if (cached) {
                if (!cached.redirected) return cached;
                // Strip the redirected flag by constructing a fresh Response
                return new Response(cached.body, {
                  headers: cached.headers,
                  status: cached.status,
                  statusText: cached.statusText,
                });
              }
            }
          }
        }

        // No precache hit — try the network
        const response = await fetch(event.request);
        if (!response.redirected) return response;
        return new Response(response.body, {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText,
        });
      } catch (_e) {
        // Offline fallback: try any cached index.html
        const cached = await caches.match('/index.html');
        if (cached) return cached;
        return new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })()
  );
});
