import React from 'react';
import { useTranslation } from 'react-i18next';

interface CouponSummary {
  total: number;
  used: number;
  available: number;
}

interface PromotionCouponSummary extends CouponSummary {
  refreshDate: string;
}

interface CouponUsagePanelProps {
  agentCoupons: CouponSummary;
  promotionCoupons: PromotionCouponSummary;
  isLoading: boolean;
}

interface CouponSectionProps {
  title: string;
  summary: CouponSummary;
  accentColor: string;
  barBg: string;
  refreshDate?: string;
}

const CouponSection: React.FC<CouponSectionProps> = ({ title, summary, accentColor, barBg, refreshDate }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const usagePercent = summary.total > 0 ? (summary.used / summary.total) * 100 : 0;

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-800 mb-3">{title}</h4>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          <p className="text-xs text-gray-500">{t('agencyDashboard:financial.total', 'Total')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-500">{summary.used}</p>
          <p className="text-xs text-gray-500">{t('agencyDashboard:financial.used', 'Used')}</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${accentColor}`}>{summary.available}</p>
          <p className="text-xs text-gray-500">{t('agencyDashboard:financial.available', 'Available')}</p>
        </div>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barBg}`}
          style={{ width: `${usagePercent}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1.5">
        {t('agencyDashboard:financial.usagePercent', '{{percent}}% used', {
          percent: Math.round(usagePercent),
        })}
      </p>
      {refreshDate && (
        <p className="text-xs text-gray-500 mt-1">
          {t('agencyDashboard:financial.refreshDate', 'Refreshes on {{date}}', {
            date: formatDate(refreshDate),
          })}
        </p>
      )}
    </div>
  );
};

const CouponUsagePanel: React.FC<CouponUsagePanelProps> = ({
  agentCoupons,
  promotionCoupons,
  isLoading,
}) => {
  const { t } = useTranslation(['agencyDashboard']);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="text-center">
                    <div className="h-8 w-10 bg-gray-100 rounded animate-pulse mx-auto mb-1" />
                    <div className="h-3 w-12 bg-gray-50 rounded animate-pulse mx-auto" />
                  </div>
                ))}
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        {t('agencyDashboard:financial.coupons', 'Coupons')}
      </h3>
      <div className="space-y-6">
        <CouponSection
          title={t('agencyDashboard:financial.agentCoupons', 'Agent Coupons')}
          summary={agentCoupons}
          accentColor="text-green-600"
          barBg="bg-green-500"
        />
        <div className="border-t border-gray-100" />
        <CouponSection
          title={t('agencyDashboard:financial.promotionCoupons', 'Promotion Coupons')}
          summary={promotionCoupons}
          accentColor="text-indigo-600"
          barBg="bg-indigo-500"
          refreshDate={promotionCoupons.refreshDate}
        />
      </div>
    </div>
  );
};

export default CouponUsagePanel;
