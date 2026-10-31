import React from 'react';
import { useTranslation } from 'react-i18next';
import type { BudgetResult, PriceReference } from '../../../../utils/budgetMatch';
import { formatPrice } from '../../../../utils/format';
import { BudgetPickCard } from './BudgetPickCard';

interface BudgetResultsProps {
  budget: number;
  result: BudgetResult;
  reference: PriceReference | null;
  onShow: (unitId: string) => void;
}

const heading = 'text-xs font-semibold uppercase tracking-wide text-slate-500';

/** The answer to "what's your budget?": homes that fit, one just over, or the most affordable one. */
export const BudgetResults: React.FC<BudgetResultsProps> = ({ budget, result, reference, onShow }) => {
  const { t } = useTranslation('developments');
  const amount = formatPrice(budget);
  const { matches, stretch, cheapest } = result;

  if (!matches.length && !stretch && !cheapest) {
    return <p className="text-sm text-slate-600">{t('budget.noneOnSale', 'No homes with a public price are on sale right now.')}</p>;
  }

  return (
    <div className="space-y-3" aria-live="polite">
      {matches.length > 0 && (
        <section className="space-y-2">
          <h3 className={heading}>{t('budget.resultsFor', { budget: amount, defaultValue: 'Homes for {{budget}}' })}</h3>
          <ul className="space-y-2">
            {matches.map((p) => (
              <BudgetPickCard key={p.unit.id} pick={p} reference={reference} onShow={onShow} />
            ))}
          </ul>
        </section>
      )}
      {stretch && (
        <section className="space-y-2">
          <h3 className={heading}>{t('budget.stretch', 'Just over your budget')}</h3>
          <ul>
            <BudgetPickCard pick={stretch} reference={reference} onShow={onShow} />
          </ul>
        </section>
      )}
      {cheapest && (
        <section className="space-y-2">
          <p className="text-sm text-slate-600">
            {t('budget.noneFit', { budget: amount, defaultValue: 'Nothing on sale fits {{budget}} yet. The most affordable home here:' })}
          </p>
          <ul>
            <BudgetPickCard pick={cheapest} reference={reference} onShow={onShow} />
          </ul>
        </section>
      )}
    </div>
  );
};
