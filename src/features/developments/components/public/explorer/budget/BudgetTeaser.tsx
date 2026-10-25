import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { BudgetPick, PriceReference } from '../../../../utils/budgetMatch';
import { useUnitText } from '../useUnitText';
import { useBudgetText } from './useBudgetText';

interface BudgetTeaserProps {
  pick: BudgetPick;
  reference: PriceReference | null;
  onOpen: () => void;
  onDismiss: () => void;
}

/** The speech bubble under the budget button: a bargain worth knowing about, or the starting price. */
export const BudgetTeaser: React.FC<BudgetTeaserProps> = ({ pick, reference, onOpen, onDismiss }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  const { bargainReason } = useBudgetText();
  const reason = bargainReason(pick, reference);
  const price = txt.price(pick.unit);
  const message = reason
    ? t('budget.teaserBargain', {
        unit: txt.title(pick.unit),
        price,
        reason,
        defaultValue: 'Bargain spotted: {{unit}} costs {{price}}, {{reason}}.',
      })
    : t('budget.teaserFrom', { price, defaultValue: 'Homes here start at {{price}}.' });

  return (
    <div role="status" className="relative w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl bg-white p-3 pr-9 text-left shadow-xl ring-1 ring-black/5">
      <span className="absolute -top-1.5 right-6 h-3 w-3 rotate-45 bg-white" aria-hidden="true" />
      <p className="text-sm text-slate-700">{message}</p>
      <button type="button" onClick={onOpen} className="mt-1 text-sm font-semibold text-primary hover:underline">
        {t('budget.ask', 'What’s your budget?')}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('budget.dismiss', 'Dismiss')}
        className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};
