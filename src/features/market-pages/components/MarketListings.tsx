import React, { useMemo } from 'react';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import { transformBackendProperty } from '@/src/features/properties/api/propertyApi';
import { AppLink } from '@/src/app/router/AppLink';
import type { MarketDeal, MarketListingRow } from '../types';
import { useMarketText } from '../hooks/useMarketText';

interface MarketListingsProps {
  deal: MarketDeal;
  listings: MarketListingRow[];
  /** "Tirana, Albania" — for the link to the full map search. */
  placeText: string;
  /** Map search with this place already filtered. */
  searchPath: string;
}

const MAP_LINK =
  'inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700';

/** The newest listings as the usual cards, or a way on when there are none. */
const MarketListings: React.FC<MarketListingsProps> = ({ deal, listings, placeText, searchPath }) => {
  const { t } = useMarketText();
  // Rows the card cannot show (no id) are dropped rather than rendered half-empty.
  const properties = useMemo(
    () => listings.filter((row) => row.id || row._id).map((row) => transformBackendProperty(row)),
    [listings],
  );
  const mapLink = (
    <AppLink to={searchPath} className={MAP_LINK}>
      {t(`marketPages:listings.viewAll.${deal}`, {
        place: placeText,
        defaultValue: deal === 'sale' ? 'See every property for sale in {{place}} on the map' : 'See every property for rent in {{place}} on the map',
      })}
    </AppLink>
  );

  return (
    <section aria-labelledby="market-listings-title" className="mt-10">
      <h2 id="market-listings-title" className="text-xl font-semibold text-neutral-900">
        {t('marketPages:listings.title', { defaultValue: 'Latest listings' })}
      </h2>
      {properties.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center">
          <p className="font-semibold text-neutral-900">{t('marketPages:empty.title', { defaultValue: 'No listings here yet' })}</p>
          <p className="mt-1 text-neutral-600">
            {t('marketPages:empty.body', { defaultValue: 'New property is listed every day. Search the map, or look at the places below.' })}
          </p>
          <div className="mt-4">{mapLink}</div>
        </div>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-lg:landscape:grid-cols-2">
            {properties.map((property, i) => (
              <li key={property.id}>
                <PropertyCard property={property} priority={i < 3} />
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-center">{mapLink}</div>
        </>
      )}
    </section>
  );
};

export default MarketListings;
