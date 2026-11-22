import React from 'react';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import type { MarketDeal, MarketPlaceSummary } from '../types';

interface MarketPlaceLinksProps {
  deal: MarketDeal;
  countrySlug: string;
  title: string;
  places: MarketPlaceSummary[];
}

/** Links to city pages, each with its live listing count. */
const MarketPlaceLinks: React.FC<MarketPlaceLinksProps> = ({ deal, countrySlug, title, places }) => {
  if (places.length === 0) return null;
  const titleId = `market-places-${countrySlug}`;
  return (
    <section aria-labelledby={titleId} className="mt-10">
      <h2 id={titleId} className="text-lg font-semibold text-neutral-900">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {places.map((place) => (
          <li key={place.slug}>
            <AppLink
              to={paths.market(deal, countrySlug, place.slug)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-neutral-100 px-4 text-sm text-neutral-800 hover:bg-primary-50 hover:text-primary-700"
            >
              {place.name}
              <span className="text-neutral-500">{place.count}</span>
            </AppLink>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default MarketPlaceLinks;
