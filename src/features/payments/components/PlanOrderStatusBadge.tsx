import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanOrderStatus } from '../types/paymentOrders';

const STYLE: Record<PlanOrderStatus, string> = {
  requested: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-neutral-100 text-neutral-600',
  mismatch: 'bg-red-100 text-red-700',
};

const DEFAULT_LABEL: Record<PlanOrderStatus, string> = {
  requested: 'Waiting for payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
  mismatch: 'Needs review',
};

/** The state of a plan order as a coloured label. */
const PlanOrderStatusBadge: React.FC<{ status: PlanOrderStatus }> = ({ status }) => {
  const { t } = useTranslation('payment');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STYLE[status]}`}>
      {t(`planRequest.status.${status}`, DEFAULT_LABEL[status])}
    </span>
  );
};

export default PlanOrderStatusBadge;
