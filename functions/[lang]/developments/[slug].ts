/**
 * Cloudflare Pages Function for residence link previews (language-prefixed)
 *
 * Handles: /:lang/developments/:slug (e.g. /en/developments/plaza-tirana) —
 * the URL the Share button copies and people paste into Facebook, WhatsApp
 * or LinkedIn. Crawlers get the residence card; people get the app.
 */

import type { PagesContext } from '../../_og-utils';
import { handleResidenceOgRequest } from '../../_og-residence';

const SUPPORTED_LANGS = new Set([
  'en', 'sq', 'sr', 'bg', 'hr', 'bs', 'mk', 'me', 'ro', 'el',
]);

export const onRequest = async (context: PagesContext & { params: Record<string, string | string[]> }) => {
  const lang = context.params.lang as string;
  const slug = context.params.slug as string;
  if (!SUPPORTED_LANGS.has(lang)) {
    return context.env.ASSETS.fetch(context.request);
  }
  return handleResidenceOgRequest(context, slug, lang);
};
