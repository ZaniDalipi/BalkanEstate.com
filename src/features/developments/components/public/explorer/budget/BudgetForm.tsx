import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { parseBudget } from '../../../../utils/budgetMatch';
import { useBudgetText } from './useBudgetText';

interface BudgetFormProps {
  initial?: string;
  onSubmit: (budget: number, raw: string) => void;
}

/**
 * The budget field. Validated on submit (and live once it has been wrong),
 * with the reason announced to screen readers; only whole euros go out.
 */
export const BudgetForm: React.FC<BudgetFormProps> = ({ initial = '', onSubmit }) => {
  const { t } = useTranslation('developments');
  const { errorText } = useBudgetText();
  const id = useId();
  const [raw, setRaw] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseBudget(raw);
    if (parsed.ok === false) return setError(errorText(parsed.error));
    setError(null);
    onSubmit(parsed.value, raw);
  };

  const onChange = (value: string) => {
    setRaw(value);
    if (error) {
      const parsed = parseBudget(value);
      setError(parsed.ok === false ? errorText(parsed.error) : null);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {t('budget.label', 'Your budget')}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id={id}
            value={raw}
            onChange={(e) => onChange(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            placeholder={t('budget.placeholder', 'e.g. 150.000')}
            aria-invalid={!!error}
            aria-describedby={`${id}-msg`}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-base text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 aria-[invalid=true]:border-red-400"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500" aria-hidden="true">
            €
          </span>
        </div>
        <button type="submit" className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          <Search className="h-4 w-4" aria-hidden="true" />
          {t('budget.submit', 'Show options')}
        </button>
      </div>
      <p id={`${id}-msg`} role={error ? 'alert' : undefined} className={error ? 'text-sm text-red-700' : 'text-xs text-slate-500'}>
        {error ?? t('budget.hint', 'Type an amount like 150.000, 150k or 1,2m.')}
      </p>
    </form>
  );
};
