import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import { useBusinessListings } from '@/src/features/business-directory/hooks/useBusinessListings';
import { HomeSectionHeader } from '../HomeSectionHeader';
import { BusinessRailCard } from './BusinessRailCard';

const SHOWN = 12;
const arrow = 'hidden h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:inline-flex';

/**
 * The business directory on the home page: a row of businesses to swipe
 * through (arrow buttons on wider screens), and a link into the directory.
 * Hidden when there is none; if they can't be loaded, a link to the
 * directory takes their place.
 */
const HomeBusinessesSection: React.FC = () => {
  const { t } = useTranslation('home');
  const { listings, total, isLoading, error } = useBusinessListings({ limit: SHOWN });
  const rail = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: 'smooth' });
  const directory = paths.businessDirectory();

  if (error) {
    return (
      <p role="status" className="mx-auto my-10 max-w-6xl px-4 text-sm text-slate-600">
        {t('businesses.loadFailed', 'Businesses couldn’t be loaded right now.')}{' '}
        <AppLink to={directory} className="font-semibold text-primary hover:underline">{t('businesses.viewAll', 'Open the directory')}</AppLink>
      </p>
    );
  }
  if (isLoading) return <div className="mx-auto my-12 h-56 max-w-6xl animate-pulse rounded-2xl bg-slate-100 px-4" aria-busy="true" />;
  if (listings.length === 0) return null;

  return (
    <section aria-labelledby="home-businesses-heading" className="bg-slate-50 py-12">
      <HomeSectionHeader
        id="home-businesses-heading"
        title={t('businesses.title', 'Business directory')}
        subtitle={t('businesses.subtitle', 'Builders, lawyers, notaries, movers and more — trusted local services for your home.')}
        action={{ label: total > SHOWN ? t('businesses.viewAllCount', { n: total, defaultValue: 'All {{n}} businesses' }) : t('businesses.viewAll', 'Open the directory'), to: directory }}
      />
      <div className="relative mx-auto mt-6 max-w-6xl">
        <ul ref={rail} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {listings.map((b) => (
            <li key={b.id} className="flex">
              <BusinessRailCard listing={b} />
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-end gap-2 px-4">
          <button type="button" className={arrow} onClick={() => scroll(-1)} aria-label={t('businesses.prev', 'Show earlier businesses')}>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" className={arrow} onClick={() => scroll(1)} aria-label={t('businesses.next', 'Show more businesses')}>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HomeBusinessesSection;
