/**
 * Cloudflare Pages Function for agent profile OG meta tags (language-prefixed)
 *
 * Handles: /:lang/agents/:slug  (e.g. /en/agents/ERIKSON-REAL-ESTATE)
 *
 * This is the URL format the app itself produces, so it's what users copy out
 * of the address bar and paste into Facebook, LinkedIn or WhatsApp.
 */

import { handleAgentOgRequest, type PagesContext } from '../../_og-utils';

const SUPPORTED_LANGS = new Set([
  'en', 'sq', 'sr', 'bg', 'hr', 'bs', 'mk', 'me', 'ro', 'el',
]);

export const onRequest = async (context: PagesContext & { params: Record<string, string | string[]> }) => {
  const lang = context.params.lang as string;
  const slug = context.params.slug as string;

  // If the lang param isn't a real language code, fall through to SPA
  if (!SUPPORTED_LANGS.has(lang)) {
    return context.env.ASSETS.fetch(context.request);
  }

  return handleAgentOgRequest(context, slug, lang);
};
