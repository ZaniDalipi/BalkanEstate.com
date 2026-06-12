/**
 * Cloudflare Pages Function for blog article OG meta tags (no language prefix)
 *
 * Handles: /blog/:slug
 *
 * Without this handler, social media crawlers receive the static index.html
 * with the generic default OG image instead of the article's cover photo.
 */

import { handleArticleOgRequest } from '../_og-utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onRequest = async (context: any) => {
  const slug = context.params.slug as string;
  return handleArticleOgRequest(context, slug, 'en');
};
