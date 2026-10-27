/**
 * Cloudflare Pages Function for residence link previews (no language prefix)
 *
 * Handles: /developments/:slug
 */

import type { PagesContext } from '../_og-utils';
import { handleResidenceOgRequest } from '../_og-residence';

export const onRequest = async (context: PagesContext & { params: Record<string, string | string[]> }) => {
  const slug = context.params.slug as string;
  return handleResidenceOgRequest(context, slug, 'en');
};
