/**
 * Cloudflare Pages Function for agency OG meta tags (no language prefix)
 *
 * Handles: /agencies/:country/:name  (e.g. /agencies/albania/erikson-real-estate)
 *          /agencies/:slug           (legacy single-segment slugs and ids)
 *
 * An agency's slug is stored as "{country}/{name}", so the shared URL normally
 * has two path segments after /agencies — hence the catch-all. Without this
 * handler social media crawlers get the static index.html and show the generic
 * site image instead of the agency's logo.
 */

import { handleAgencyOgRequest, type PagesContext } from '../_og-utils';

export const onRequest = async (context: PagesContext & { params: Record<string, string | string[]> }) => {
  const segments = (context.params.path as string[] | undefined) || [];

  // /agencies itself is the directory listing, not a profile.
  if (segments.length === 0) {
    return context.env.ASSETS.fetch(context.request);
  }

  return handleAgencyOgRequest(context, segments.join('/'), 'en');
};
