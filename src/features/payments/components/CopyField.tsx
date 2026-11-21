import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCopyText } from '@/src/shared/hooks/useCopyText';

interface CopyFieldProps {
  label: string;
  value: string;
  /** Monospace for references and account numbers. */
  mono?: boolean;
}

/** A labelled value with a copy button, for references and bank details. */
const CopyField: React.FC<CopyFieldProps> = ({ label, value, mono = false }) => {
  const { t } = useTranslation('payment');
  const { copied, failed, copy } = useCopyText();
  const isCopied = copied === value;

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="min-w-0">
        <p className="text-[11px] sm:text-xs text-neutral-500">{label}</p>
        <p className={`text-sm font-semibold text-neutral-900 break-all select-all ${mono ? 'font-mono' : ''}`}>{value}</p>
        {failed && (
          <p role="alert" className="text-[11px] text-amber-700">
            {t('planRequest.copyFailed', "Copying didn't work. Select the text to copy it.")}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => copy(value, value)}
        aria-label={t('planRequest.copyLabel', 'Copy {{label}}', { label })}
        className="shrink-0 min-h-[44px] min-w-[44px] px-3 rounded-lg border border-neutral-200 bg-white text-xs font-medium text-primary hover:bg-primary/5"
      >
        <span aria-live="polite">{isCopied ? t('planRequest.copied', 'Copied') : t('planRequest.copy', 'Copy')}</span>
      </button>
    </div>
  );
};

export default CopyField;
