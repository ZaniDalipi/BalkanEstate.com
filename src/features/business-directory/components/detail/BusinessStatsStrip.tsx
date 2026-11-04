import React from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { languageLabel, yearsInBusiness } from '../../utils/businessFacts';

interface Stat {
  key: string;
  label: string;
  value: string;
  caption: string;
}

/**
 * The at-a-glance numbers, App Store style: small caps label, big value,
 * caption — divided columns from the tablet up, a wrapping grid of tiles on phones.
 */
export const BusinessStatsStrip: React.FC<{ listing: BusinessListing; now: Date }> = ({ listing: l, now }) => {
  const { t, i18n } = useTranslation('businessDirectory');
  const locale = i18n.language || 'en';
  const years = yearsInBusiness(l.yearEstablished, now);
  const since = new Date(l.createdAt);
  const stats: Stat[] = [
    { key: 'services', label: t('detail.stats.services', 'Services'), value: String(l.services.length), caption: t('detail.stats.offered', 'offered') },
    { key: 'views', label: t('detail.stats.views', 'Views'), value: l.views.toLocaleString(locale), caption: t('detail.stats.profileViews', 'profile views') },
  ];
  if (years !== null) {
    stats.push({ key: 'founded', label: t('detail.founded', 'Founded'), value: String(l.yearEstablished), caption: years >= 1 ? t('detail.stats.yearsAgo', { count: years, defaultValue: '{{count}} years ago' }) : t('detail.stats.thisYear', 'this year') });
  }
  if (l.languages?.length) {
    stats.push({ key: 'languages', label: t('detail.languages', 'Languages'), value: String(l.languages.length), caption: l.languages.slice(0, 2).map((x) => languageLabel(x, locale)).join(', ') + (l.languages.length > 2 ? '…' : '') });
  }
  if (l.priceRange) stats.push({ key: 'price', label: t('detail.priceRange', 'Price range'), value: l.priceRange, caption: t(`detail.price.${{ $: 'budget', $$: 'mid', $$$: 'premium' }[l.priceRange]}`) });
  if (!Number.isNaN(since.getTime())) {
    stats.push({ key: 'member', label: t('detail.stats.memberSince', 'Member since'), value: String(since.getFullYear()), caption: since.toLocaleDateString(locale, { month: 'long' }) });
  }

  return (
    // Phones: a 3-column grid of small tiles (wraps, nothing cut off). From sm: one App Store row with dividers.
    <dl className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:gap-0">
      {stats.map((s, i) => (
        <div
          key={s.key}
          className={`flex min-w-0 flex-col items-center rounded-xl bg-black/[0.03] px-1.5 py-2 text-center sm:flex-1 sm:rounded-none sm:bg-transparent sm:px-3 sm:py-0 ${i > 0 ? 'sm:border-l sm:border-black/[0.08]' : ''}`}
        >
          <dt className="max-w-full truncate text-[10px] font-semibold uppercase tracking-wide text-neutral-500 sm:text-[11px]">{s.label}</dt>
          <dd className="mt-0.5 text-lg font-bold leading-tight text-neutral-800 tabular-nums sm:mt-1 sm:text-[22px]">{s.value}</dd>
          <dd className="max-w-full truncate text-[11px] text-neutral-500 sm:max-w-[120px] sm:text-[12px]">{s.caption}</dd>
        </div>
      ))}
    </dl>
  );
};
