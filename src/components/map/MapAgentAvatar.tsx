/**
 * MapAgentAvatar - Interactive Agent Assistant for Map Recommendations
 *
 * A polished, modern agent avatar that:
 * - Shows property recommendations with beautiful cards
 * - Navigates between featured properties with map fly-to
 * - Has smooth animations and tier-specific styling
 *
 * @module MapAgentAvatar
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMap } from 'react-leaflet';
import { useHighlightedProperties, PROMOTION_TIER_COLORS } from '../../context/HighlightedPropertiesContext';
import { formatPrice } from '../../../utils/currency';
import { optimizeImageUrl } from '../../../config/imageConfig';

interface MapAgentAvatarProps {
  onPropertySelect: (propertyId: string) => void;
}

// Tier configuration with colors and labels
const TIER_CONFIG: Record<string, { color: string; gradient: string; icon: string; label: string }> = {
  premium: {
    color: '#FFB800',
    gradient: 'from-amber-500 via-yellow-400 to-orange-400',
    icon: '👑',
    label: 'Premium'
  },
  highlight: {
    color: '#0EA5E9',
    gradient: 'from-sky-500 via-sky-400 to-cyan-400',
    icon: '💎',
    label: 'Highlight'
  },
  featured: {
    color: '#7C3AED',
    gradient: 'from-violet-600 via-purple-500 to-violet-400',
    icon: '⭐',
    label: 'Featured'
  },
};

const MapAgentAvatar: React.FC<MapAgentAvatarProps> = ({ onPropertySelect }) => {
  const { t } = useTranslation(['property']);
  const map = useMap();
  const {
    currentMapFeatured,
    highlightedProperties,
    navigateToNextFeatured,
    navigateToPrevFeatured,
    currentFeaturedIndex,
  } = useHighlightedProperties();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHint, setShowHint] = useState(true); // Show initial hint message

  // Get tier config for current property
  const getTierConfig = useCallback(() => {
    const tier = currentMapFeatured?.promotionTier || 'featured';
    return TIER_CONFIG[tier] || TIER_CONFIG.featured;
  }, [currentMapFeatured?.promotionTier]);

  // Fly map to property location
  const flyToProperty = useCallback((property: typeof currentMapFeatured) => {
    if (property && property.lat && property.lng) {
      setIsAnimating(true);
      map.flyTo([property.lat, property.lng], 15, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
      setTimeout(() => setIsAnimating(false), 1200);
    }
  }, [map]);

  // Navigate to next property and fly to it
  const handleNext = useCallback(() => {
    navigateToNextFeatured();
    // Get the next property (after state update)
    const nextIndex = (currentFeaturedIndex + 1) % highlightedProperties.length;
    const nextProperty = highlightedProperties[nextIndex];
    if (nextProperty) {
      flyToProperty(nextProperty);
    }
  }, [navigateToNextFeatured, currentFeaturedIndex, highlightedProperties, flyToProperty]);

  // Navigate to previous property and fly to it
  const handlePrev = useCallback(() => {
    navigateToPrevFeatured();
    // Get the previous property (after state update)
    const prevIndex = currentFeaturedIndex === 0 ? highlightedProperties.length - 1 : currentFeaturedIndex - 1;
    const prevProperty = highlightedProperties[prevIndex];
    if (prevProperty) {
      flyToProperty(prevProperty);
    }
  }, [navigateToPrevFeatured, currentFeaturedIndex, highlightedProperties, flyToProperty]);

  // View property details
  const handleViewProperty = useCallback(() => {
    if (currentMapFeatured) {
      flyToProperty(currentMapFeatured);
      onPropertySelect(currentMapFeatured.id);
    }
  }, [currentMapFeatured, flyToProperty, onPropertySelect]);

  // Toggle panel and fly to property only when user clicks the button
  const handleTogglePanel = useCallback(() => {
    const newShowPanel = !showPanel;
    setShowPanel(newShowPanel);
    setShowHint(false); // Hide hint when panel is interacted with

    // Only fly to property when opening the panel (user clicked)
    if (newShowPanel && currentMapFeatured) {
      flyToProperty(currentMapFeatured);
    }
  }, [showPanel, currentMapFeatured, flyToProperty]);

  // Auto-hide hint after 5 seconds
  useEffect(() => {
    if (showHint && highlightedProperties.length > 0) {
      const timer = setTimeout(() => setShowHint(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showHint, highlightedProperties.length]);

  if (highlightedProperties.length === 0) {
    return null;
  }

  const tierConfig = getTierConfig();

  return (
    <div className="absolute bottom-36 md:bottom-auto md:top-20 right-2 md:right-3 z-[999] flex flex-col items-end gap-2">
      {/* Recommendation Panel - Compact for mobile */}
      {showPanel && currentMapFeatured && (
        <div
          className="animate-fade-in w-[160px] xs:w-[180px] sm:w-[220px] md:w-[260px] max-w-[calc(100vw-24px)] bg-white/95 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden max-h-[40vh] xs:max-h-[45vh] sm:max-h-[50vh] md:max-h-[60vh] overflow-y-auto"
          style={{
            border: `2px solid ${tierConfig.color}`,
            boxShadow: `0 6px 24px ${tierConfig.color}25, 0 2px 8px rgba(0,0,0,0.1)`,
          }}
        >
          {/* Header with gradient - more compact on mobile */}
          <div className={`bg-gradient-to-r ${tierConfig.gradient} px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between`}>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xs sm:text-sm">{tierConfig.icon}</span>
              </div>
              <div>
                <p className="text-white text-[8px] sm:text-[10px] font-medium opacity-90">{t('property:map.popup.recommendation')}</p>
                <p className="text-white font-bold text-[10px] sm:text-xs">{tierConfig.label}</p>
              </div>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all active:scale-95 touch-manipulation bg-white/20 hover:bg-white/30"
              aria-label="Close panel"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Property Card - more compact on mobile */}
          <div className="p-2 sm:p-2.5">
            {/* Image - smaller on mobile */}
            <div className="relative rounded-lg overflow-hidden mb-1.5 sm:mb-2 group cursor-pointer" onClick={handleViewProperty}>
              <img
                src={optimizeImageUrl(currentMapFeatured.imageUrl, { width: 384, quality: 'auto', crop: 'fill' })}
                alt={currentMapFeatured.title || currentMapFeatured.address}
                loading="lazy"
                decoding="async"
                width={384}
                height={256}
                className="w-full h-16 sm:h-20 md:h-24 object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Price badge - smaller on mobile */}
              <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 bg-white/95 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md shadow-lg">
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  {formatPrice(currentMapFeatured.price, currentMapFeatured.country)}
                </span>
              </div>

              {/* Urgent badge */}
              {currentMapFeatured.hasUrgentBadge && (
                <div
                  className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-red-500 text-white text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded animate-pulse flex items-center gap-0.5"
                  style={{ boxShadow: '0 0 10px 2px rgba(239, 68, 68, 0.6), 0 0 16px 4px rgba(239, 68, 68, 0.3)' }}
                >
                  <span>🔥</span> <span className="hidden xs:inline">{t('property:status.urgent')}</span>
                </div>
              )}
            </div>

            {/* Property Info - more compact */}
            <div className="mb-1.5 sm:mb-2">
              <h3 className="font-bold text-gray-900 text-xs sm:text-sm mb-0.5 line-clamp-1">
                {currentMapFeatured.title || currentMapFeatured.address}
              </h3>
              <p className="text-gray-500 text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1 line-clamp-1">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span className="truncate">{currentMapFeatured.city}, {currentMapFeatured.country}</span>
              </p>
            </div>

            {/* Property Stats - more compact grid */}
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
              <div className="text-center bg-gray-50 rounded py-1 sm:py-1.5">
                <div className="font-bold text-gray-900 text-[10px] sm:text-xs">{currentMapFeatured.beds}</div>
                <div className="text-[7px] sm:text-[9px] text-gray-500">{t('property:map.beds')}</div>
              </div>
              <div className="text-center bg-gray-50 rounded py-1 sm:py-1.5">
                <div className="font-bold text-gray-900 text-[10px] sm:text-xs">{currentMapFeatured.baths}</div>
                <div className="text-[7px] sm:text-[9px] text-gray-500">{t('property:map.baths')}</div>
              </div>
              <div className="text-center bg-gray-50 rounded py-1 sm:py-1.5">
                <div className="font-bold text-gray-900 text-[10px] sm:text-xs">{currentMapFeatured.livingRooms || '-'}</div>
                <div className="text-[7px] sm:text-[9px] text-gray-500">{t('property:map.living')}</div>
              </div>
              <div className="text-center bg-gray-50 rounded py-1 sm:py-1.5 border border-gray-200">
                <div className="font-bold text-gray-900 text-[10px] sm:text-xs">{currentMapFeatured.sqft}</div>
                <div className="text-[7px] sm:text-[9px] text-gray-500">{t('property:map.area')}</div>
              </div>
            </div>

            {/* Navigation Controls - more compact */}
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={handlePrev}
                disabled={isAnimating}
                className="flex items-center gap-0.5 px-1.5 sm:px-2 py-1 sm:py-1.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors disabled:opacity-50 touch-manipulation min-h-[32px]"
              >
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-[10px] sm:text-xs font-medium">{t('property:map.popup.prev')}</span>
              </button>

              {/* Counter with dots */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {highlightedProperties.slice(0, 4).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-all ${
                      idx === currentFeaturedIndex % 4
                        ? 'w-2 sm:w-3'
                        : 'bg-gray-300'
                    }`}
                    style={{
                      backgroundColor: idx === currentFeaturedIndex % 4 ? tierConfig.color : undefined
                    }}
                  />
                ))}
                {highlightedProperties.length > 4 && (
                  <span className="text-[8px] sm:text-[10px] text-gray-400 ml-0.5">
                    +{highlightedProperties.length - 4}
                  </span>
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={isAnimating}
                className="flex items-center gap-0.5 px-1.5 sm:px-2 py-1 sm:py-1.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors disabled:opacity-50 touch-manipulation min-h-[32px]"
              >
                <span className="text-[10px] sm:text-xs font-medium">{t('property:map.popup.next')}</span>
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Footer - more compact */}
          <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[8px] sm:text-[10px] text-gray-500">
              {currentFeaturedIndex + 1}/{highlightedProperties.length}
            </span>
            <button
              onClick={handleViewProperty}
              className={`text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded text-white bg-gradient-to-r ${tierConfig.gradient} hover:opacity-90 active:scale-95 transition-all touch-manipulation min-h-[28px]`}
            >
              {t('property:map.popup.viewDetails')}
            </button>
          </div>
        </div>
      )}

      {/* Floating Agent Button - Modern Design */}
      <button
        onClick={handleTogglePanel}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`relative transition-all duration-300 ${isExpanded ? 'scale-110' : 'scale-100'}`}
      >
        {/* Outer glow ring */}
        <div
          className="absolute -inset-1 rounded-full opacity-30 blur-sm"
          style={{ backgroundColor: tierConfig.color }}
        />

        {/* Pulsing ring */}
        <div
          className="absolute -inset-0.5 rounded-full animate-pulse opacity-40"
          style={{
            background: `linear-gradient(135deg, ${tierConfig.color}, transparent)`,
          }}
        />

        {/* Main button container */}
        <div
          className="relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center overflow-visible"
          style={{
            background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
            boxShadow: `0 4px 15px rgba(0,0,0,0.15), 0 2px 6px ${tierConfig.color}40, inset 0 1px 0 rgba(255,255,255,0.8)`,
            border: `2.5px solid ${tierConfig.color}`,
          }}
        >
          {/* House icon */}
          <span className="text-xl md:text-2xl">🏠</span>
        </div>

        {/* Count badge - bottom right */}
        <div
          className="absolute -bottom-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            border: '2px solid white',
          }}
        >
          <span className="text-white text-[10px] font-bold">{highlightedProperties.length}</span>
        </div>

        {/* Sparkle/star indicator - top right */}
        <div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
          style={{
            background: `linear-gradient(135deg, ${tierConfig.color}, ${tierConfig.color}dd)`,
            border: '1.5px solid white',
          }}
        >
          <span className="text-[10px]">{tierConfig.icon}</span>
        </div>

        {/* Tooltip on hover - hidden on mobile */}
        {isExpanded && !showPanel && !showHint && (
          <div className="hidden lg:block absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap animate-fade-in shadow-xl">
            <span className="font-semibold">{highlightedProperties.length}</span> {t('property:map.promotedListings')}
            <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
          </div>
        )}
      </button>

      {/* Initial hint message - shows briefly then fades */}
      {showHint && !showPanel && (
        <div
          className="absolute right-14 md:right-16 top-1/2 -translate-y-1/2 animate-fade-in"
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
          <div
            className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border-l-4 whitespace-nowrap"
            style={{ borderLeftColor: tierConfig.color }}
          >
            <p className="text-[11px] font-semibold text-gray-800">
              {t('property:map.popup.promotedCount', { count: highlightedProperties.length })}
            </p>
            <p className="text-[9px] text-gray-500">{t('property:map.agentHint')}</p>
          </div>
          {/* Arrow pointing to button */}
          <div
            className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px]"
            style={{ borderLeftColor: 'white' }}
          />
        </div>
      )}
    </div>
  );
};

export const MapAgentAvatarInner = MapAgentAvatar;
export default React.memo(MapAgentAvatar);
