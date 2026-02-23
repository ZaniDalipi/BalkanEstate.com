import React from 'react';
import { useTranslation } from 'react-i18next';

interface SubscriptionData {
  status: string;
  plan: string;
  startDate: string;
  endDate: string;
  price: number;
}

interface SubscriptionCardProps {
  subscription: SubscriptionData | null;
  isLoading: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
  trial: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Trial' },
  expired: { bg: 'bg-red-100', text: 'text-red-800', label: 'Expired' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
  none: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'No Plan' },
};

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ subscription, isLoading }) => {
  const { t } = useTranslation(['agencyDashboard']);

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

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(price);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          <div className="flex justify-between">
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('agencyDashboard:financial.subscription', 'Subscription')}
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          <p className="text-sm font-medium">
            {t('agencyDashboard:financial.noSubscription', 'No active subscription')}
          </p>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[subscription.status] ?? STATUS_STYLES.none;

  const daysUntilRenewal = subscription.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('agencyDashboard:financial.subscription', 'Subscription')}
        </h3>
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
          {t(`agencyDashboard:financial.status.${subscription.status}`, statusStyle.label)}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('agencyDashboard:financial.plan', 'Plan')}</span>
          <span className="text-sm font-semibold text-gray-900">{subscription.plan}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('agencyDashboard:financial.startDate', 'Start Date')}</span>
          <span className="text-sm text-gray-700">{formatDate(subscription.startDate)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('agencyDashboard:financial.endDate', 'End Date')}</span>
          <span className="text-sm text-gray-700">{formatDate(subscription.endDate)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-100 pt-3">
          <span className="text-sm text-gray-500">{t('agencyDashboard:financial.price', 'Price')}</span>
          <span className="text-lg font-bold text-gray-900">{formatPrice(subscription.price)}</span>
        </div>
        {daysUntilRenewal !== null && subscription.status === 'active' && (
          <div className="bg-indigo-50 rounded-lg px-4 py-2.5 mt-2">
            <p className="text-xs text-indigo-700 font-medium">
              {t('agencyDashboard:financial.renewal', 'Renews in {{days}} days', { days: daysUntilRenewal })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionCard;
