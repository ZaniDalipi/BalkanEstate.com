/**
 * /og-image.png — the first share picture ("Balkan Estate — Find Your Dream
 * Property in the Balkans"), shown as og:image from February to May 2026 and
 * then deleted. The current picture is /og-image.jpg.
 *
 * Without this function the old address fell through to the SPA shell with a
 * 200, so search engines, AI search and social sites saw no sign that the
 * picture was gone and kept showing their stored copy. "410 Gone" tells them
 * it was removed for good, so they drop it from their indexes and caches.
 * (_headers rules do not apply to Function responses, so the year-long cache
 * rule for *.png does not reach this answer.)
 */

export const REMOVED_IMAGE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, noimageindex',
};

export const onRequest = (): Response =>
  new Response('This image has been removed.', { status: 410, headers: REMOVED_IMAGE_HEADERS });
