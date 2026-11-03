import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { capitalizeWords, languageLabel, yearsInBusiness } from '../../utils/businessFacts';
import { DetailSection } from './DetailSection';

interface Fact {
  key: string;
  icon: SoftIconName;
  label: string;
  value: React.ReactNode;
}

const PRICE_LABEL_KEYS: Record<string, [string, string]> = {
  $: ['detail.price.budget', 'Budget'],
  $$: ['detail.price.mid', 'Mid-range'],
  $$$: ['detail.price.premium', 'Premium'],
};

const Chips: React.FC<{ items: string[] }> = ({ items }) => (
  <span className="flex flex-wrap gap-1.5">
    {items.map((item) => (
      <span key={item} className="rounded-full bg-black/[0.04] px-2.5 py-1 text-sm font-medium text-neutral-800">{item}</span>
    ))}
  </span>
);

/**
 * Everything else worth knowing, as one grouped list (Settings-style rows)
 * instead of a card per fact: where they work, languages, payment, price,
 * founding year, licence, and how long they've been on BalkanEstate.
 */
export const BusinessFactsSection: React.FC<{ listing: BusinessListing; now: Date }> = ({ listing: l, now }) => {
  const { t, i18n } = useTranslation('businessDirectory');
  const locale = i18n.language || 'en';
  const years = yearsInBusiness(l.yearEstablished, now);
  const facts: Fact[] = [];

  if (l.serviceAreas?.length) facts.push({ key: 'areas', icon: 'pin', label: t('detail.serviceAreas', 'Service Areas'), value: <Chips items={l.serviceAreas.map(capitalizeWords)} /> });
  if (l.languages?.length) facts.push({ key: 'languages', icon: 'chat', label: t('detail.languages', 'Languages'), value: <Chips items={l.languages.map((x) => languageLabel(x, locale))} /> });
  if (l.paymentMethods?.length) {
    facts.push({ key: 'payment', icon: 'creditCard', label: t('detail.paymentMethods', 'Payment Methods'), value: <Chips items={l.paymentMethods.map((m) => t(`paymentMethods.${m}`, capitalizeWords(m.replace(/_/g, ' '))))} /> });
  }
  if (l.priceRange) {
    const [key, fallback] = PRICE_LABEL_KEYS[l.priceRange] ?? ['', ''];
    facts.push({ key: 'price', icon: 'cash', label: t('detail.priceRange', 'Price range'), value: <><span className="font-semibold text-emerald-700">{l.priceRange}</span>{key && <span className="text-neutral-500"> · {t(key, fallback)}</span>}</> });
  }
  if (l.yearEstablished) {
    facts.push({
      key: 'founded', icon: 'calendar', label: t('detail.founded', 'Founded'),
      value: <>{l.yearEstablished}{years !== null && years >= 1 && <span className="text-neutral-500"> · {t('detail.yearsInBusiness', { count: years, defaultValue: '{{count}} years in business' })}</span>}</>,
    });
  }
  if (l.licenseNumber) facts.push({ key: 'license', icon: 'docCheck', label: t('detail.licenseNumber', 'License number'), value: <span className="font-mono text-[14px]">{l.licenseNumber}</span> });
  facts.push({
    key: 'member', icon: 'star', label: t('detail.stats.memberSince', 'Member since'),
    value: new Date(l.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'long' }),
  });
  facts.push({ key: 'views', icon: 'eye', label: t('detail.profileViews', 'Profile views'), value: l.views.toLocaleString(locale) });

  return (
    <DetailSection id="business-facts" icon="info" title={t('detail.atAGlance', 'At a glance')}>
      <dl className="-my-1 divide-y divide-black/[0.06]">
        {facts.map((f) => (
          <div key={f.key} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-x-3 py-3 sm:grid-cols-[28px_minmax(0,180px)_minmax(0,1fr)]">
            <SoftIcon name={f.icon} className="h-7 w-7" />
            <dt className="self-center text-[15px] text-neutral-500">{f.label}</dt>
            <dd className="col-start-2 mt-1 text-[15px] text-neutral-900 sm:col-start-3 sm:mt-0 sm:self-center">{f.value}</dd>
          </div>
        ))}
      </dl>
    </DetailSection>
  );
};
