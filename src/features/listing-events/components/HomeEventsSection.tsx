import React from 'react';
import { useTranslation } from 'react-i18next';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import { useListingEventsFeed } from '../hooks/useListingEventsFeed';
import EventIcon from './EventIcon';

interface HomeEventsSectionProps {
  /** The visitor's country filter, when they have one. */
  country?: string;
  /** Open search sorted by the soonest open house / auction. */
  onSeeAll: () => void;
}

/**
 * "Open houses & auctions coming up" on the home page. Hidden while loading,
 * on error, and when nothing is planned — it is a bonus, never a blank box.
 */
const HomeEventsSection: React.FC<HomeEventsSectionProps> = ({ country, onSeeAll }) => {
  const { t } = useTranslation('property');
  const { data: listings } = useListingEventsFeed(country);
  if (!listings || listings.length === 0) return null;

  return (
    <section aria-labelledby="home-events-title" className="bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="home-events-title" className="flex items-center gap-2 text-xl font-bold text-gray-900 sm:text-2xl">
              <span className="flex gap-1 text-emerald-600"><EventIcon kind="openHouse" className="h-6 w-6" /><EventIcon kind="auction" className="h-6 w-6 text-amber-600" /></span>
              {t('listingEvents.homeTitle', { defaultValue: 'Open houses & auctions coming up' })}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {t('listingEvents.homeSubtitle', { defaultValue: 'Drop by this weekend, or put a date in your calendar.' })}
            </p>
          </div>
          <button type="button" onClick={onSeeAll} className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50">
            {t('listingEvents.seeAll', { defaultValue: 'See all' })}
          </button>
        </div>
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-9 pt-5 scrollbar-hide">
          {listings.map((p) => (
            <li key={p.id} className="w-[280px] flex-shrink-0 snap-start sm:w-[310px]">
              <PropertyCard property={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default HomeEventsSection;
