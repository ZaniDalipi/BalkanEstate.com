import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { useBusinessListings } from '../../hooks/useBusinessListings';
import { categoryLabel } from '../../utils/categoryStyle';
import { BusinessRailCard } from '../BusinessRailCard';

const SHOWN = 8;

/**
 * More businesses in the same trade, to keep people exploring rather than
 * leaving at the end of the page. Hidden while loading, on error and when
 * there are none — it is a suggestion, never a dead end.
 */
export const SimilarBusinesses: React.FC<{ listing: BusinessListing }> = ({ listing }) => {
  const { t } = useTranslation('businessDirectory');
  const { listings } = useBusinessListings({ category: listing.category, limit: SHOWN + 1 });
  const others = listings.filter((b) => b.id !== listing.id).slice(0, SHOWN);
  if (others.length === 0) return null;

  return (
    <section aria-labelledby="similar-businesses" className="mt-10">
      <div className="flex items-end justify-between gap-4 px-4 sm:px-0">
        <h2 id="similar-businesses" className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
          {t('detail.similar', { category: categoryLabel(listing, t), defaultValue: 'More in {{category}}' })}
        </h2>
        <AppLink to={paths.businessDirectory()} className="inline-flex min-h-[44px] shrink-0 items-center gap-0.5 text-[15px] font-semibold text-primary hover:underline">
          {t('detail.seeAll', 'See all')}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </AppLink>
      </div>
      <ul className="mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden">
        {others.map((b) => (
          <li key={b.id} className="flex">
            <BusinessRailCard listing={b} />
          </li>
        ))}
      </ul>
    </section>
  );
};
