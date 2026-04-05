/**
 * Cloudflare Pages Function for property OG meta tags
 *
 * Handles: /property/:slug
 *
 * Social media crawlers (Facebook, Twitter, LinkedIn, etc.) don't execute JavaScript,
 * so they can't see the React Helmet-injected OG tags. This function intercepts
 * property page requests from crawlers and serves HTML with proper OG meta tags
 * (property photo, title, price, bed/bath/sqft details).
 *
 * For normal users, it falls through to the SPA (index.html).
 */

import { handlePropertyOgRequest } from '../_og-utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onRequest = async (context: any) => {
  const slug = context.params.id as string;
  return handlePropertyOgRequest(context, slug, 'en');
};
