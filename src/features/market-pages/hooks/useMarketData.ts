import { useQuery } from '@tanstack/react-query';
import { marketPageKeys } from '@/src/shared/query/queryKeys';
import { fetchMarketHub, fetchMarketPage } from '../api/marketPagesApi';
import { shouldRetry } from '../utils/marketApiResult';
import type { MarketDeal } from '../types';

/** Listings change through the day; a few minutes is fresh enough for a landing page. */
const STALE_MS = 5 * 60 * 1000;

export function useMarketHub(deal: MarketDeal) {
  return useQuery({
    queryKey: marketPageKeys.hub(deal),
    queryFn: () => fetchMarketHub(deal),
    staleTime: STALE_MS,
    retry: shouldRetry,
  });
}

/** One country or city page. "No such place" comes back as data, not as an error. */
export function useMarketPage(deal: MarketDeal, country: string, city?: string) {
  return useQuery({
    queryKey: marketPageKeys.page(deal, country, city),
    queryFn: () => fetchMarketPage(deal, country, city),
    staleTime: STALE_MS,
    retry: shouldRetry,
  });
}
