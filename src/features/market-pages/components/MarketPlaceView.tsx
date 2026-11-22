import React from 'react';
import type { MarketDeal } from '../types';
import { useMarketPage } from '../hooks/useMarketData';
import MarketPlaceContent from './MarketPlaceContent';
import { MarketError, MarketLoading, MarketNotFound } from './MarketPageStates';

interface MarketPlaceViewProps {
  deal: MarketDeal;
  country: string;
  city?: string;
}

/** Load a country or city page and show it, or the state it is in. */
const MarketPlaceView: React.FC<MarketPlaceViewProps> = ({ deal, country, city }) => {
  const query = useMarketPage(deal, country, city);

  if (query.isPending) return <MarketLoading />;
  if (query.isError) return <MarketError deal={deal} onRetry={() => void query.refetch()} />;

  const result = query.data;
  if (result.status === 'unknown-country') return <MarketNotFound deal={deal} />;
  if (result.status === 'unknown-city') return <MarketNotFound deal={deal} country={result.country} />;
  return <MarketPlaceContent page={result.page} />;
};

export default MarketPlaceView;
