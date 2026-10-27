import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_MOVE_PCT, MAX_SIZE_PCT, MIN_SIZE_PCT, type TransferFieldProblem } from '../../../utils/regionTransfer';

export interface TransferValues {
  size: string;
  moveX: string;
  moveY: string;
}

interface TransferFieldsProps {
  values: TransferValues;
  onChange: (next: TransferValues) => void;
  /** Which field the last attempt refused, if any. */
  problem: TransferFieldProblem | null;
}

const inputCls =
  'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-[invalid=true]:border-red-400 sm:min-h-[36px]';

/** Size and position of the copied group, each with its reason next to it. */
export const TransferFields: React.FC<TransferFieldsProps> = ({ values, onChange, problem }) => {
  const { t } = useTranslation('developments');
  const id = useId();
  const field = (key: keyof TransferValues, label: string, bad: TransferFieldProblem) => (
    <div>
      <label htmlFor={`${id}-${key}`} className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        id={`${id}-${key}`}
        inputMode="decimal"
        value={values[key]}
        onChange={(e) => onChange({ ...values, [key]: e.target.value })}
        aria-invalid={problem === bad}
        aria-describedby={problem === bad ? `${id}-err` : undefined}
        className={inputCls}
      />
    </div>
  );
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-3 gap-2">
        {field('size', t('editor.copyFrom.size', 'Size (%)'), 'size')}
        {field('moveX', t('editor.copyFrom.moveX', 'Right (%)'), 'moveX')}
        {field('moveY', t('editor.copyFrom.moveY', 'Down (%)'), 'moveY')}
      </div>
      {problem && (
        <p id={`${id}-err`} role="alert" className="text-xs text-red-700">
          {problem === 'size'
            ? t('editor.copyFrom.sizeInvalid', { min: MIN_SIZE_PCT, max: MAX_SIZE_PCT, defaultValue: 'Enter a size from {{min}} to {{max}} %.' })
            : t('editor.copyFrom.moveInvalid', { max: MAX_MOVE_PCT, defaultValue: 'Enter a number from -{{max}} to {{max}}. A minus moves left or up.' })}
        </p>
      )}
    </div>
  );
};
