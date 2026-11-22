import { apiRequest } from '@/src/shared/api';
import type { MarketDeal, MarketHub, MarketPageResult, PriceTable } from '../types';
import { isMarketHub, isMarketPageData, isPriceTable, notFoundResult } from '../utils/marketApiResult';

/** GET /market-pages/:deal — every country with its biggest cities. */
export async function fetchMarketHub(deal: MarketDeal): Promise<MarketHub> {
  const hub = await apiRequest<unknown>(`/market-pages/${deal}`);
  if (!isMarketHub(hub)) throw new Error('Unexpected response for the property overview');
  return hub;
}

/**
 * GET /market-pages/:deal/:country[/:city]. A 404 is an answer, not an
 * error: the page says the place has no listings and offers the next one.
 */
export async function fetchMarketPage(deal: MarketDeal, country: string, city?: string): Promise<MarketPageResult> {
  const path = [deal, country, city].filter((s): s is string => !!s).map(encodeURIComponent).join('/');
  try {
    const page = await apiRequest<unknown>(`/market-pages/${path}`);
    if (!isMarketPageData(page)) throw new Error('Unexpected response for this page');
    return { status: 'found', page };
  } catch (error) {
    const notFound = notFoundResult(error);
    if (notFound) return notFound;
    throw error;
  }
}

/** GET /market-prices — median asking prices and rents by country and city. */
export async function fetchPriceTable(): Promise<PriceTable> {
  const table = await apiRequest<unknown>('/market-prices');
  if (!isPriceTable(table)) throw new Error('Unexpected response for the price table');
  return table;
}
