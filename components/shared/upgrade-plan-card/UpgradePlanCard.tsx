import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon } from '../../../constants';

// Types
interface UpgradePlanCardProps {
  planKey: string;
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
  onUpgradeClick: (planKey: string) => void;
  isDisabled?: boolean;
}

/**
 * Presentational component for individual upgrade plan card
 * Handles layout, styling, and user interactions
 * Responsive design for mobile, tablet, and desktop
 */
const UpgradePlanCard: React.FC<UpgradePlanCardProps> = ({
  planKey,
  planName,
  description,
  price,
  period,
  badge,
  isEnterprise = false,
  isHighlighted = false,
  listingsLimit,
  promoCoupons,
  features,
  savings,
  originalPrice,
  onUpgradeClick,
  isDisabled = false,
}) => {
  const { t } = useTranslation('subscription');
  const [isHovered, setIsHovered] = useState(false);

  // Validation
  if (price < 0 || listingsLimit < 0 || promoCoupons < 0) {
    console.error('Invalid pricing data for plan:', planKey);
    return null;
  }

  const handleClick = () => {
    if (isDisabled) return;
    onUpgradeClick(planKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
      e.preventDefault();
      handleClick();
    }
  };

  const getCardStyle = () => {
    if (isEnterprise) {
      return 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700';
    }
    if (isHighlighted) {
      return 'bg-gradient-to-br from-emerald-50 via-white to-cyan-50 border-2 border-emerald-400';
    }
    return 'bg-white border border-gray-200';
  };

  const getMetricColor = () => {
    return isEnterprise ? 'text-amber-400' : 'text-primary';
  };

  const getMetricBgColor = () => {
    if (isEnterprise) return 'bg-slate-700/30 border-amber-500/30';
    if (isHighlighted) return 'bg-primary/10 border-primary/30';
    return 'bg-gray-50 border-gray-200';
  };

  const getButtonStyle = () => {
    if (isDisabled) {
      return 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none';
    }
    if (isEnterprise) {
      return 'text-slate-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-lg hover:shadow-xl';
    }
    if (isHighlighted) {
      return 'text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg hover:shadow-xl';
    }
    return 'text-gray-700 bg-white border-2 border-gray-300 hover:border-primary hover:text-primary hover:shadow-lg';
  };

  return (
    <div
      className={`rounded-3xl flex flex-col h-full overflow-hidden shadow-lg transition-all duration-300 ${
        isHovered && !isDisabled ? 'shadow-2xl -translate-y-1' : 'shadow-lg'
      } ${getCardStyle()} relative`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-20">
          <span
            className={`inline-flex items-center gap-1.5 text-white text-xs font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-full whitespace-nowrap shadow-lg ${
              isEnterprise
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : 'bg-gradient-to-r from-red-500 to-rose-600'
            }`}
          >
            {badge}
          </span>
        </div>
      )}

      {/* Header - Pricing Section */}
      <div className={`p-4 sm:p-6 text-white ${isEnterprise ? 'bg-slate-900/50' : ''}`}>
        <h4 className="font-bold text-xl sm:text-2xl">{planName}</h4>
        {description && (
          <p className={`text-xs sm:text-sm mt-2 ${isEnterprise ? 'text-gray-400' : 'text-white/80'}`}>
            {description}
          </p>
        )}

        {/* Price Display */}
        <div className="flex items-baseline gap-2 mt-4">
          {originalPrice !== undefined && originalPrice > price && (
            <span className="text-xs sm:text-sm line-through text-white/60">
              €{originalPrice.toFixed(2)}
            </span>
          )}
          <span className="text-4xl sm:text-5xl font-extrabold">€{price.toFixed(2)}</span>
          <span className="text-base sm:text-lg text-white/80">/{period === 'month' ? t('billing.month', 'month') : t('billing.year', 'year')}</span>
        </div>

        {savings && (
          <p className="text-xs mt-3 bg-white/20 px-3 py-1 rounded-full inline-block">
            {savings}
          </p>
        )}
      </div>

      {/* Key Metrics Section */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-lg p-3 sm:p-4 text-center border ${getMetricBgColor()}`}>
            <p className={`text-xl sm:text-2xl font-bold ${getMetricColor()}`}>
              {listingsLimit}
            </p>
            <p className={`text-xs mt-1 ${isEnterprise ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('metrics.listings', 'Listings')}
            </p>
          </div>
          <div className={`rounded-lg p-3 sm:p-4 text-center border ${getMetricBgColor()}`}>
            <p className={`text-xl sm:text-2xl font-bold ${getMetricColor()}`}>
              {promoCoupons}
            </p>
            <p className={`text-xs mt-1 ${isEnterprise ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('metrics.promoCoupons', 'Promo Coupons')}
            </p>
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="px-4 sm:px-6 pb-4 flex-grow">
        <ul className="space-y-2">
          {features.slice(0, 5).map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <CheckCircleIcon className={`w-4 h-4 ${isEnterprise ? 'text-amber-400' : 'text-green-500'}`} />
              </div>
              <span className={`text-xs sm:text-sm ${isEnterprise ? 'text-gray-300' : 'text-gray-700'}`}>
                {feature}
              </span>
            </li>
          ))}
          {features.length > 5 && (
            <li className={`text-xs sm:text-sm italic ${isEnterprise ? 'text-gray-400' : 'text-gray-600'}`}>
              + {features.length - 5} {t('common.more', 'more')}
            </li>
          )}
        </ul>
      </div>

      {/* CTA Button */}
      <div className="px-4 sm:px-6 pb-4">
        <button
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          aria-label={`Upgrade to ${planName} plan`}
          aria-disabled={isDisabled}
          className={`w-full mt-4 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isDisabled
              ? 'focus:ring-gray-300'
              : isEnterprise
                ? 'focus:ring-amber-500'
                : isHighlighted
                  ? 'focus:ring-emerald-500'
                  : 'focus:ring-primary'
          } ${getButtonStyle()}`}
        >
          {isEnterprise ? t('buttons.startAgency', 'Start Your Agency') : t('buttons.upgradeNow', 'Upgrade Now')}
        </button>
      </div>
    </div>
  );
};

export default React.memo(UpgradePlanCard);
