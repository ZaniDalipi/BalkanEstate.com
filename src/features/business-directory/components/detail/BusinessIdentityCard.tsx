import React from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, MapPin } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { SoftIcon } from '@/src/shared/illustrations';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import type { OpenStatus } from '../../utils/businessHours';
import { categoryGradient, categoryIcon, categoryLabel } from '../../utils/categoryStyle';
import { shortLocation, yearsInBusiness } from '../../utils/businessFacts';
import { GLASS_CHIP, GLASS_FLOAT } from './glassStyles';
import { OpenStatusBadge } from './OpenStatusBadge';

interface BusinessIdentityCardProps {
  listing: BusinessListing;
  status: OpenStatus;
  now: Date;
  titleRef: React.Ref<HTMLHeadingElement>;
  children: React.ReactNode; // the action row
}

/** Who they are, at a glance: logo, name, trade, place, open status and the facts people ask first. */
export const BusinessIdentityCard: React.FC<BusinessIdentityCardProps> = ({ listing: l, status, now, titleRef, children }) => {
  const { t } = useTranslation('businessDirectory');
  const years = yearsInBusiness(l.yearEstablished, now);
  const isIndividual = l.listingType === 'individual';

  return (
    <div className={`${GLASS_FLOAT} mx-3 -mt-16 p-4 sm:mx-6 sm:-mt-24 sm:p-6 lg:mx-10 lg:p-7 landscape:-mt-12`}>
      <div className="flex items-start gap-4 sm:gap-6">
        <div className={`relative -mt-10 h-20 w-20 shrink-0 overflow-hidden rounded-[22px] bg-gradient-to-br shadow-[0_12px_30px_-10px_rgba(15,23,42,0.35)] ring-4 ring-white sm:-mt-16 sm:h-28 sm:w-28 sm:rounded-[28px] lg:h-32 lg:w-32 ${categoryGradient(l.category)}`}>
          {l.logoUrl ? (
            <img src={optimizeImageUrl(l.logoUrl, { width: 256, height: 256 }) || l.logoUrl} alt={t('detail.logoAlt', { name: l.name, defaultValue: '{{name}} logo' })} className="h-full w-full bg-white object-contain p-1.5" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-white sm:text-5xl" aria-hidden="true">
              {l.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 ref={titleRef} className="text-[22px] font-bold leading-tight tracking-tight text-neutral-900 sm:text-3xl lg:text-[34px]">
            {l.name}
            {l.isVerified && (
              <BadgeCheck className="ml-1.5 inline-block h-6 w-6 -translate-y-0.5 fill-primary text-white sm:h-7 sm:w-7" aria-label={t('verified', 'Verified')} role="img" />
            )}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[15px] font-medium text-neutral-600">
            <SoftIcon name={categoryIcon(l.category)} className="h-5 w-5" />
            <span className="text-primary">{categoryLabel(l, t)}</span>
            <span aria-hidden="true">·</span>
            <span>{isIndividual ? t('types.individual', 'Individual') : t('types.business', 'Business')}</span>
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{shortLocation(l)}</span>
          </p>
          <OpenStatusBadge status={status} className="mt-1.5" />
        </div>
      </div>

      {(years !== null || l.priceRange || l.licenseNumber) && (
        <ul className="mt-4 flex flex-wrap gap-1.5 sm:gap-2 [&>li]:max-sm:px-2.5 [&>li]:max-sm:py-1 [&>li]:max-sm:text-[13px]" aria-label={t('detail.highlights', 'Highlights')}>
          {years !== null && (
            <li className={GLASS_CHIP}>
              <SoftIcon name="calendar" className="h-4 w-4" />
              {years >= 1
                ? t('detail.yearsInBusiness', { count: years, defaultValue: '{{count}} years in business' })
                : t('detail.established', { year: l.yearEstablished, defaultValue: 'Est. {{year}}' })}
            </li>
          )}
          {l.licenseNumber && (
            <li className={GLASS_CHIP}><SoftIcon name="docCheck" className="h-4 w-4" />{t('detail.licensed', 'Licensed')}</li>
          )}
          {l.priceRange && (
            <li className={GLASS_CHIP}><SoftIcon name="cash" className="h-4 w-4" /><span className="font-semibold text-emerald-700">{l.priceRange}</span></li>
          )}
        </ul>
      )}

      <div className="mt-4 sm:mt-5">{children}</div>
    </div>
  );
};
