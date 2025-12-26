/**
 * Promoted Property Card Component
 * Displays a single promoted property with actions
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../types';
import { formatPrice } from '../../utils/currency';
import { ClockIcon, BuildingOfficeIcon, MapPinIcon, ChartBarIcon } from '../../constants';

// Tier configuration
export const TIER_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  premium: { color: 'text-amber-700', bg: 'bg-amber-100', icon: '👑', label: 'Premium Premiere' },
  highlight: { color: 'text-sky-700', bg: 'bg-sky-100', icon: '💎', label: 'Highlight' },
  featured: { color: 'text-violet-600', bg: 'bg-violet-50', icon: '⭐', label: 'Featured' },
  standard: { color: 'text-gray-700', bg: 'bg-gray-100', icon: '✨', label: 'Standard' },
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
  const { t } = useTranslation(['account']);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(calculateTimeRemaining(endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(endDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  if (timeRemaining.total <= 0) {
    return <span className="text-red-600 font-semibold">{t('account:promotions.expired')}</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {timeRemaining.days > 0 && (
        <div className="flex flex-col items-center bg-neutral-100 px-2 py-1 rounded">
          <span className="text-lg font-bold text-neutral-800">{timeRemaining.days}</span>
          <span className="text-[10px] text-neutral-500">{t('account:promotions.days')}</span>
        </div>
      )}
      <div className="flex flex-col items-center bg-neutral-100 px-2 py-1 rounded">
        <span className="text-lg font-bold text-neutral-800">{String(timeRemaining.hours).padStart(2, '0')}</span>
        <span className="text-[10px] text-neutral-500">{t('account:promotions.hrs')}</span>
      </div>
      <span className="text-neutral-400 font-bold">:</span>
      <div className="flex flex-col items-center bg-neutral-100 px-2 py-1 rounded">
        <span className="text-lg font-bold text-neutral-800">{String(timeRemaining.minutes).padStart(2, '0')}</span>
        <span className="text-[10px] text-neutral-500">{t('account:promotions.min')}</span>
      </div>
      <span className="text-neutral-400 font-bold">:</span>
      <div className="flex flex-col items-center bg-neutral-100 px-2 py-1 rounded">
        <span className="text-lg font-bold text-neutral-800">{String(timeRemaining.seconds).padStart(2, '0')}</span>
        <span className="text-[10px] text-neutral-500">{t('account:promotions.sec')}</span>
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
  const { t } = useTranslation(['account']);
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
  const isExpired = endDate <= now;

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
            <span className="text-sm font-semibold">Auto-extend ready! Complete payment to extend.</span>
          </div>
          <button
            onClick={() => onCompleteAutoExtend(promotion._id)}
            className="bg-white text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors shadow-sm"
          >
            Complete Payment
          </button>
        </div>
      )}

      {/* Expiring Soon Banner */}
      {isExpiringSoon && !isExpired && promotion?.autoExtendStatus !== 'pending' && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="text-sm font-semibold">Expiring in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}!</span>
          </div>
          <button
            onClick={() => onExtend(property)}
            className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full transition-colors"
          >
            Extend Now
          </button>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${tierConfig.bg} ${tierConfig.color} text-sm font-semibold`}>
            <span>{tierConfig.icon}</span>
            <span>{tierConfig.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {property.hasUrgentBadge ? (
              <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                🔥 Urgent
              </span>
            ) : !isExpired && promotion?._id && (
              <button
                onClick={() => onAddUrgent(promotion._id)}
                disabled={isAddingUrgent}
                className={`bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full hover:from-red-100 hover:to-orange-100 transition-colors flex items-center gap-1 ${isAddingUrgent ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isAddingUrgent ? (
                  <>
                    <span className="animate-spin">⏳</span> Processing...
                  </>
                ) : (
                  <>🔥 +Urgent €0.99</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Property Info */}
        <div className="flex gap-4">
          <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
            {property.imageUrl ? (
              <img src={property.imageUrl} alt={property.title || 'Property'} className="w-full h-full object-cover" />
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
            <div className="text-lg font-bold text-primary">{formatPrice(property.price, property.country)}</div>
          </div>
        </div>

        {/* Time Remaining */}
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <ClockIcon className="w-4 h-4" />
              <span>{t('account:promotions.timeRemaining')}</span>
            </div>
            <CountdownTimer endDate={endDate} />
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${progressBarClass}`} style={{ width: `${100 - progressPercent}%` }} />
          </div>
          <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>{t('account:promotions.started')}: {new Date(startDate).toLocaleDateString()}</span>
            <span>{t('account:promotions.ends')}: {new Date(endDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Auto-Extend Toggle */}
        {!isExpired && promotion?._id && (
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-700">{t('account:promotions.autoExtend')}</span>
                <span className="text-xs text-neutral-400">({t('account:promotions.renewAutomatically')})</span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={promotion?.autoExtend || false}
                  onChange={(e) => onToggleAutoExtend(promotion._id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </div>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onViewProperty(property.id)}
            className="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            {t('account:promotions.viewListing')}
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
            {t('account:promotions.extend')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromotedPropertyCard;
