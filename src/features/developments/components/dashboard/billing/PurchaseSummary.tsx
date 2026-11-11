import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { ResidenceBilling, ResidencePurchaseKind } from '../../../types';
import { formatCharge } from '../../../utils/format';
import type { AppliedCode } from '../../../utils/codeDiscount';

interface PurchaseSummaryProps {
  kind: ResidencePurchaseKind;
  quantity: number;
  billing: ResidenceBilling;
  /** A discount code the server accepted: its amount off, and the new total. */
  applied?: AppliedCode | null;
}

/** What the buyer gets and what it costs (with the premium discount, and a discount code, when there are). */
export const PurchaseSummary: React.FC<PurchaseSummaryProps> = ({ kind, quantity, billing, applied }) => {
  const { t } = useTranslation('developments');
  const q = kind === 'pass' ? billing.prices.pass : billing.prices.extraBuilding;
  const total = applied ? applied.amount : Math.round(q.unitPrice * quantity * 100) / 100;
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
        {applied && (
          <div className="flex justify-between text-emerald-700">
            <dt>{t('billing.summary.code', { code: applied.code, defaultValue: 'Code {{code}}' })}</dt>
            <dd>−{formatCharge(applied.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold text-slate-900">
          <dt>{t('billing.summary.total', 'Total')}</dt>
          <dd>{formatCharge(total)}</dd>
        </div>
        {kind === 'pass' && (
          <p className="pt-1 text-xs leading-relaxed text-slate-600">
            {t('billing.summary.validity', { months: billing.terms.passMonths, defaultValue: 'One payment, valid for {{months}} months — not a lifetime pass. It doesn’t renew by itself.' })}
          </p>
        )}
      </dl>
    </div>
  );
};
