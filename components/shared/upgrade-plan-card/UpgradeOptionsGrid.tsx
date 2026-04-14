import React from 'react';
import { useTranslation } from 'react-i18next';
import UpgradePlanCard from './UpgradePlanCard';

// Types
interface UpgradeOption {
  key: string;
  planName: string;
  description?: string;
  price: number;
  period: 'month' | 'year';
  badge?: string;
  isEnterprise?: boolean;
  isHighlighted?: boolean;
  listingsLimit: number;
  promoCoupons: number;
  features: string[];
  savings?: string;
  originalPrice?: number;
}

interface UpgradeOptionsGridProps {
  options: UpgradeOption[];
  onUpgradeClick: (planKey: string) => void;
  isLoading?: boolean;
  error?: Error | null;
  currentPlanKey?: string;
}

/**
 * Container component for upgrade plan options grid
 * Handles responsive layout and error states
 * Follows mobile-first responsive design pattern
 */
const UpgradeOptionsGrid: React.FC<UpgradeOptionsGridProps> = ({
  options,
  onUpgradeClick,
  isLoading = false,
  error = null,
  currentPlanKey,
}) => {
  const { t } = useTranslation('subscription');

  // Validation
  if (!options || !Array.isArray(options)) {
    console.error('Invalid options passed to UpgradeOptionsGrid');
    return null;
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-red-900">
              {t('errors.loadingPlans', 'Failed to load plans')}
            </h4>
            <p className="text-sm text-red-700 mt-1">
              {error.message || t('errors.tryAgain', 'Please try again later.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-3xl bg-gray-200 h-96 animate-pulse" />
        ))}
      </div>
    );
  }

  // Empty State
  if (options.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900">
              {t('messages.noPlans', 'No plans available')}
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              {t('messages.noPlansCurrent', 'You are already on the best plan available.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900">
          {t('sections.upgradePlan', 'Upgrade Your Plan')}
        </h3>
        <p className="text-sm sm:text-base text-neutral-600">
          {t('sections.upgradePlanSubtitle', 'Choose a plan that fits your needs')}
        </p>
      </div>

      {/* Responsive Grid - Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 auto-rows-max">
        {options.map((option) => (
          <UpgradePlanCard
            key={option.key}
            planKey={option.key}
            planName={option.planName}
            description={option.description}
            price={option.price}
            period={option.period}
            badge={option.badge}
            isEnterprise={option.isEnterprise}
            isHighlighted={option.isHighlighted}
            listingsLimit={option.listingsLimit}
            promoCoupons={option.promoCoupons}
            features={option.features}
            savings={option.savings}
            originalPrice={option.originalPrice}
            onUpgradeClick={onUpgradeClick}
            isDisabled={option.key === currentPlanKey}
          />
        ))}
      </div>

      {/* Mobile Helper Text */}
      <div className="sm:hidden mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-700 flex items-center gap-2">
          <span>💡</span>
          {t('tips.swipeToCompare', 'Scroll to see all plans')}
        </p>
      </div>

      {/* Tablet Helper Text */}
      <div className="hidden sm:block lg:hidden mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs sm:text-sm text-blue-700 flex items-center gap-2">
          <span>ℹ️</span>
          {t('tips.tabletCompare', 'All your plan options are displayed above')}
        </p>
      </div>
    </div>
  );
};

export default React.memo(UpgradeOptionsGrid);
