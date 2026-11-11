import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/src/shared/components/ui/Input';
import { SoftIcon } from '@/src/shared/illustrations';
import { CODE_FORM_LIMITS, type CodeDiscountChoice } from './residenceCodeForm';

interface CodeDiscountFieldProps {
  choice: CodeDiscountChoice;
  value: string;
  onChoice: (c: CodeDiscountChoice) => void;
  onValue: (v: string) => void;
  error?: string;
  disabled: boolean;
}

const CHOICES: { id: CodeDiscountChoice; icon: 'key' | 'tag' | 'cash' }[] = [
  { id: 'full', icon: 'key' },
  { id: 'percentage', icon: 'tag' },
  { id: 'fixed', icon: 'cash' },
];

/**
 * What a code takes off: the whole price (it unlocks the purchase at once),
 * a percentage, or an amount in euros (the owner then pays the rest).
 */
export const CodeDiscountField: React.FC<CodeDiscountFieldProps> = ({ choice, value, onChoice, onValue, error, disabled }) => {
  const { t } = useTranslation(['admin']);
  const label = (c: CodeDiscountChoice) =>
    ({
      full: t('admin:residenceCodes.form.discountFull', 'Whole price (unlocks at once)'),
      percentage: t('admin:residenceCodes.form.discountPercent', 'Percent off'),
      fixed: t('admin:residenceCodes.form.discountFixed', 'Amount off (€)'),
    })[c];
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-gray-700">{t('admin:residenceCodes.form.discount', 'Discount')}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {CHOICES.map(({ id, icon }) => (
          <label key={id} className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 ${choice === id ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-gray-300 hover:border-gray-400'}`}>
            <input type="radio" name="code-discount" value={id} checked={choice === id} onChange={() => onChoice(id)} className="sr-only" disabled={disabled} />
            <SoftIcon name={icon} className="h-8 w-8 shrink-0" />
            <span className="text-sm font-semibold text-gray-900">{label(id)}</span>
          </label>
        ))}
      </div>
      {choice !== 'full' && (
        <div className="mt-3 max-w-xs">
          <Input
            label={choice === 'percentage' ? t('admin:residenceCodes.form.percentValue', 'Percent off (%)') : t('admin:residenceCodes.form.fixedValue', 'Amount off (€)')}
            value={value}
            onChange={(e) => onValue(e.target.value)}
            inputMode="numeric"
            error={error}
            helperText={
              choice === 'percentage'
                ? t('admin:residenceCodes.form.percentHint', { max: CODE_FORM_LIMITS.maxPercent, defaultValue: '1 to {{max}}; the owner pays the rest' })
                : t('admin:residenceCodes.form.fixedHint', 'Never more than the price; the owner pays the rest')
            }
            disabled={disabled}
          />
        </div>
      )}
    </fieldset>
  );
};
