import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PaymentInstructionsCard from './PaymentInstructionsCard';
import PlanOrderStatusBadge from './PlanOrderStatusBadge';
import { useMyPlanRequests } from '../hooks/usePlanRequests';
import { formatOrderAmount, formatOrderDate } from '../utils/orderFormat';

/**
 * The plans I asked for and where each stands. A request waiting for payment
 * can show how to pay again. Shows nothing when there are no requests.
 */
const MyPlanRequests: React.FC = () => {
  const { t, i18n } = useTranslation('payment');
  const { data, isError, refetch } = useMyPlanRequests();
  const [open, setOpen] = useState<string | null>(null);

  if (isError) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between gap-3">
        <span>{t('planRequest.loadFailed', 'Your plan requests could not be loaded.')}</span>
        <button type="button" onClick={() => refetch()} className="min-h-[44px] px-3 font-medium underline">
          {t('planRequest.retry', 'Try again')}
        </button>
      </div>
    );
  }
  if (!data || data.orders.length === 0) return null;

  return (
    <section aria-labelledby="my-plan-requests" className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
      <h3 id="my-plan-requests" className="text-lg font-bold text-neutral-800 mb-3">
        {t('planRequest.myRequests', 'My plan requests')}
      </h3>
      <ul className="space-y-3">
        {data.orders.map((order) => {
          const isOpen = open === order.reference;
          const date = order.status === 'paid' && order.paidAt
            ? t('planRequest.paidOn', 'Paid {{date}}', { date: formatOrderDate(order.paidAt, i18n.language) })
            : t('planRequest.requestedOn', 'Requested {{date}}', { date: formatOrderDate(order.createdAt, i18n.language) });
          return (
            <li key={order.reference} className="rounded-lg border border-neutral-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-neutral-900">{order.productName}</p>
                  <p className="text-xs text-neutral-500">
                    {formatOrderAmount(order.amountCents, order.currency, i18n.language)} · {date} · <span className="font-mono">{order.reference}</span>
                  </p>
                </div>
                <PlanOrderStatusBadge status={order.status} />
              </div>
              {order.status === 'requested' && (
                <>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : order.reference)}
                    className="mt-2 min-h-[44px] text-sm font-medium text-primary underline"
                  >
                    {isOpen ? t('planRequest.hideHowToPay', 'Hide payment details') : t('planRequest.showHowToPay', 'How to pay')}
                  </button>
                  {isOpen && (
                    <div className="mt-2">
                      <PaymentInstructionsCard order={order} instructions={data.instructions} />
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default MyPlanRequests;
