import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Check, Clock, Plus } from 'lucide-react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { useResidencePricing } from '../../../hooks/useResidenceBilling';
import { formatCharge } from '../../../utils/format';

/**
 * "Residences" on the pricing page: free to set up, a free trial on publish,
 * then a Residence Pass per residence, extra buildings, and what premium
 * plans include. Prices come from the server (admin-editable).
 */
export const ResidencePricingSection: React.FC = () => {
  const { t } = useTranslation('developments');
  const { data: p, isLoading, isError } = useResidencePricing();
  if (isError) return null;
  if (isLoading || !p) return <div className="mt-10 h-48 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" />;

  const steps = [
    { icon: Plus, title: t('pricingSection.step1', 'Set it up for free'), text: t('pricingSection.step1Text', 'Buildings, floors, apartments and the interactive explorer.') },
    { icon: Clock, title: t('pricingSection.step2', { days: p.trialDays, defaultValue: 'Publish: {{days}} days free' }), text: t('pricingSection.step2Text', 'Buyers can find it straight away.') },
    {
      icon: Building2,
      title: t('pricingSection.step3', { price: formatCharge(p.pass), defaultValue: 'Residence Pass · {{price}}' }),
      text: t('pricingSection.step3Text', { months: p.passMonths, n: p.includedBuildings, defaultValue: '{{months}} months online, {{n}} buildings included.' }),
    },
  ];

  return (
    <section aria-labelledby="residence-pricing" className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 id="residence-pricing" className="text-2xl font-bold text-slate-900">{t('pricingSection.title', 'Residences')}</h2>
      <p className="mt-1 text-slate-600">{t('pricingSection.subtitle', 'For developers and agencies selling a new-build project.')}</p>
      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-xl bg-slate-50 p-4">
            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
            <p className="mt-2 font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </li>
        ))}
      </ol>
      <ul className="mt-6 space-y-2 text-sm text-slate-700">
        <li className="flex gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          {t('pricingSection.extra', { price: formatCharge(p.extraBuilding), defaultValue: 'More buildings: {{price}} each, for the rest of the pass period.' })}
        </li>
        <li className="flex gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          {t('pricingSection.premium', {
            pro: p.includedByTier.pro ?? 0,
            pct: p.premiumDiscountPct,
            defaultValue: 'Pro includes {{pro}} residence. More passes are {{pct}}% off.',
          })}
        </li>
        <li className="flex gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          {t('pricingSection.agency', { n: p.agencyResidencesPerYear ?? 1, defaultValue: 'Agencies: {{n}} free residence every subscription year, public while subscribed.' })}
        </li>
      </ul>
      <button
        type="button"
        onClick={() => navigate(paths.developmentNew())}
        className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t('pricingSection.cta', 'Create a residence')}
      </button>
    </section>
  );
};
