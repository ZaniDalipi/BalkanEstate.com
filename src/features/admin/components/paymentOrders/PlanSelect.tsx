import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOrderablePlans } from '../../hooks/usePaymentOrdersAdmin';
import { formatOrderAmount } from '@/src/features/payments/utils/orderFormat';
import type { OrderablePlan } from '../../api/paymentOrdersAdminApi';

interface PlanSelectProps {
  id: string;
  value: string;
  onChange: (plan: OrderablePlan | undefined) => void;
  error?: string;
}

/** The plans that can be granted, from the catalogue (no free text). */
const PlanSelect: React.FC<PlanSelectProps> = ({ id, value, onChange, error }) => {
  const { t, i18n } = useTranslation('admin');
  const { data: plans, isLoading, isError } = useOrderablePlans();
  const period = (p?: string) =>
    p === 'yearly' ? t('paymentOrders.perYear', '/year') : p === 'monthly' ? t('paymentOrders.perMonth', '/month') : '';

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-800">{t('paymentOrders.plan', 'Plan')}</label>
      <select
        id={id}
        value={value}
        disabled={isLoading || isError}
        onChange={(e) => onChange(plans?.find((p) => p.productId === e.target.value))}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-sm aria-[invalid=true]:border-red-400"
      >
        <option value="">{isLoading ? t('paymentOrders.loadingPlans', 'Loading plans…') : t('paymentOrders.choosePlan', '— Choose a plan —')}</option>
        {plans?.map((p) => (
          <option key={p.productId} value={p.productId}>
            {p.name} · {formatOrderAmount(Math.round(p.price * 100), 'EUR', i18n.language)}{period(p.billingPeriod)}
          </option>
        ))}
      </select>
      {isError && <p role="alert" className="mt-1 text-sm text-red-700">{t('paymentOrders.plansFailed', 'Plans could not be loaded.')}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
};

export default PlanSelect;
