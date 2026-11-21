import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/src/shared/components/ui/Modal';
import PaymentFields from './PaymentFields';
import { describeOrderError, todayInputValue } from './paymentOrderAdminText';
import { toPaymentInput, validatePaymentFields, type PaymentFieldErrors, type PaymentFieldValues } from './paymentFieldsValidation';
import { useMarkOrderPaid } from '../../hooks/usePaymentOrdersAdmin';
import { formatOrderAmount } from '@/src/features/payments/utils/orderFormat';
import type { AdminPlanOrder } from '@/src/features/payments/types/paymentOrders';

interface MarkPaidDialogProps {
  order: AdminPlanOrder;
  onClose: () => void;
}

/**
 * Confirm the money arrived: grants the plan. A different amount than the one
 * due is shown and must be accepted explicitly.
 */
const MarkPaidDialog: React.FC<MarkPaidDialogProps> = ({ order, onClose }) => {
  const { t, i18n } = useTranslation('admin');
  const markPaid = useMarkOrderPaid();
  const today = todayInputValue();
  const money = (cents: number) => formatOrderAmount(cents, order.currency, i18n.language);
  const [values, setValues] = useState<PaymentFieldValues>({
    amount: (order.amountCents / 100).toFixed(2),
    method: 'bank_transfer',
    paidAt: today,
    note: '',
  });
  const [errors, setErrors] = useState<PaymentFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<{ due: number; paid: number } | null>(null);
  const [accept, setAccept] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problems = validatePaymentFields(values, today);
    setErrors(problems);
    setFormError(null);
    if (Object.keys(problems).length > 0) return;
    markPaid.mutate(
      { reference: order.reference, input: toPaymentInput(values, accept) },
      {
        onSuccess: onClose,
        onError: (err) => {
          const info = describeOrderError(err, t);
          if (info.code === 'AMOUNT_MISMATCH' && info.amountDueCents !== undefined && info.paidAmountCents !== undefined) {
            setMismatch({ due: info.amountDueCents, paid: info.paidAmountCents });
          } else if (info.field === 'amount' || info.field === 'method' || info.field === 'paidAt') {
            setErrors({ [info.field]: { text: info.text } });
          } else {
            setFormError(info.text);
          }
        },
      }
    );
  };

  return (
    <Modal isOpen onClose={onClose} title={t('paymentOrders.markPaidTitle', 'Mark {{reference}} paid', { reference: order.reference })} size="md">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">{order.productName} · {money(order.amountCents)}</p>
          <p>{order.userName ? `${order.userName} · ` : ''}{order.userEmail}</p>
        </div>

        <PaymentFields idPrefix={`paid-${order.reference}`} values={values} onChange={(v) => { setValues(v); setMismatch(null); setAccept(false); }} errors={errors} today={today} />

        {mismatch && (
          <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p>{t('paymentOrders.mismatch', 'Received {{paid}}, but {{due}} is due.', { paid: money(mismatch.paid), due: money(mismatch.due) })}</p>
            <label className="mt-2 flex min-h-[44px] items-center gap-2 font-medium">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="h-5 w-5" />
              {t('paymentOrders.acceptAmount', 'Accept {{paid}} for this order', { paid: money(mismatch.paid) })}
            </label>
          </div>
        )}
        {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {t('paymentOrders.back', 'Back')}
          </button>
          <button type="submit" disabled={markPaid.isPending || (mismatch !== null && !accept)}
            className="min-h-[44px] rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            {markPaid.isPending ? t('paymentOrders.saving', 'Saving…') : t('paymentOrders.confirmPaid', 'Mark paid and start the plan')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MarkPaidDialog;
