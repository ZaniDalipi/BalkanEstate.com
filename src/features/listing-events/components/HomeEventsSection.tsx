import React from 'react';
import { useTranslation } from 'react-i18next';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import { toIntlLocale } from '@/src/shared/utils/intlLocale';
import { useOpenHousesThisWeek } from '../hooks/useListingEventsFeed';
import { thisWeekRange } from '../utils/thisWeekRange';
import EventIcon from './EventIcon';

interface HomeEventsSectionProps {
  /** The visitor's country filter, when they have one. */
  country?: string;
  /** Open search with this week's open houses. */
  onSeeAll: () => void;
}

/** "Mon 16 – Sun 22 Nov": today until the end of this week, in the viewer's language. */
function weekLabel(lang: string, now: Date): string {
  const { from, to } = thisWeekRange(now);
  const lastDay = new Date(to.getTime() - 1);
  const fmt = new Intl.DateTimeFormat(toIntlLocale(lang), { weekday: 'short', day: 'numeric', month: 'short' });
  return from.toDateString() === lastDay.toDateString() ? fmt.format(from) : `${fmt.format(from)} – ${fmt.format(lastDay)}`;
}

/**
 * Landing page: open houses happening this week (now until Sunday night),
 * soonest first. Hidden while loading, on error and when there are none —
 * it is a bonus, never a blank box.
 */
const HomeEventsSection: React.FC<HomeEventsSectionProps> = ({ country, onSeeAll }) => {
  const { t, i18n } = useTranslation('property');
  const { data: listings } = useOpenHousesThisWeek(country);
  if (!listings || listings.length === 0) return null;

  return (
    <section aria-labelledby="home-events-title" className="bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="home-events-title" className="flex items-center gap-2 text-xl font-bold text-gray-900 sm:text-2xl">
              <EventIcon kind="openHouse" className="h-6 w-6 text-emerald-600" />
              {t('listingEvents.homeWeekTitle', { defaultValue: 'Open houses this week' })}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {t('listingEvents.homeWeekSubtitle', { range: weekLabel(i18n.language, new Date()), defaultValue: '{{range}} · drop by, no appointment needed.' })}
            </p>
          </div>
          <button type="button" onClick={onSeeAll} className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/10">
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
