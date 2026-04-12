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
      return 'bg-white border-2 border-emerald-400';
    }
    return 'bg-white border border-gray-200';
  };

  const getHeaderStyle = () => {
    if (isEnterprise) {
      return 'bg-gradient-to-br from-slate-900 to-slate-800 text-white';
    }
    if (isHighlighted) {
      return 'bg-gradient-to-br from-emerald-50 to-cyan-50 text-slate-900';
    }
    return 'bg-gradient-to-br from-primary/10 to-primary/5 text-slate-900';
  };

  const getPriceColor = () => {
    if (isEnterprise) {
      return 'text-white';
    }
    if (isHighlighted) {
      return 'text-emerald-600';
    }
    return 'text-primary';
  };

  const getMetricColor = () => {
    if (isEnterprise) {
      return 'text-amber-400';
    }
    if (isHighlighted) {
      return 'text-emerald-600';
    }
    return 'text-primary';
  };


  const getButtonStyle = () => {
    if (isDisabled) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200';
    }
    if (isEnterprise) {
      return 'text-slate-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:from-amber-600 active:to-amber-700 shadow-lg hover:shadow-xl font-semibold';
    }
    if (isHighlighted) {
      return 'text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 active:from-emerald-700 active:to-cyan-700 shadow-lg hover:shadow-xl font-semibold';
    }
    return 'text-white bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary-darker active:from-primary-darker active:to-primary-dark shadow-md hover:shadow-lg font-semibold border-0';
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
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <span
            className={`inline-flex items-center gap-1.5 text-white text-xs sm:text-sm font-black px-4 sm:px-5 py-2 sm:py-2.5 rounded-full whitespace-nowrap shadow-xl backdrop-blur-sm ${
              isEnterprise
                ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                : isHighlighted
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-600'
                  : 'bg-gradient-to-r from-red-500 to-rose-600'
            }`}
          >
            {badge}
          </span>
        </div>
      )}

      {/* Header - Pricing Section */}
      <div className={`p-5 sm:p-6 ${getHeaderStyle()}`}>
        <h4 className="font-bold text-lg sm:text-xl leading-tight">{planName}</h4>
        {description && (
          <p className={`text-xs sm:text-sm mt-2 opacity-75 leading-relaxed ${
            isEnterprise ? 'text-gray-300' : 'text-slate-700'
          }`}>
            {description}
          </p>
        )}

        {/* Price Display */}
        <div className="flex items-baseline gap-2 mt-4">
          {originalPrice !== undefined && originalPrice > price && (
            <span className={`text-xs sm:text-sm line-through opacity-60 ${
              isEnterprise ? 'text-white' : 'text-slate-600'
            }`}>
              €{originalPrice.toFixed(2)}
            </span>
          )}
          <span className={`text-4xl sm:text-5xl font-black ${getPriceColor()}`}>
            €{price.toFixed(2)}
          </span>
          <div className="flex flex-col">
            <span className={`text-sm sm:text-base font-semibold ${
              isEnterprise ? 'text-gray-300' : 'text-slate-700'
            }`}>
              /{period === 'month' ? t('billing.month', 'month') : t('billing.year', 'year')}
            </span>
          </div>
        </div>

        {savings && (
          <div className={`text-xs sm:text-sm font-semibold mt-3 px-3 py-1.5 rounded-lg inline-block ${
            isEnterprise
              ? 'bg-amber-500/20 text-amber-100'
              : isHighlighted
                ? 'bg-emerald-500/20 text-emerald-700'
                : 'bg-primary/20 text-primary'
          }`}>
            💰 {savings}
          </div>
        )}
      </div>

      {/* Key Metrics Section */}
      <div className="px-5 sm:px-6 pt-4 pb-5">
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-lg p-3 sm:p-4 text-center border-2 transition-colors duration-300 ${
            isEnterprise
              ? 'bg-slate-700/20 border-amber-500/40 hover:border-amber-500/60'
              : isHighlighted
                ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
                : 'bg-gray-50 border-gray-200 hover:border-primary/30'
          }`}>
            <p className={`text-2xl sm:text-3xl font-black ${getMetricColor()}`}>
              {listingsLimit.toLocaleString()}
            </p>
            <p className={`text-xs mt-1 font-medium ${
              isEnterprise ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t('metrics.listings', 'Listings')}
            </p>
          </div>
          <div className={`rounded-lg p-3 sm:p-4 text-center border-2 transition-colors duration-300 ${
            isEnterprise
              ? 'bg-slate-700/20 border-amber-500/40 hover:border-amber-500/60'
              : isHighlighted
                ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
                : 'bg-gray-50 border-gray-200 hover:border-primary/30'
          }`}>
            <p className={`text-2xl sm:text-3xl font-black ${getMetricColor()}`}>
              {promoCoupons}
            </p>
            <p className={`text-xs sm:text-sm mt-2 font-medium ${
              isEnterprise ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t('metrics.promoCoupons', 'Coupons')}
            </p>
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="px-5 sm:px-6 pb-5 flex-grow">
        <ul className="space-y-2">
          {features.slice(0, 5).map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <CheckCircleIcon className={`w-4 h-4 ${
                  isEnterprise ? 'text-amber-400' : isHighlighted ? 'text-emerald-500' : 'text-primary'
                }`} />
              </div>
              <span className={`text-xs sm:text-sm leading-snug ${
                isEnterprise ? 'text-gray-200' : 'text-gray-700'
              }`}>
                {feature}
              </span>
            </li>
          ))}
          {features.length > 5 && (
            <li className={`text-xs font-medium flex items-start gap-2 ${
              isEnterprise ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <span className="text-primary font-bold">+</span>
              {features.length - 5} {t('common.more', 'more')}
            </li>
          )}
        </ul>
      </div>

      {/* CTA Button */}
      <div className="px-5 sm:px-6 pb-5">
        <button
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          aria-label={`${isEnterprise ? 'Start your agency' : 'Upgrade to ' + planName}`}
          aria-disabled={isDisabled}
          className={`w-full mt-auto py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isDisabled
              ? 'focus:ring-gray-300'
              : isEnterprise
                ? 'focus:ring-amber-400'
                : isHighlighted
                  ? 'focus:ring-emerald-500'
                  : 'focus:ring-primary/50'
          } ${getButtonStyle()}`}
        >
          {isEnterprise ? t('buttons.startAgency', 'Start Your Agency') : t('buttons.upgradeNow', 'Upgrade Now')}
        </button>
      </div>
    </div>
  );
};

export default React.memo(UpgradePlanCard);
