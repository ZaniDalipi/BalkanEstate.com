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
 * caption — divided columns that swipe sideways on phones.
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
    <dl className="-mx-4 mt-4 flex snap-x overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-7 lg:px-7 [&::-webkit-scrollbar]:hidden">
      {stats.map((s, i) => (
        <div key={s.key} className={`flex min-w-[96px] flex-1 snap-start flex-col items-center px-3 text-center ${i > 0 ? 'border-l border-black/[0.08]' : ''}`}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{s.label}</dt>
          <dd className="mt-1 text-[22px] font-bold leading-tight text-neutral-800 tabular-nums">{s.value}</dd>
          <dd className="max-w-[120px] truncate text-[12px] text-neutral-500">{s.caption}</dd>
        </div>
      ))}
    </dl>
  );
};
