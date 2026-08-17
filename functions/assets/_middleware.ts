/**
 * Cloudflare Pages middleware for hashed build assets (/assets/*).
 *
 * The frontend is deployed to Cloudflare Pages with single-page-application
 * not-found handling: any path Pages cannot resolve to a file is served
 * index.html with a 200 status. That is what makes client-side routing / deep
 * links work, but it also means a request for a hashed chunk that is missing
 * from the current deployment — e.g. auth.<oldhash>.js requested by a stale
 * client (an open tab or a precached service worker) after a new deploy — comes
 * back as index.html (Content-Type: text/html, 200). The browser then tries to
 * parse that HTML as a JavaScript module and reports:
 *
 *   Failed to load module script: Expected a JavaScript-or-Wasm module script
 *   but the server responded with a MIME type of "text/html".
 *
 * Build assets are content-hashed and never legitimately resolve to HTML, so if
 * the SPA fallback ever answers an /assets/* request with text/html the asset is
 * genuinely missing. Convert that case into a real 404. A clean 404 makes the
 * module load fail as a network error rather than an unparseable HTML body, so
 * Vite's preload-error handling and the app's stale-chunk recovery
 * (src/utils/chunkRecovery.ts) can reload the page to a fresh bundle instead of
 * leaving the user on a broken screen.
 *
 * NOTE: public/_headers rules do NOT apply to responses that pass through a
 * Pages Function, so this middleware must re-assert the long-lived immutable
 * caching (and nosniff) that _headers defines for /assets/* — otherwise routing
 * assets through here would silently drop their caching. Everything under
 * /assets/* is content-hashed and immutable, so these values are correct for the
 * whole namespace.
 */

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onRequest = async (context: any) => {
  const response = await context.next();

  const contentType = response.headers.get('content-type') || '';

  // Missing hashed asset served as the SPA HTML fallback → return a real 404.
  if (response.status === 200 && contentType.includes('text/html')) {
    return new Response('Not Found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  // Real asset: re-apply the caching/security headers _headers would have set.
  const headers = new Headers(response.headers);
  headers.set('cache-control', IMMUTABLE_CACHE_CONTROL);
  headers.set('x-content-type-options', 'nosniff');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
