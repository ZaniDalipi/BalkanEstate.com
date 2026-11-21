import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlanSelect from './PlanSelect';
import PaymentFields from './PaymentFields';
import { describeOrderError, todayInputValue } from './paymentOrderAdminText';
import { toPaymentInput, validatePaymentFields, type PaymentFieldErrors, type PaymentFieldValues } from './paymentFieldsValidation';
import { useRecordPayment } from '../../hooks/usePaymentOrdersAdmin';

interface RecordPaymentFormProps {
  userId: string;
  onDone: (expiresAt?: string) => void;
}

/**
 * A payment taken outside a request (in person, by phone): records it and
 * starts or extends the plan. Settles the customer's open request for the
 * same plan if there is one.
 */
const RecordPaymentForm: React.FC<RecordPaymentFormProps> = ({ userId, onDone }) => {
  const { t } = useTranslation('admin');
  const record = useRecordPayment();
  const today = todayInputValue();
  const [productId, setProductId] = useState('');
  const [planError, setPlanError] = useState<string | undefined>();
  const [values, setValues] = useState<PaymentFieldValues>({ amount: '', method: 'bank_transfer', paidAt: today, note: '' });
  const [errors, setErrors] = useState<PaymentFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problems = validatePaymentFields(values, today);
    const noPlan = productId ? undefined : t('paymentOrders.errors.PLAN_REQUIRED', 'Choose a plan.');
    setErrors(problems);
    setPlanError(noPlan);
    setFormError(null);
    if (noPlan || Object.keys(problems).length > 0) return;
    record.mutate(
      { userId, productId, ...toPaymentInput(values) },
      {
        onSuccess: (result) => onDone(result.expiresAt),
        onError: (err) => {
          const info = describeOrderError(err, t);
          if (info.field === 'amount' || info.field === 'method' || info.field === 'paidAt') {
            setErrors({ [info.field]: { text: info.text } });
          } else setFormError(info.text);
        },
      }
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <PlanSelect
        id={`record-plan-${userId}`}
        value={productId}
        error={planError}
        onChange={(plan) => {
          setProductId(plan?.productId ?? '');
          if (plan) setValues((v) => ({ ...v, amount: plan.price.toFixed(2) }));
        }}
      />
      <PaymentFields idPrefix={`record-${userId}`} values={values} onChange={setValues} errors={errors} today={today} />
      {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
      <button type="submit" disabled={record.isPending} className="min-h-[44px] w-full rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
        {record.isPending ? t('paymentOrders.saving', 'Saving…') : t('paymentOrders.recordAndStart', 'Record payment and start the plan')}
      </button>
    </form>
  );
};

export default RecordPaymentForm;
