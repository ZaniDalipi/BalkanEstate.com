import React from 'react';
import { StarIconSolid } from '@/constants';
import type { PromotionTier, PromotionDuration } from './usePromotionSelector';

// === Types ===

export interface TierInfo {
  name: string;
  description?: string;
  features?: (string | { name: string })[];
  highlight?: boolean;
}

export interface PromotionTierCardProps {
  tierId: PromotionTier;
  tier: TierInfo;
  isSelected: boolean;
  selectedDuration: PromotionDuration;
  price: number;
  onSelect: (tierId: PromotionTier) => void;
  variant?: 'default' | 'compact';
  /** Only used in compact variant for Current/Upgrade badges */
  currentTier?: PromotionTier;
}

// === Constants ===

const TIER_ORDER: PromotionTier[] = ['featured', 'highlight', 'premium'];

const tierStyles = {
  featured: {
    gradient: 'from-violet-50 to-purple-50',
    borderSelected: 'border-violet-500',
    borderDefault: 'border-violet-200',
    shadowSelected: 'shadow-[0_0_20px_rgba(124,58,237,0.3)]',
    iconBg: 'bg-gradient-to-br from-violet-400 to-purple-500',
    checkmark: 'text-violet-500',
    badge: 'bg-violet-500',
  },
  highlight: {
    gradient: 'from-sky-50 to-cyan-50',
    borderSelected: 'border-sky-500',
    borderDefault: 'border-sky-200',
    shadowSelected: 'shadow-[0_0_20px_rgba(14,165,233,0.3)]',
    iconBg: 'bg-gradient-to-br from-sky-400 to-cyan-500',
    checkmark: 'text-sky-500',
    badge: 'bg-sky-500',
  },
  premium: {
    gradient: 'from-amber-50 to-yellow-50',
    borderSelected: 'border-amber-500',
    borderDefault: 'border-amber-200',
    shadowSelected: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    checkmark: 'text-amber-500',
    badge: 'bg-gradient-to-r from-amber-500 to-yellow-500',
  },
};

// === Tier Icon Helper ===

const TierIcon: React.FC<{ tierId: PromotionTier; size: string }> = ({ tierId, size }) => {
  if (tierId === 'featured') {
    return <StarIconSolid className={`${size} text-white`} />;
  }
  if (tierId === 'highlight') {
    return (
      <svg className={`${size} text-white`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L9.5 9.5H2L8 14L5.5 22L12 17L18.5 22L16 14L22 9.5H14.5L12 2Z" />
      </svg>
    );
  }
  // premium
  return (
    <svg className={`${size} text-white`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" />
    </svg>
  );
};

// === Component ===

const PromotionTierCard: React.FC<PromotionTierCardProps> = ({
  tierId,
  tier,
  isSelected,
  selectedDuration,
  price,
  onSelect,
  variant = 'default',
  currentTier,
}) => {
  const style = tierStyles[tierId];
  const border = isSelected ? style.borderSelected : style.borderDefault;
  const shadow = isSelected ? style.shadowSelected : '';
  const isCompact = variant === 'compact';

  if (isCompact) {
    const isCurrent = currentTier === tierId;
    const isUpgrade = currentTier
      ? TIER_ORDER.indexOf(tierId) > TIER_ORDER.indexOf(currentTier)
      : true;

    return (
      <button
        onClick={() => onSelect(tierId)}
        className={`relative p-4 rounded-xl border-2 text-left transition-all duration-300 bg-gradient-to-br ${style.gradient} ${border} ${shadow} hover:scale-[1.02] ${isSelected ? 'scale-[1.02]' : ''}`}
      >
        {isCurrent && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            Current
          </div>
        )}
        {isUpgrade && !isCurrent && (
          <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${style.badge} text-white text-xs font-bold px-3 py-1 rounded-full`}>
            Upgrade
          </div>
        )}

        <div className="text-center pt-2">
          <div className={`inline-flex items-center justify-center w-12 h-12 ${style.iconBg} rounded-xl shadow-lg mb-2`}>
            <TierIcon tierId={tierId} size="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            {tier.name}
          </h3>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-xl font-bold text-gray-900">€{price}</span>
            <span className="text-xs text-gray-500">/{selectedDuration}d</span>
          </div>
        </div>

        {isSelected && (
          <div className="absolute top-3 right-3">
            <div className={`w-6 h-6 ${style.iconBg} rounded-full flex items-center justify-center shadow-md`}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </button>
    );
  }

  // Default variant - full card with description and features
  return (
    <button
      onClick={() => onSelect(tierId)}
      className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 bg-gradient-to-br ${style.gradient} ${border} ${shadow} hover:scale-[1.02] ${isSelected ? 'scale-[1.02]' : ''}`}
    >
      {tier.highlight && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${style.badge} text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg`}>
          Most Popular
        </div>
      )}

      <div className="text-center mb-4 pt-2">
        <div className={`inline-flex items-center justify-center w-14 h-14 ${style.iconBg} rounded-2xl shadow-lg mb-3`}>
          <TierIcon tierId={tierId} size="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          {tier.name}
        </h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold text-gray-900">€{price}</span>
          <span className="text-sm text-gray-500">/{selectedDuration} days</span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4 text-center min-h-[40px]">{tier.description}</p>

      <ul className="space-y-2">
        {tier.features?.slice(0, 5).map((feature, idx) => (
          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
            <span className={`${style.checkmark} font-bold mt-0.5`}>{'\u2713'}</span>
            <span>{typeof feature === 'string' ? feature : feature.name}</span>
          </li>
        ))}
      </ul>

      {isSelected && (
        <div className="absolute top-4 right-4">
          <div className={`w-7 h-7 ${style.iconBg} rounded-full flex items-center justify-center shadow-md`}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
};

export default React.memo(PromotionTierCard);
