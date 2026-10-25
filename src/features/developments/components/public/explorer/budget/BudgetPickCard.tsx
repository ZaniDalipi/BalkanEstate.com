import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BadgePercent } from 'lucide-react';
import type { BudgetPick, PriceReference } from '../../../../utils/budgetMatch';
import { formatPrice } from '../../../../utils/format';
import { useUnitText } from '../useUnitText';
import { useBudgetText } from './useBudgetText';

interface BudgetPickCardProps {
  pick: BudgetPick;
  reference: PriceReference | null;
  onShow: (unitId: string) => void;
}

/** One suggested apartment: where it is, its key facts, why it is a good buy, and "Take me there". */
export const BudgetPickCard: React.FC<BudgetPickCardProps> = ({ pick, reference, onShow }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  const { bargainReason } = useBudgetText();
  const u = pick.unit;
  const reason = bargainReason(pick, reference);
  const where = [u.buildingName, u.floorLabel].filter(Boolean).join(' · ');
  const facts = [typeof u.beds === 'number' ? txt.bedrooms(u.beds) : null, txt.area(u) || null].filter(Boolean).join(' · ');

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{txt.title(u)}</p>
          {where && <p className="truncate text-xs text-slate-500">{where}</p>}
          {facts && <p className="mt-0.5 text-sm text-slate-600">{facts}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-bold text-slate-900">{txt.price(u)}</p>
          {pick.pricePerSqm !== null && (
            <p className="text-xs text-slate-500">{t('budget.perSqm', { price: formatPrice(Math.round(pick.pricePerSqm)), defaultValue: '{{price}}/m²' })}</p>
          )}
        </div>
      </div>
      {reason && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
          <BadgePercent className="h-3.5 w-3.5" aria-hidden="true" />
          {t('budget.bargain', 'Bargain')} · {reason}
        </p>
      )}
      <button
        type="button"
        onClick={() => onShow(u.id)}
        className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {t('budget.show', 'Take me there')}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
};
