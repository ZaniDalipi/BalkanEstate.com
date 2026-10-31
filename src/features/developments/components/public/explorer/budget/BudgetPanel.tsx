import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { PublicUnit } from '../../../../types';
import { matchBudget, type PriceReference } from '../../../../utils/budgetMatch';
import { useEscapeLayer } from '../useEscapeLayer';
import { BudgetForm } from './BudgetForm';
import { BudgetResults } from './BudgetResults';

interface BudgetPanelProps {
  units: PublicUnit[];
  reference: PriceReference | null;
  onShow: (unitId: string) => void;
  onClose: () => void;
}

/** The open helper: ask for a budget, then list the homes that fit it. Esc closes it. */
export const BudgetPanel: React.FC<BudgetPanelProps> = ({ units, reference, onShow, onClose }) => {
  const { t } = useTranslation('developments');
  const ref = useRef<HTMLDivElement>(null);
  const [budget, setBudget] = useState<{ value: number; raw: string } | null>(null);
  const result = useMemo(() => (budget ? matchBudget(units, budget.value, reference) : null), [units, budget, reference]);
  useEscapeLayer(ref, onClose);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t('budget.title', 'Find a home in your budget')}
      className="max-h-[min(70vh,34rem)] w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl bg-white p-4 text-left shadow-2xl ring-1 ring-black/5"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900">{t('budget.title', 'Find a home in your budget')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('budget.close', 'Close')}
          className="-m-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <BudgetForm initial={budget?.raw} onSubmit={(value, raw) => setBudget({ value, raw })} />
      {budget && result && (
        <div className="mt-4">
          <BudgetResults budget={budget.value} result={result} reference={reference} onShow={onShow} />
        </div>
      )}
    </div>
  );
};
