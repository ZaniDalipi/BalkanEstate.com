import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/src/shared/components/ui/Modal';
import { describeOrderError } from './paymentOrderAdminText';
import { useCancelOrder } from '../../hooks/usePaymentOrdersAdmin';
import type { AdminPlanOrder } from '@/src/features/payments/types/paymentOrders';

interface CancelOrderDialogProps {
  order: AdminPlanOrder;
  onClose: () => void;
}

/** Cancel an open request (the customer won't pay, or asked twice). A reserved code use is given back. */
const CancelOrderDialog: React.FC<CancelOrderDialogProps> = ({ order, onClose }) => {
  const { t } = useTranslation('admin');
  const cancel = useCancelOrder();
  const id = useId();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    cancel.mutate(
      { reference: order.reference, reason: reason.trim() || undefined },
      { onSuccess: onClose, onError: (err) => setError(describeOrderError(err, t).text) }
    );
  };

  return (
    <Modal isOpen onClose={onClose} title={t('paymentOrders.cancelTitle', 'Cancel {{reference}}?', { reference: order.reference })} size="md">
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-gray-700">
          {t('paymentOrders.cancelHelp', 'The request is closed and the customer can request again. A discount code use is given back.')}
        </p>
        <div>
          <label htmlFor={id} className="block text-sm font-medium text-gray-800">{t('paymentOrders.cancelReason', 'Reason (optional)')}</label>
          <input id={id} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {t('paymentOrders.back', 'Back')}
          </button>
          <button type="submit" disabled={cancel.isPending} className="min-h-[44px] rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {cancel.isPending ? t('paymentOrders.saving', 'Saving…') : t('paymentOrders.confirmCancel', 'Cancel the request')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CancelOrderDialog;
