import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgencyFinancial } from '../../hooks';
import type { CouponInfo } from '../../types';
import SubscriptionCard from './SubscriptionCard';
import CouponUsagePanel from './CouponUsagePanel';

interface FinancialBillingSectionProps {
  agencyId: string;
}

interface CouponSummary {
  total: number;
  used: number;
  available: number;
}

interface PromotionCouponSummary extends CouponSummary {
  refreshDate: string;
}

function summarizeCoupons(coupons: CouponInfo[]): CouponSummary {
  const total = coupons.length;
  const used = coupons.filter((c) => c.status === 'used').length;
  const available = coupons.filter((c) => c.status === 'available').length;
  return { total, used, available };
}

function getNextRefreshDate(coupons: CouponInfo[]): string {
  const available = coupons
    .filter((c) => c.status === 'available')
    .map((c) => c.expiresAt)
    .sort();
  return available[0] ?? '';
}

const FinancialBillingSection: React.FC<FinancialBillingSectionProps> = ({ agencyId }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const { financial, isLoading } = useAgencyFinancial(agencyId);

  const subscriptionData = useMemo(() => {
    if (!financial?.subscription) return null;
    const sub = financial.subscription;
    return {
      status: sub.status,
      plan: sub.plan,
      startDate: sub.startDate ?? '',
      endDate: sub.endDate ?? '',
      price: sub.amount,
    };
  }, [financial?.subscription]);

  const agentCoupons = useMemo<CouponSummary>(() => {
    if (!financial?.agentCoupons) return { total: 0, used: 0, available: 0 };
    return summarizeCoupons(financial.agentCoupons);
  }, [financial?.agentCoupons]);

  const promotionCoupons = useMemo<PromotionCouponSummary>(() => {
    if (!financial?.promotionCoupons) return { total: 0, used: 0, available: 0, refreshDate: '' };
    const summary = summarizeCoupons(financial.promotionCoupons);
    const refreshDate = getNextRefreshDate(financial.promotionCoupons);
    return { ...summary, refreshDate };
  }, [financial?.promotionCoupons]);

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t('agencyDashboard:financial.title', 'Financial & Billing')}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubscriptionCard subscription={subscriptionData} isLoading={isLoading} />
        <CouponUsagePanel
          agentCoupons={agentCoupons}
          promotionCoupons={promotionCoupons}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
};

export default FinancialBillingSection;
