/**
 * Cloudflare Pages Function for business profile link previews (no language prefix)
 *
 * Handles: /business-directory/:slug — crawlers get the business's name and its
 * share card (cover photo + logo); people get the app.
 */

import type { PagesContext } from '../_og-utils';
import { handleBusinessOgRequest } from '../_og-business';

export const onRequest = async (context: PagesContext & { params: Record<string, string | string[]> }) => {
  const slug = context.params.slug as string;
  return handleBusinessOgRequest(context, slug, 'en');
};
