/**
 * Cloudflare Pages Function for /:lang/property-for-sale[/:country[/:city]]:
 * crawlers get the rendered landing page (see functions/_market-pages.ts),
 * people get the SPA.
 */
import { handleMarketRequest, isMarketLang } from '../../_market-pages';
import type { PagesContext } from '../../_og-utils';

export const onRequest = async (context: PagesContext & { params: Record<string, string | string[] | undefined> }) => {
  const lang = context.params.lang;
  // Not a real language prefix: let the SPA answer (it redirects or shows 404).
  if (typeof lang !== 'string' || !isMarketLang(lang)) return context.env.ASSETS.fetch(context.request);
  const path = context.params.path;
  return handleMarketRequest(context, 'sale', lang, Array.isArray(path) ? path : path ? [path] : []);
};
