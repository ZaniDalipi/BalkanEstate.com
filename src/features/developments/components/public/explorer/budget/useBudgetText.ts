import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BUDGET_MAX, BUDGET_MIN, type BudgetError, type BudgetPick, type PriceReference } from '../../../../utils/budgetMatch';
import { formatPrice } from '../../../../utils/format';

/** Wording for the budget helper: why a home is a bargain, and input errors. */
export function useBudgetText() {
  const { t } = useTranslation('developments');

  /** "14% below the Tirana average per m²" — only for real bargains. */
  const bargainReason = useCallback(
    (pick: BudgetPick, ref: PriceReference | null): string | null => {
      if (!pick.bargain || pick.belowPct === null || !ref) return null;
      return ref.kind === 'location' && ref.place
        ? t('budget.bargainLocation', { pct: pick.belowPct, place: ref.place, defaultValue: '{{pct}}% below the {{place}} average per m²' })
        : t('budget.bargainResidence', { pct: pick.belowPct, defaultValue: '{{pct}}% below this residence’s average per m²' });
    },
    [t]
  );

  const errorText = useCallback(
    (error: BudgetError): string => {
      switch (error) {
        case 'empty':
          return t('budget.errors.empty', 'Enter your budget.');
        case 'tooLow':
          return t('budget.errors.tooLow', { min: formatPrice(BUDGET_MIN), defaultValue: 'Enter at least {{min}}.' });
        case 'tooHigh':
          return t('budget.errors.tooHigh', { max: formatPrice(BUDGET_MAX), defaultValue: 'Enter at most {{max}}.' });
        default:
          return t('budget.errors.invalid', 'Enter an amount in euros, like 150.000 or 150k.');
      }
    },
    [t]
  );

  return { bargainReason, errorText };
}
