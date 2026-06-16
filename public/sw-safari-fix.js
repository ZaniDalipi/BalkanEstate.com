/**
 * Safari Mobile fix: "Response served by service worker has redirections"
 *
 * Safari (WebKit) rejects any Response served by a service worker's
 * `FetchEvent.respondWith()` when `response.redirected === true`.
 *
 * Strategy: network-first for all navigation requests. This ensures the
 * browser always gets the latest index.html (with current JS bundle hashes)
 * rather than a stale precached copy that may reference dead bundle files.
 * The precache is only used as an offline fallback.
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
        // Network-first: always fetch fresh index.html so JS bundle hashes are current
        const response = await fetch(event.request);
        // Strip the redirected flag to prevent Safari rejecting the response
        if (!response.redirected) return response;
        return new Response(response.body, {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText,
        });
      } catch (_e) {
        // Offline fallback: serve precached index.html if available
        const allCacheNames = await caches.keys();
        for (const name of allCacheNames) {
          if (!name.startsWith('workbox-precache')) continue;
          const cache = await caches.open(name);
          const keys = await cache.keys();
          for (const key of keys) {
            if (new URL(key.url).pathname === '/index.html') {
              const cached = await cache.match(key);
              if (cached) return cached;
            }
          }
        }
        const fallback = await caches.match('/index.html');
        if (fallback) return fallback;
        return new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })()
  );
});
