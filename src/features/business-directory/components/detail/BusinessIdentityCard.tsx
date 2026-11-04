import React from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { SoftIcon } from '@/src/shared/illustrations';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import type { OpenStatus } from '../../utils/businessHours';
import { categoryGradient, categoryIcon, categoryLabel } from '../../utils/categoryStyle';
import { fullAddress, yearsInBusiness } from '../../utils/businessFacts';
import { BusinessStatsStrip } from './BusinessStatsStrip';
import { formatDistance } from '../../utils/travel';
import { GLASS_CHIP, GLASS_FLOAT } from './glassStyles';
import { OpenStatusBadge } from './OpenStatusBadge';

/** Facts chips, a touch smaller on phones so three fit a row. */
const CHIP = `${GLASS_CHIP} max-sm:px-2.5 max-sm:py-1 max-sm:text-[13px]`;

interface BusinessIdentityCardProps {
  listing: BusinessListing;
  status: OpenStatus;
  now: Date;
  /** Straight-line km from the visitor, once their location is known. */
  distanceKm: number | null;
  onDistanceClick: () => void;
  children: React.ReactNode; // the action row
}

/** Who they are, at a glance: logo, name, trade, place, open status and the facts people ask first. */
export const BusinessIdentityCard: React.FC<BusinessIdentityCardProps> = ({ listing: l, status, now, distanceKm, onDistanceClick, children }) => {
  const { t, i18n } = useTranslation('businessDirectory');
  const years = yearsInBusiness(l.yearEstablished, now);
  const isIndividual = l.listingType === 'individual';

  return (
    <div className={`${GLASS_FLOAT} mx-3 -mt-16 p-4 sm:mx-6 sm:-mt-24 sm:p-6 lg:mx-10 lg:p-7 landscape:-mt-12`}>
      <div className="flex items-start gap-4 sm:gap-6">
        <div className={`relative -mt-10 h-20 w-20 shrink-0 overflow-hidden rounded-[22px] bg-gradient-to-br shadow-[0_12px_30px_-10px_rgba(15,23,42,0.35)] ring-4 ring-white sm:-mt-16 sm:h-28 sm:w-28 sm:rounded-[28px] landscape:-mt-6 landscape:h-20 landscape:w-20 lg:h-32 lg:w-32 ${categoryGradient(l.category)}`}>
          {l.logoUrl ? (
            <img src={optimizeImageUrl(l.logoUrl, { width: 256, height: 256 }) || l.logoUrl} alt={t('detail.logoAlt', { name: l.name, defaultValue: '{{name}} logo' })} className="h-full w-full bg-white object-contain p-1.5" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-white sm:text-5xl" aria-hidden="true">
              {l.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-neutral-900 sm:text-3xl lg:text-[34px]">
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
          <p className="mt-1 flex items-start gap-1 text-sm text-neutral-500" title={fullAddress(l)}>
            <SoftIcon name="pin" className="h-5 w-5 shrink-0" />
            <span className="line-clamp-2">{fullAddress(l)}</span>
          </p>
          <OpenStatusBadge status={status} className="mt-1.5" />
        </div>
      </div>

      {(years !== null || l.priceRange || l.licenseNumber || distanceKm !== null) && (
        <ul className="mt-4 flex flex-wrap gap-1.5 sm:gap-2" aria-label={t('detail.highlights', 'Highlights')}>
          {distanceKm !== null && (
            <li>
              <button type="button" onClick={onDistanceClick} className={`${CHIP} !bg-primary/10 !text-primary-dark !ring-primary/15 transition hover:!bg-primary/15`}>
                <SoftIcon name="car" className="h-4 w-4" />
                {t('detail.route.fromYou', { distance: formatDistance(distanceKm, i18n.language || 'en'), defaultValue: '{{distance}} from you' })}
              </button>
            </li>
          )}
          {years !== null && (
            <li className={CHIP}>
              <SoftIcon name="calendar" className="h-4 w-4" />
              {years >= 1
                ? t('detail.yearsInBusiness', { count: years, defaultValue: '{{count}} years in business' })
                : t('detail.established', { year: l.yearEstablished, defaultValue: 'Est. {{year}}' })}
            </li>
          )}
          {l.licenseNumber && (
            <li className={CHIP}><SoftIcon name="docCheck" className="h-4 w-4" />{t('detail.licensed', 'Licensed')}</li>
          )}
          {l.priceRange && (
            <li className={CHIP}><SoftIcon name="cash" className="h-4 w-4" /><span className="font-semibold text-emerald-700">{l.priceRange}</span></li>
          )}
        </ul>
      )}

      <BusinessStatsStrip listing={l} now={now} />

      <div className="mt-4 sm:mt-5">{children}</div>
    </div>
  );
};
