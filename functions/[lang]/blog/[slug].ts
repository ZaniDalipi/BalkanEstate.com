/**
 * Cloudflare Pages Function for blog article OG meta tags (language-prefixed URLs)
 *
 * Handles: /:lang/blog/:slug  (e.g. /en/blog/property-ownership-in-kosovo...)
 *
 * This is the URL format users actually share and paste into social media.
 * Without this handler, crawlers receive the static index.html with the
 * generic default OG image instead of the actual article cover photo.
 */

import { handleArticleOgRequest } from '../../_og-utils';

const SUPPORTED_LANGS = new Set([
  'en', 'sq', 'sr', 'bg', 'hr', 'bs', 'mk', 'me', 'ro', 'el',
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onRequest = async (context: any) => {
  const lang = context.params.lang as string;
  const slug = context.params.slug as string;

  // If the lang param isn't a real language code, fall through to SPA
  if (!SUPPORTED_LANGS.has(lang)) {
    return context.env.ASSETS.fetch(context.request);
  }

  return handleArticleOgRequest(context, slug, lang);
};
