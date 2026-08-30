/**
 * Cloudflare Pages Function for agency OG meta tags (language-prefixed)
 *
 * Handles: /:lang/agencies/:country/:name  (e.g. /en/agencies/albania/erikson-real-estate)
 *          /:lang/agencies/:slug           (legacy single-segment slugs and ids)
 *
 * This is the URL format the app itself produces, so it's what users copy out
 * of the address bar and paste into Facebook, LinkedIn or WhatsApp.
 */

import { handleAgencyOgRequest, type PagesContext } from '../../_og-utils';

const SUPPORTED_LANGS = new Set([
  'en', 'sq', 'sr', 'bg', 'hr', 'bs', 'mk', 'me', 'ro', 'el',
]);

export const onRequest = async (context: PagesContext & { params: Record<string, string | string[]> }) => {
  const lang = context.params.lang as string;
  const segments = (context.params.path as string[] | undefined) || [];

  // Not a real language code, or /:lang/agencies itself → let the SPA handle it
  if (!SUPPORTED_LANGS.has(lang) || segments.length === 0) {
    return context.env.ASSETS.fetch(context.request);
  }

  return handleAgencyOgRequest(context, segments.join('/'), lang);
};
