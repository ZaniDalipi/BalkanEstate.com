/**
 * Cloudflare Pages Function for /:lang/property-prices: crawlers get the
 * price table as HTML (functions/_market-prices.ts), people get the SPA.
 */
import { handlePricesRequest } from '../_market-prices';
import { isMarketLang } from '../_market-pages';
import type { PagesContext } from '../_og-utils';

export const onRequest = async (context: PagesContext & { params: Record<string, string | string[] | undefined> }) => {
  const lang = context.params.lang;
  if (typeof lang !== 'string' || !isMarketLang(lang)) return context.env.ASSETS.fetch(context.request);
  return handlePricesRequest(context, lang);
};
