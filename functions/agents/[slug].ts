/**
 * Cloudflare Pages Function for agent profile OG meta tags (no language prefix)
 *
 * Handles: /agents/:slug  (e.g. /agents/ERIKSON-REAL-ESTATE)
 *
 * Social media crawlers don't execute JavaScript, so without this handler they
 * receive the static index.html and show the generic site image instead of the
 * agent's profile picture.
 */

import { handleAgentOgRequest } from '../_og-utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onRequest = async (context: any) => {
  const slug = context.params.slug as string;
  return handleAgentOgRequest(context, slug, 'en');
};
