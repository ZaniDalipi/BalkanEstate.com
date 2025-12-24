import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../types';
import { useAppContext } from '../../context/AppContext';
import * as api from '../../services/apiService';
import { formatPrice } from '../../utils/currency';
import { SparklesIcon, ClockIcon, BuildingOfficeIcon, MapPinIcon } from '../../constants';

// Tier configuration - Premium = Gold, Highlight = Baby Blue, Featured = Light Blue
const TIER_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  premium: { color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '👑', label: 'Premium Premiere' },
  highlight: { color: 'text-sky-700', bg: 'bg-sky-100', icon: '💎', label: 'Highlight' },
  featured: { color: 'text-blue-600', bg: 'bg-blue-50', icon: '⭐', label: 'Featured' },
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
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(calculateTimeRemaining(endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(endDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  if (timeRemaining.total <= 0) {
    return <span className="text-red-600 font-semibold">Expired</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {timeRemaining.days > 0 && (
        <div className="flex flex-col items-center bg-neutral-100 px-2 py-1 rounded">
          <span className="text-lg font-bold text-neutral-800">{timeRemaining.days}</span>
          <span className="text-[10px] text-neutral-500">days</span>
        </div>
      )}
      <div className="flex flex-col items-center bg-neutral-100 px-2 py-1 rounded">
        <span className="text-lg font-bold text-neutral-800">{String(timeRemaining.hours).padStart(2, '0')}</span>
        <span className="text-[10px] text-neutral-500">hrs</span>
      </div>
      <span className="text-neutral-400 font-bold">:</span>
      <div className="flex flex-col items-center bg-neutral-100 px-2 py-1 rounded">
        <span className="text-lg font-bold text-neutral-800">{String(timeRemaining.minutes).padStart(2, '0')}</span>
        <span className="text-[10px] text-neutral-500">min</span>
      </div>
      <span className="text-neutral-400 font-bold">:</span>
      <div className="flex flex-col items-center bg-neutral-100 px-2 py-1 rounded">
        <span className="text-lg font-bold text-neutral-800">{String(timeRemaining.seconds).padStart(2, '0')}</span>
        <span className="text-[10px] text-neutral-500">sec</span>
      </div>
    </div>
  );
};

interface PromotedPropertyCardProps {
  property: Property;
  onViewProperty: (propertyId: string) => void;
}

const PromotedPropertyCard: React.FC<PromotedPropertyCardProps> = ({ property, onViewProperty }) => {
  const tier = property.promotionTier || 'standard';
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.standard;
  const endDate = property.promotionEndDate || 0;
  const startDate = property.promotionStartDate || 0;

  // Calculate progress percentage
  const now = Date.now();
  const totalDuration = endDate - startDate;
  const elapsed = now - startDate;
  const progressPercent = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0;

  return (
    <div className={`bg-white rounded-xl border-2 ${tier === 'premium' ? 'border-yellow-300' : tier === 'highlight' ? 'border-sky-300' : tier === 'featured' ? 'border-blue-200' : 'border-gray-200'} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="p-4">
        {/* Header with tier badge */}
        <div className="flex items-start justify-between mb-3">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${tierConfig.bg} ${tierConfig.color} text-sm font-semibold`}>
            <span>{tierConfig.icon}</span>
            <span>{tierConfig.label}</span>
          </div>
          {property.hasUrgentBadge && (
            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
              🔥 Urgent
            </span>
          )}
        </div>

        {/* Property Info */}
        <div className="flex gap-4">
          {/* Image */}
          <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
            {property.imageUrl ? (
              <img
                src={property.imageUrl}
                alt={property.title || 'Property'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BuildingOfficeIcon className="w-10 h-10 text-neutral-300" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-neutral-800 truncate mb-1">
              {property.title || 'Untitled Property'}
            </h4>
            <div className="flex items-center gap-1 text-sm text-neutral-500 mb-2">
              <MapPinIcon className="w-3.5 h-3.5" />
              <span className="truncate">{property.city}, {property.country}</span>
            </div>
            <div className="text-lg font-bold text-primary">
              {formatPrice(property.price, property.country)}
            </div>
          </div>
        </div>

        {/* Time Remaining Section */}
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <ClockIcon className="w-4 h-4" />
              <span>Time Remaining</span>
            </div>
            <CountdownTimer endDate={endDate} />
          </div>

          {/* Progress bar */}
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                tier === 'premium' ? 'bg-yellow-500' :
                tier === 'highlight' ? 'bg-sky-500' :
                tier === 'featured' ? 'bg-blue-400' :
                'bg-gray-500'
              }`}
              style={{ width: `${100 - progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>Started: {new Date(startDate).toLocaleDateString()}</span>
            <span>Ends: {new Date(endDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onViewProperty(property.id)}
            className="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            View Listing
          </button>
          <button
            className="px-4 py-2 border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors text-sm font-medium"
          >
            Extend
          </button>
        </div>
      </div>
    </div>
  );
};

const MyPromotions: React.FC = () => {
  const { t } = useTranslation(['account', 'property']);
  const { dispatch } = useAppContext();
  const [promotedProperties, setPromotedProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active');

  useEffect(() => {
    const fetchPromotedProperties = async () => {
      setIsLoading(true);
      try {
        const listings = await api.getMyListings();
        // Filter only promoted properties
        const promoted = listings.filter(p => p.isPromoted);
        setPromotedProperties(promoted);
      } catch (error) {
        console.error('Failed to fetch promoted properties:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromotedProperties();
  }, []);

  const filteredProperties = useMemo(() => {
    const now = Date.now();
    return promotedProperties.filter(p => {
      if (filter === 'active') {
        return p.promotionEndDate && p.promotionEndDate > now;
      }
      if (filter === 'expired') {
        return !p.promotionEndDate || p.promotionEndDate <= now;
      }
      return true;
    });
  }, [promotedProperties, filter]);

  // Statistics
  const stats = useMemo(() => {
    const now = Date.now();
    const active = promotedProperties.filter(p => p.promotionEndDate && p.promotionEndDate > now);
    const expired = promotedProperties.filter(p => !p.promotionEndDate || p.promotionEndDate <= now);

    const tierCounts: Record<string, number> = {};
    active.forEach(p => {
      const tier = p.promotionTier || 'standard';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    return { active: active.length, expired: expired.length, total: promotedProperties.length, tierCounts };
  }, [promotedProperties]);

  const handleViewProperty = (propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
    window.history.pushState({ propertyId }, '', `/property/${propertyId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-neutral-200 rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-neutral-200 rounded w-3/4" />
                <div className="h-3 bg-neutral-200 rounded w-1/2" />
                <div className="h-5 bg-neutral-200 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-full">
            <SparklesIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-800">
              {t('account:promotions.title', 'My Promotions')}
            </h2>
            <p className="text-sm text-neutral-500">
              {t('account:promotions.subtitle', 'Manage your promoted listings')}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
          <div className="text-2xl font-bold text-green-700">{stats.active}</div>
          <div className="text-sm text-green-600">Active Promotions</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-700">{stats.tierCounts.premium || 0}</div>
          <div className="text-sm text-yellow-600">👑 Premium Premiere</div>
        </div>
        <div className="bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl p-4 border border-sky-200">
          <div className="text-2xl font-bold text-sky-700">{stats.tierCounts.highlight || 0}</div>
          <div className="text-sm text-sky-600">💎 Highlight</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-100">
          <div className="text-2xl font-bold text-blue-600">{stats.tierCounts.featured || 0}</div>
          <div className="text-sm text-blue-500">⭐ Featured</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-neutral-100 p-1 rounded-lg w-fit">
        {(['active', 'expired', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-white text-primary shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            {f === 'active' ? `Active (${stats.active})` :
             f === 'expired' ? `Expired (${stats.expired})` :
             `All (${stats.total})`}
          </button>
        ))}
      </div>

      {/* Properties List */}
      {filteredProperties.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
          <SparklesIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-600 mb-2">
            {filter === 'active' ? 'No Active Promotions' :
             filter === 'expired' ? 'No Expired Promotions' :
             'No Promotions Yet'}
          </h3>
          <p className="text-neutral-500 mb-4">
            {filter === 'active'
              ? 'Promote your listings to get more visibility!'
              : 'Your promotion history will appear here.'}
          </p>
          {filter === 'active' && (
            <button
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'my-listings' });
              }}
              className="bg-primary text-white font-semibold px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
            >
              Promote a Listing
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredProperties.map(property => (
            <PromotedPropertyCard
              key={property.id}
              property={property}
              onViewProperty={handleViewProperty}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPromotions;
