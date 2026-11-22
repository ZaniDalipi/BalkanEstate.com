import React from 'react';
import { useParams } from 'react-router-dom';
import { Redirect } from '@/src/app/router/routeElements';
import { paths } from '@/src/app/router/paths';
import type { MarketDeal } from '../types';
import { isMarketSlug } from '../utils/marketRoutes';
import MarketHubView from './MarketHubView';
import MarketPlaceView from './MarketPlaceView';
import { MarketNotFound } from './MarketPageStates';

interface MarketPageProps {
  deal: MarketDeal;
}

/**
 * `/:lang/property-for-sale[/:country[/:city]]` and the same for rent:
 * the overview, a country or a city. Mixed-case URLs move to the lower-case
 * one (the canonical); a malformed slug is a not-found page with a way on.
 */
const MarketPage: React.FC<MarketPageProps> = ({ deal }) => {
  const { country, city } = useParams();
  const countrySlug = country?.toLowerCase();
  const citySlug = city?.toLowerCase();

  if (country !== countrySlug || city !== citySlug) {
    return <Redirect to={paths.market(deal, countrySlug, citySlug)} keepQuery={false} />;
  }
  if (!countrySlug) return <MarketHubView deal={deal} />;
  if (!isMarketSlug(countrySlug) || (citySlug !== undefined && !isMarketSlug(citySlug))) {
    return <MarketNotFound deal={deal} />;
  }
  return <MarketPlaceView deal={deal} country={countrySlug} city={citySlug} />;
};

export default MarketPage;
