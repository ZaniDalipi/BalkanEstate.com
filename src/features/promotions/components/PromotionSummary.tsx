import React from 'react';
import { FireIcon, StarIconSolid } from '@/constants';
import type { PromotionDuration, ExtensionTierStyle } from './usePromotionSelector';

// === Types ===

export interface PromotionSummaryProps {
  priceInfo: { original: number; final: number; savings: number };
  selectedDuration: PromotionDuration;
  isExtension: boolean;
  focusUrgent: boolean;
  extStyle: ExtensionTierStyle;
  wantsTierUpgrade: boolean;
  useAgencyAllocation: boolean;
  couponValidation: { isValid: boolean } | null;
  isProcessing: boolean;
  successMessage: string | null;
  hasPendingProperty: boolean;
  onBack?: () => void;
  onSkip: () => void;
  onPurchase: () => void;
}

// === Component ===

const PromotionSummary: React.FC<PromotionSummaryProps> = ({
  priceInfo,
  selectedDuration,
  isExtension,
  focusUrgent,
  extStyle,
  wantsTierUpgrade,
  useAgencyAllocation,
  couponValidation,
  isProcessing,
  successMessage,
  hasPendingProperty,
  onBack,
  onSkip,
  onPurchase,
}) => {
  return (
    <>
      {/* Price Summary - Enhanced for Extension and Urgent Mode */}
      <div className={`rounded-xl border p-5 mb-6 ${
        focusUrgent
          ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
          : isExtension
            ? `bg-gradient-to-br ${extStyle.lightBg} ${extStyle.border}`
            : 'bg-neutral-50 border-neutral-300'
      }`}>
        <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">
          {focusUrgent && <FireIcon className="w-4 h-4 text-red-500" />}
          {isExtension && <StarIconSolid className="w-4 h-4 text-current" />}
          {focusUrgent ? 'Urgent Badge Summary' : isExtension ? 'Extension Summary' : 'Summary'}
        </h3>
        <div className="space-y-2 text-sm">
          {isExtension && (
            <div className="flex justify-between text-gray-600">
              <span>Duration:</span>
              <span className="font-semibold">+{selectedDuration} days</span>
            </div>
          )}
          {priceInfo.original !== priceInfo.final && (
            <div className="flex justify-between text-neutral-600">
              <span>Original Price:</span>
              <span className="line-through">€{priceInfo.original.toFixed(2)}</span>
            </div>
          )}
          {priceInfo.savings > 0 && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>Savings:</span>
              <span>-€{priceInfo.savings.toFixed(2)}</span>
            </div>
          )}
          <div className={`flex justify-between text-lg font-bold text-neutral-900 pt-3 border-t ${
            isExtension ? extStyle.border : 'border-neutral-300'
          }`}>
            <span>Total:</span>
            <span className={isExtension ? extStyle.text : ''}>
              €{priceInfo.final.toFixed(2)}
              {useAgencyAllocation && priceInfo.final === 0 && (
                <span className="text-sm text-green-600 ml-2 font-normal">(Free)</span>
              )}
              {isExtension && priceInfo.final === 0 && !useAgencyAllocation && couponValidation?.isValid && (
                <span className="text-sm text-green-600 ml-2 font-normal">(Free with coupon)</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons - Enhanced for Extension */}
      <div className="flex gap-3">
        {onBack && (
          <button
            onClick={onBack}
            disabled={isProcessing}
            className="px-6 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 shadow-sm"
          >
            ← Back
          </button>
        )}
        <button
          onClick={onSkip}
          disabled={isProcessing}
          className={`px-6 py-3.5 bg-white border text-gray-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-sm ${
            isExtension || focusUrgent
              ? `${extStyle?.border || 'border-gray-200'} hover:bg-gray-50`
              : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          {isExtension || focusUrgent ? 'Cancel' : hasPendingProperty ? 'Post Without Promotion' : 'Skip for Now'}
        </button>
        <button
          onClick={onPurchase}
          disabled={isProcessing || successMessage !== null}
          className={`flex-1 px-6 py-3.5 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${
            focusUrgent
              ? 'bg-gradient-to-r from-red-500 to-orange-500'
              : isExtension
                ? `bg-gradient-to-r ${extStyle.headerGradient}`
                : 'bg-gradient-to-r from-primary to-primary-dark'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {focusUrgent ? 'Processing...' : isExtension ? 'Extending...' : hasPendingProperty ? 'Creating Listing...' : 'Processing...'}
            </span>
          ) : successMessage ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Success!
            </span>
          ) : focusUrgent ? (
            <span className="flex items-center justify-center gap-2">
              <FireIcon className="w-4 h-4" />
              {wantsTierUpgrade
                ? `Upgrade & Add Urgent - €${priceInfo.final.toFixed(2)}`
                : `Add Urgent Badge - €${priceInfo.final.toFixed(2)}`}
            </span>
          ) : isExtension ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
              </svg>
              Extend +{selectedDuration} days - €{priceInfo.final.toFixed(2)}
            </span>
          ) : (
            `Continue - €${priceInfo.final.toFixed(2)}`
          )}
        </button>
      </div>
    </>
  );
};

export default PromotionSummary;
