/**
 * Cloudflare Pages Function for business profile link previews (language-prefixed)
 *
 * Handles: /:lang/business-directory/:slug (e.g. /en/business-directory/regina-…_Ab12…)
 * — the URL the Share button copies and people paste into Facebook, WhatsApp
 * or LinkedIn. Crawlers get the business's share card; people get the app.
 */

import type { PagesContext } from '../../_og-utils';
import { handleBusinessOgRequest } from '../../_og-business';

const SUPPORTED_LANGS = new Set([
  'en', 'sq', 'sr', 'bg', 'hr', 'bs', 'mk', 'me', 'ro', 'el',
]);

export const onRequest = async (context: PagesContext & { params: Record<string, string | string[]> }) => {
  const lang = context.params.lang as string;
  const slug = context.params.slug as string;
  if (!SUPPORTED_LANGS.has(lang)) {
    return context.env.ASSETS.fetch(context.request);
  }
  return handleBusinessOgRequest(context, slug, lang);
};
