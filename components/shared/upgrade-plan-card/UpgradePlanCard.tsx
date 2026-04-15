import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon } from '../../../constants';

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

  if (price < 0 || listingsLimit < 0 || promoCoupons < 0) {
    console.error('Invalid pricing data for plan:', planKey);
    return null;
  }

  const getCardStyle = () =>
    isEnterprise
      ? 'bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700'
      : isHighlighted
        ? 'bg-white border-2 border-emerald-400'
        : 'bg-white border border-gray-200';

  const getHeaderStyle = () =>
    isEnterprise
      ? 'bg-slate-900/80 text-white'
      : isHighlighted
        ? 'bg-emerald-50 text-slate-900'
        : 'bg-primary/5 text-slate-900';

  const getMetricColor = () =>
    isEnterprise ? 'text-amber-400' : isHighlighted ? 'text-emerald-600' : 'text-primary';

  const getButtonStyle = () =>
    isDisabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
      : isEnterprise
        ? 'bg-amber-500 hover:bg-amber-600 text-slate-900'
        : isHighlighted
          ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
          : 'bg-primary hover:bg-primary-dark text-white';

  return (
    <div
      className={`rounded-2xl flex flex-col h-full overflow-hidden shadow-lg transition-all duration-300 ${
        isHovered && !isDisabled ? 'shadow-2xl -translate-y-0.5' : ''
      } ${getCardStyle()}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
          <span
            className={`text-white text-xs font-black px-3 py-1 rounded-full shadow-lg ${
              isEnterprise
                ? 'bg-amber-500'
                : isHighlighted
                  ? 'bg-emerald-500'
                  : 'bg-red-500'
            }`}
          >
            {badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className={`p-4 ${getHeaderStyle()}`}>
        <h4 className="font-bold text-base">{planName}</h4>
        {description && (
          <p className={`text-xs mt-0.5 opacity-75 ${
            isEnterprise ? 'text-gray-300' : 'text-slate-700'
          }`}>
            {description}
          </p>
        )}
        <div className="flex items-baseline gap-1 mt-2">
          {originalPrice && originalPrice > price && (
            <span className={`text-xs line-through opacity-50 ${
              isEnterprise ? 'text-white' : 'text-slate-600'
            }`}>
              €{originalPrice.toFixed(2)}
            </span>
          )}
          <span className={`text-3xl font-black ${
            isEnterprise ? 'text-white' : isHighlighted ? 'text-emerald-600' : 'text-primary'
          }`}>
            €{price.toFixed(2)}
          </span>
          <span className={`text-xs font-semibold ${
            isEnterprise ? 'text-gray-300' : 'text-slate-700'
          }`}>
            /{period === 'month' ? t('billing.month', 'month') : t('billing.year', 'year')}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4 py-3 grid grid-cols-2 gap-2">
        <div className={`rounded p-2 text-center border ${
          isEnterprise ? 'bg-slate-700/20 border-amber-500/30' : isHighlighted ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <p className={`text-lg font-black ${getMetricColor()}`}>{listingsLimit.toLocaleString()}</p>
          <p className="text-xs mt-0.5 text-gray-600">{t('metrics.listings', 'Listings')}</p>
        </div>
        <div className={`rounded p-2 text-center border ${
          isEnterprise ? 'bg-slate-700/20 border-amber-500/30' : isHighlighted ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <p className={`text-lg font-black ${getMetricColor()}`}>{promoCoupons}</p>
          <p className="text-xs mt-0.5 text-gray-600">{t('metrics.promoCoupons', 'Coupons')}</p>
        </div>
      </div>

      {/* Features */}
      <div className="px-4 pb-3 flex-grow">
        <ul className="space-y-1">
          {features.slice(0, 4).map((f, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <CheckCircleIcon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                isEnterprise ? 'text-amber-400' : isHighlighted ? 'text-emerald-500' : 'text-primary'
              }`} />
              <span className={`text-xs ${isEnterprise ? 'text-gray-200' : 'text-gray-700'}`}>{f}</span>
            </li>
          ))}
          {features.length > 4 && (
            <li className={`text-xs font-medium ${isEnterprise ? 'text-gray-400' : 'text-gray-600'}`}>
              +{features.length - 4} {t('common.more', 'more')}
            </li>
          )}
        </ul>
      </div>

      {/* Button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => !isDisabled && onUpgradeClick(planKey)}
          onKeyDown={(e) => {
            if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onUpgradeClick(planKey);
            }
          }}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonStyle()}`}
        >
          {isEnterprise ? t('buttons.startAgency', 'Start Agency') : t('buttons.upgradeNow', 'Upgrade')}
        </button>
      </div>
    </div>
  );
};

export default React.memo(UpgradePlanCard);
