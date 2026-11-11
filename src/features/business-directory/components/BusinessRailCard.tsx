import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Store } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';

/** A business in the home page row: banner with its logo, name, category and city. The whole card is one link. */
export const BusinessRailCard: React.FC<{ listing: BusinessListing }> = ({ listing: b }) => {
  const { t } = useTranslation('businessDirectory');
  const category = b.category === 'other' && b.customCategory ? b.customCategory : t(`categories.${b.category}`);
  return (
    <AppLink
      to={paths.businessListing(b.slug || b.id)}
      className="group flex h-full w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-[280px]"
    >
      <div className="relative h-28 bg-gradient-to-br from-primary/80 to-sky-400">
        {b.bannerUrl && (
          <img
            src={optimizeImageUrl(b.bannerUrl, { width: 600 })}
            alt=""
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden';
            }}
            className="h-full w-full object-cover"
            style={{ objectPosition: `center ${b.bannerPosition ?? 50}%` }}
          />
        )}
        <span className="absolute -bottom-6 left-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-4 ring-white">
          {b.logoUrl ? (
            <img src={optimizeImageUrl(b.logoUrl, { width: 112, height: 112 })} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
          ) : (
            <Store className="h-6 w-6 text-primary" aria-hidden="true" />
          )}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 pb-4 pt-8">
        <h3 className="line-clamp-1 text-base font-bold text-slate-900 group-hover:text-primary">{b.name}</h3>
        <p className="line-clamp-1 text-sm font-medium text-primary">{category}</p>
        <p className="mt-auto flex items-center gap-1 pt-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{[b.city, b.country].filter(Boolean).join(', ')}</span>
        </p>
      </div>
    </AppLink>
  );
};
