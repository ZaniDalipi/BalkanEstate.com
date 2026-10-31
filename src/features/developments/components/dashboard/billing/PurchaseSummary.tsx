import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { ResidenceBilling, ResidencePurchaseKind } from '../../../types';
import { formatCharge } from '../../../utils/format';

interface PurchaseSummaryProps {
  kind: ResidencePurchaseKind;
  quantity: number;
  billing: ResidenceBilling;
}

/** What the buyer gets and what it costs (with the premium discount when there is one). */
export const PurchaseSummary: React.FC<PurchaseSummaryProps> = ({ kind, quantity, billing }) => {
  const { t } = useTranslation('developments');
  const q = kind === 'pass' ? billing.prices.pass : billing.prices.extraBuilding;
  const total = Math.round(q.unitPrice * quantity * 100) / 100;
  const perks =
    kind === 'pass'
      ? [
          t('billing.perk.months', { months: billing.terms.passMonths, defaultValue: 'Public for {{months}} months' }),
          t('billing.perk.buildings', { n: billing.terms.includedBuildings, defaultValue: '{{n}} buildings included' }),
          t('billing.perk.renew', 'Renewing early adds to the end date'),
        ]
      : [t('billing.perk.extra', 'More buildings until your pass renews')];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <ul className="space-y-1.5">
        {perks.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
        {quantity > 1 && (
          <div className="flex justify-between text-slate-600">
            <dt>{t('billing.summary.each', { n: quantity, defaultValue: '{{n}} × price' })}</dt>
            <dd>{formatCharge(q.unitPrice)}</dd>
          </div>
        )}
        {q.discountPct > 0 && (
          <div className="flex justify-between text-emerald-700">
            <dt>{t('billing.summary.discount', { pct: q.discountPct, defaultValue: 'Premium discount ({{pct}}%)' })}</dt>
            <dd>
              <s className="text-slate-400">{formatCharge(q.listPrice * quantity)}</s>
            </dd>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold text-slate-900">
          <dt>{t('billing.summary.total', 'Total')}</dt>
          <dd>{formatCharge(total)}</dd>
        </div>
      </dl>
    </div>
  );
};
