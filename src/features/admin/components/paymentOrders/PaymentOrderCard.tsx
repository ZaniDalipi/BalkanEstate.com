import React from 'react';
import { useTranslation } from 'react-i18next';
import PlanOrderStatusBadge from '@/src/features/payments/components/PlanOrderStatusBadge';
import { formatOrderAmount, formatOrderDate } from '@/src/features/payments/utils/orderFormat';
import { methodLabel } from './paymentOrderAdminText';
import type { AdminPlanOrder } from '@/src/features/payments/types/paymentOrders';

interface PaymentOrderCardProps {
  order: AdminPlanOrder;
  onMarkPaid: (order: AdminPlanOrder) => void;
  onCancel: (order: AdminPlanOrder) => void;
}

/** One order: who, which plan, how much, and its state; an open one can be marked paid or cancelled. */
const PaymentOrderCard: React.FC<PaymentOrderCardProps> = ({ order, onMarkPaid, onCancel }) => {
  const { t, i18n } = useTranslation('admin');
  const money = (cents: number) => formatOrderAmount(cents, order.currency, i18n.language);
  const date = (iso?: string) => formatOrderDate(iso, i18n.language);
  const paidDiffers = order.paidAmountCents !== undefined && order.paidAmountCents !== order.amountCents;

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-gray-900">{order.reference}</p>
          <p className="text-sm text-gray-800">
            {order.productName} · <span className="font-semibold">{money(order.amountCents)}</span>
            {order.discountCode && <span className="text-gray-500"> ({order.discountCode})</span>}
          </p>
          <p className="truncate text-sm text-gray-600">{order.userName ? `${order.userName} · ` : ''}{order.userEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          {order.source === 'admin' && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{t('paymentOrders.byTeam', 'Added by team')}</span>
          )}
          <PlanOrderStatusBadge status={order.status} />
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {t('paymentOrders.requestedOn', 'Requested {{date}}', { date: date(order.createdAt) })}
        {order.status === 'paid' && order.paidAt && (
          <> · {t('paymentOrders.paidVia', 'Paid {{date}} by {{method}}', { date: date(order.paidAt), method: methodLabel(order.method, t) })}
            {paidDiffers && <> · {t('paymentOrders.received', 'received {{amount}}', { amount: money(order.paidAmountCents ?? 0) })}</>}
          </>
        )}
      </p>
      {order.note && <p className="mt-1 text-xs text-gray-600">{t('paymentOrders.noteLabel', 'Note: {{note}}', { note: order.note })}</p>}
      {order.cancelReason && <p className="mt-1 text-xs text-gray-600">{t('paymentOrders.cancelledBecause', 'Cancelled: {{reason}}', { reason: order.cancelReason })}</p>}

      {order.status === 'requested' && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => onMarkPaid(order)} className="min-h-[44px] rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700">
            {t('paymentOrders.markPaid', 'Mark paid')}
          </button>
          <button type="button" onClick={() => onCancel(order)} className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {t('paymentOrders.cancel', 'Cancel request')}
          </button>
        </div>
      )}
    </li>
  );
};

export default PaymentOrderCard;
