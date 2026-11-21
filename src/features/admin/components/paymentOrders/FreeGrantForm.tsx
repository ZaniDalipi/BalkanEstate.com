import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlanSelect from './PlanSelect';
import { describeOrderError } from './paymentOrderAdminText';
import { useFreeGrant } from '../../hooks/usePaymentOrdersAdmin';

interface FreeGrantFormProps {
  userId: string;
  onDone: (expiresAt?: string) => void;
}

const MIN_REASON = 3;

/** Give a plan for free. The reason is required and kept with the €0 payment record. */
const FreeGrantForm: React.FC<FreeGrantFormProps> = ({ userId, onDone }) => {
  const { t } = useTranslation('admin');
  const grant = useFreeGrant();
  const reasonId = useId();
  const [productId, setProductId] = useState('');
  const [reason, setReason] = useState('');
  const [planError, setPlanError] = useState<string | undefined>();
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const noPlan = productId ? undefined : t('paymentOrders.errors.PLAN_REQUIRED', 'Choose a plan.');
    const noReason = reason.trim().length >= MIN_REASON ? undefined : t('paymentOrders.errors.REASON_REQUIRED', 'Say why this plan is given for free.');
    setPlanError(noPlan);
    setReasonError(noReason);
    setFormError(null);
    if (noPlan || noReason) return;
    grant.mutate(
      { userId, productId, reason: reason.trim() },
      {
        onSuccess: (result) => onDone(result.expiresAt),
        onError: (err) => {
          const info = describeOrderError(err, t);
          if (info.field === 'reason') setReasonError(info.text);
          else setFormError(info.text);
        },
      }
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <PlanSelect id={`grant-plan-${userId}`} value={productId} error={planError} onChange={(plan) => setProductId(plan?.productId ?? '')} />
      <div>
        <label htmlFor={reasonId} className="block text-sm font-medium text-gray-800">{t('paymentOrders.reason', 'Why is it free?')}</label>
        <textarea
          id={reasonId}
          rows={2}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('paymentOrders.reasonPlaceholder', 'e.g. partner agency, compensation for downtime')}
          aria-invalid={Boolean(reasonError)}
          aria-describedby={reasonError ? `${reasonId}-err` : undefined}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm aria-[invalid=true]:border-red-400"
        />
        {reasonError && <p id={`${reasonId}-err`} role="alert" className="mt-1 text-sm text-red-700">{reasonError}</p>}
      </div>
      {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
      <button type="submit" disabled={grant.isPending} className="min-h-[44px] w-full rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
        {grant.isPending ? t('paymentOrders.saving', 'Saving…') : t('paymentOrders.grantFree', 'Give the plan for free')}
      </button>
    </form>
  );
};

export default FreeGrantForm;
