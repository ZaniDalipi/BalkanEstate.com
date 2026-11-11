import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { formatCharge } from '../../../utils/format';
import type { AppliedCode } from '../../../utils/codeDiscount';

/**
 * A discount code was accepted: the new price, and the next step. While we
 * take no payments online, the rest is paid by arrangement (the email to us
 * already carries the code and the new price), after which we send an
 * unlock code.
 */
export const CodeAppliedNote: React.FC<{ applied: AppliedCode }> = ({ applied }) => {
  const { t } = useTranslation('developments');
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <SoftIcon name="tag" className="h-8 w-8 shrink-0" />
      <p>
        <span className="font-semibold">
          {t('billing.code.applied', { amount: formatCharge(applied.amount), list: formatCharge(applied.listAmount), defaultValue: 'Code applied: you pay {{amount}} instead of {{list}}.' })}
        </span>{' '}
        {t('billing.code.appliedNext', 'Write to us about the rest (the email already has the code and price); once it is paid we send you an unlock code to enter here.')}
      </p>
    </div>
  );
};
