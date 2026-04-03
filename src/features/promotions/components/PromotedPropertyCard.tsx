/**
 * Promoted Property Card Component
 * Displays a single promoted property with actions
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { formatPrice } from '@/utils/currency';
import { ClockIcon, BuildingOfficeIcon, MapPinIcon, ChartBarIcon, StarIconSolid, FireIcon } from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

// Tier configuration
export const TIER_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  premium: { color: 'text-amber-700', bg: 'bg-amber-100', label: 'Premium Premiere', icon: '👑' },
  highlight: { color: 'text-sky-700', bg: 'bg-sky-100', label: 'Highlight', icon: '✨' },
  featured: { color: 'text-violet-600', bg: 'bg-violet-50', label: 'Featured', icon: '⭐' },
  standard: { color: 'text-gray-700', bg: 'bg-gray-100', label: 'Standard', icon: '📋' },
};

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const calculateTimeRemaining = (endDate: number): TimeRemaining => {
  const total = endDate - Date.now();
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, total };
};

const CountdownTimer: React.FC<{ endDate: number }> = ({ endDate }) => {
  const { t } = useTranslation('seller');
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(calculateTimeRemaining(endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(endDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  if (timeRemaining.total <= 0) {
    return <span className="text-red-600 font-semibold">{t('promotionCard.expired', 'Expired')}</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {timeRemaining.days > 0 && (
        <div className="flex flex-col items-center bg-neutral-100 px-2 py-1 rounded">
          <span className="text-lg font-bold text-neutral-800">{timeRemaining.days}</span>
          <span className="text-[10px] text-neutral-500">{t('promotionCard.days', 'days')}</span>
        </div>
      )}
      <div className="flex flex-col items-center bg-neutral-100 px-2 py-1 rounded">
        <span className="text-lg font-bold text-neutral-800">{String(timeRemaining.hours).padStart(2, '0')}</span>
        <span className="text-[10px] text-neutral-500">{t('promotionCard.hrs', 'hrs')}</span>
      </div>
      <span className="text-neutral-400 font-bold">:</span>
      <div className="flex flex-col items-center bg-neutral-100 px-2 py-1 rounded">
        <span className="text-lg font-bold text-neutral-800">{String(timeRemaining.minutes).padStart(2, '0')}</span>
        <span className="text-[10px] text-neutral-500">{t('promotionCard.min', 'min')}</span>
      </div>
      <span className="text-neutral-400 font-bold">:</span>
      <div className="flex flex-col items-center bg-neutral-100 px-2 py-1 rounded">
        <span className="text-lg font-bold text-neutral-800">{String(timeRemaining.seconds).padStart(2, '0')}</span>
        <span className="text-[10px] text-neutral-500">{t('promotionCard.sec', 'sec')}</span>
      </div>
    </div>
  );
};

export interface PromotedPropertyCardProps {
  property: Property;
  promotion?: any;
  onViewProperty: (propertyId: string) => void;
  onExtend: (property: Property) => void;
  onAddUrgent: (promotionId: string) => void;
  onToggleAutoExtend: (promotionId: string, autoExtend: boolean) => void;
  onCompleteAutoExtend: (promotionId: string) => void;
  onViewHistory: (property: Property) => void;
  isAddingUrgent?: boolean;
}

const PromotedPropertyCard: React.FC<PromotedPropertyCardProps> = ({
  property,
  promotion,
  onViewProperty,
  onExtend,
  onAddUrgent,
  onToggleAutoExtend,
  onCompleteAutoExtend,
  onViewHistory,
  isAddingUrgent = false,
}) => {
  const { t } = useTranslation('seller');
  const tier = property.promotionTier || 'standard';
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.standard;
  const endDate = property.promotionEndDate || 0;
  const startDate = property.promotionStartDate || 0;

  const now = Date.now();
  const totalDuration = endDate - startDate;
  const elapsed = now - startDate;
  const progressPercent = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0;

  const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 3;
  const isExpired = endDate <= now || property.isPromoted === false;

  const borderClass = tier === 'premium'
    ? 'border-amber-400 shadow-[0_0_15px_rgba(255,184,0,0.25)]'
    : tier === 'highlight'
      ? 'border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.25)]'
      : tier === 'featured'
        ? 'border-violet-500 shadow-[0_0_12px_rgba(124,58,237,0.2)]'
        : 'border-gray-200';

  const progressBarClass = tier === 'premium'
    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
    : tier === 'highlight'
      ? 'bg-gradient-to-r from-sky-500 to-cyan-400'
      : tier === 'featured'
        ? 'bg-gradient-to-r from-violet-600 to-purple-500'
        : 'bg-gray-500';

  return (
    <div className={`bg-white rounded-xl border-2 ${borderClass} hover:shadow-lg transition-all duration-300 overflow-hidden`}>
      {/* Pending Auto-Extend Banner */}
      {promotion?.autoExtendStatus === 'pending' && promotion?.autoExtendCheckoutUrl && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <span className="text-sm font-semibold">{t('promotionCard.autoExtendReady', 'Auto-extend ready! Complete payment to extend.')}</span>
          </div>
          <button
            onClick={() => onCompleteAutoExtend(promotion._id)}
            className="bg-white text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors shadow-sm"
          >
            {t('promotionCard.completePayment', 'Complete Payment')}
          </button>
        </div>
      )}

      {/* Expiring Soon Banner */}
      {isExpiringSoon && !isExpired && promotion?.autoExtendStatus !== 'pending' && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="text-sm font-semibold">
              {daysRemaining === 1
                ? t('promotionCard.expiringIn_one', 'Expiring in {{count}} day!', { count: daysRemaining })
                : t('promotionCard.expiringIn_other', 'Expiring in {{count}} days!', { count: daysRemaining })}
            </span>
          </div>
          <button
            onClick={() => onExtend(property)}
            className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full transition-colors"
          >
            {t('promotionCard.extendNow', 'Extend Now')}
          </button>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${tierConfig.bg} ${tierConfig.color} text-sm font-semibold`}>
            <StarIconSolid className="w-3.5 h-3.5" />
            <span>{tierConfig.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {property.hasUrgentBadge ? (
              <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                <FireIcon className="w-3 h-3" /> {t('promotionCard.urgentBadge', 'Urgent')}
              </span>
            ) : !isExpired && promotion?._id && (
              <button
                onClick={() => onAddUrgent(promotion._id)}
                disabled={isAddingUrgent}
                className={`bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full hover:from-red-100 hover:to-orange-100 transition-colors flex items-center gap-1 ${isAddingUrgent ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isAddingUrgent ? (
                  <>
                    <span className="animate-spin w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full inline-block" /> {t('promotionCard.processing', 'Processing...')}
                  </>
                ) : (
                  <><FireIcon className="w-3 h-3" /> {t('promotionCard.addUrgent', '+Urgent €0.99')}</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Property Info */}
        <div className="flex gap-4">
          <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
            {property.imageUrl ? (
              <img src={optimizeCloudinaryUrl(property.imageUrl, { width: 192, quality: 'auto', crop: 'fill' })} alt={property.title || 'Property'} className="w-full h-full object-cover" loading="lazy" decoding="async" width={96} height={96} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BuildingOfficeIcon className="w-10 h-10 text-neutral-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-neutral-800 truncate mb-1">{property.title || 'Untitled Property'}</h4>
            <div className="flex items-center gap-1 text-sm text-neutral-500 mb-2">
              <MapPinIcon className="w-3.5 h-3.5" />
              <span className="truncate">{property.city}, {property.country}</span>
            </div>
            <div className="text-lg font-bold text-primary">
              {property.isNegotiable ? (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-sm font-semibold px-2 py-1 rounded-full border border-amber-200">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {t('property:byNegotiation', 'By Negotiation')}
                </span>
              ) : formatPrice(property.price, property.country)}
            </div>
          </div>
        </div>

        {/* Time Remaining */}
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <ClockIcon className="w-4 h-4" />
              <span>{t('promotionCard.timeRemaining', 'Time Remaining')}</span>
            </div>
            <CountdownTimer endDate={endDate} />
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${progressBarClass}`} style={{ width: `${100 - progressPercent}%` }} />
          </div>
          <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>{t('promotionCard.started', 'Started:')} {new Date(startDate).toLocaleDateString()}</span>
            <span>{t('promotionCard.ends', 'Ends:')} {new Date(endDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Auto-Extend Toggle */}
        {promotion?._id && (
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <label className={`flex items-center justify-between ${isExpired ? 'opacity-50' : 'cursor-pointer'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-700">{t('promotionCard.autoExtend', 'Auto-Extend')}</span>
                <span className="text-xs text-neutral-400">{t('promotionCard.renewAutomatically', '(renew automatically)')}</span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={promotion?.autoExtend || false}
                  onChange={(e) => !isExpired && onToggleAutoExtend(promotion._id, e.target.checked)}
                  disabled={isExpired}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 ${isExpired ? 'bg-neutral-100 cursor-not-allowed' : 'bg-neutral-200'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50`} />
              </div>
            </label>
            {isExpired && (
              <p className="text-xs text-neutral-400 mt-1">{t('promotionCard.enableAutoExtend', 'Extend your promotion to enable auto-extend')}</p>
            )}
            {!isExpired && promotion?.autoExtend && (
              <p className="text-xs text-green-600 mt-1">{t('promotionCard.autoRenewMessage', 'Your promotion will automatically renew when it expires')}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onViewProperty(property.id)}
            className="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            {t('promotionCard.viewListing', 'View Listing')}
          </button>
          <button
            onClick={() => onViewHistory(property)}
            className="px-3 py-2 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5"
            title="View Promotion History"
          >
            <ChartBarIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExtend(property)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg transition-all text-sm font-bold flex items-center gap-1.5"
          >
            <ClockIcon className="w-4 h-4" />
            {t('promotionCard.extend', 'Extend')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PromotedPropertyCard);
