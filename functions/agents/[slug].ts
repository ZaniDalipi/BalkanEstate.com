/**
 * Cloudflare Pages Function for agent profile OG meta tags (no language prefix)
 *
 * Handles: /agents/:slug  (e.g. /agents/ERIKSON-REAL-ESTATE)
 *
 * Social media crawlers don't execute JavaScript, so without this handler they
 * receive the static index.html and show the generic site image instead of the
 * agent's profile picture.
 */

import { handleAgentOgRequest, type PagesContext } from '../_og-utils';

export const onRequest = async (context: PagesContext & { params: Record<string, string | string[]> }) => {
  const slug = context.params.slug as string;
  return handleAgentOgRequest(context, slug, 'en');
};
