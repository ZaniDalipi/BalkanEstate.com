import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClockIcon } from '@/constants';
import type { PromotionDuration, ExtensionTierStyle } from './usePromotionSelector';

// === Types ===

interface PricingEntry {
  tierId: string;
  duration: number;
  price: number;
}

export interface PromotionDurationPickerProps {
  selectedDuration: PromotionDuration;
  onDurationChange: (duration: PromotionDuration) => void;
  pricing: PricingEntry[];
  tierToUse: string | null | undefined;
  isExtension: boolean;
  extStyle: ExtensionTierStyle;
}

// === Constants ===

const DURATIONS: PromotionDuration[] = [7, 15, 30, 60, 90];

// === Component ===

const PromotionDurationPicker: React.FC<PromotionDurationPickerProps> = ({
  selectedDuration,
  onDurationChange,
  pricing,
  tierToUse,
  isExtension,
  extStyle,
}) => {
  const { t } = useTranslation(['common']);

  return (
    <div className={`bg-white rounded-xl border ${isExtension ? extStyle.border : 'border-gray-200'} p-5 mb-4 shadow-sm`}>
      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className={`w-8 h-8 ${isExtension ? extStyle.iconBg : 'bg-primary/10'} rounded-lg flex items-center justify-center`}>
          <ClockIcon className={`w-4 h-4 ${isExtension ? 'text-white' : 'text-primary'}`} />
        </span>
        {isExtension
          ? t('common:promotions.chooseExtensionDuration', 'Choose Extension Duration')
          : t('common:promotions.selectDuration', 'Select Duration')}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {DURATIONS.map((duration) => {
          const isSelected = selectedDuration === duration;
          const pricingEntry = pricing.find(
            (p) => p.tierId === tierToUse && p.duration === duration
          );

          // Dynamic border and background colors based on tier for extension mode
          const durationStyle = isExtension && isSelected
            ? `${extStyle.selectedBorder} bg-gradient-to-br ${extStyle.selectedBg} shadow-md`
            : isSelected
              ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50';

          return (
            <button
              key={duration}
              onClick={() => onDurationChange(duration)}
              className={`p-3 rounded-xl border-2 transition-all text-sm ${durationStyle} text-gray-900`}
            >
              <div className="font-bold">{duration} {t('common:promotions.days', 'days')}</div>
              <div className={`text-xs font-semibold mt-1 ${
                isSelected
                  ? isExtension ? extStyle.text : 'text-primary'
                  : 'text-gray-500'
              }`}>
                €{pricingEntry?.price || 0}
              </div>
              {isExtension && isSelected && (
                <div className="text-[10px] text-gray-400 mt-1">
                  +{duration} {t('common:promotions.days', 'days')}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PromotionDurationPicker;
