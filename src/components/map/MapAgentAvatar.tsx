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
    color: '#EC4899',
    gradient: 'from-pink-500 via-pink-400 to-rose-400',
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

  // Auto-show panel initially
  useEffect(() => {
    if (highlightedProperties.length > 0 && !showPanel) {
      const timer = setTimeout(() => setShowPanel(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [highlightedProperties.length]);

  // Fly to first property when panel opens
  useEffect(() => {
    if (showPanel && currentMapFeatured && !isAnimating) {
      flyToProperty(currentMapFeatured);
    }
  }, [showPanel]);

  if (highlightedProperties.length === 0) {
    return null;
  }

  const tierConfig = getTierConfig();

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-3">
      {/* Recommendation Panel */}
      {showPanel && currentMapFeatured && (
        <div
          className="animate-fade-in w-[320px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden"
          style={{
            border: `2px solid ${tierConfig.color}`,
            boxShadow: `0 8px 32px ${tierConfig.color}30, 0 4px 16px rgba(0,0,0,0.1)`,
          }}
        >
          {/* Header with gradient */}
          <div className={`bg-gradient-to-r ${tierConfig.gradient} px-4 py-3 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-lg">{tierConfig.icon}</span>
              </div>
              <div>
                <p className="text-white text-xs font-medium opacity-90">Agent Recommendation</p>
                <p className="text-white font-bold text-sm">{tierConfig.label} Listing</p>
              </div>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Property Card */}
          <div className="p-4">
            {/* Image */}
            <div className="relative rounded-xl overflow-hidden mb-3 group cursor-pointer" onClick={handleViewProperty}>
              <img
                src={currentMapFeatured.imageUrl}
                alt={currentMapFeatured.title || currentMapFeatured.address}
                className="w-full h-36 object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Price badge */}
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg">
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(currentMapFeatured.price, currentMapFeatured.country)}
                </span>
              </div>

              {/* Urgent badge */}
              {currentMapFeatured.hasUrgentBadge && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md animate-pulse flex items-center gap-1">
                  <span>🔥</span> URGENT
                </div>
              )}

              {/* View overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-semibold text-sm bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                  View Property
                </span>
              </div>
            </div>

            {/* Property Info */}
            <div className="mb-3">
              <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">
                {currentMapFeatured.title || currentMapFeatured.address}
              </h3>
              <p className="text-gray-500 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {currentMapFeatured.city}, {currentMapFeatured.country}
              </p>
            </div>

            {/* Property Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center bg-gray-50 rounded-lg py-2">
                <div className="font-bold text-gray-900">{currentMapFeatured.beds}</div>
                <div className="text-[10px] text-gray-500">Beds</div>
              </div>
              <div className="text-center bg-gray-50 rounded-lg py-2">
                <div className="font-bold text-gray-900">{currentMapFeatured.baths}</div>
                <div className="text-[10px] text-gray-500">Baths</div>
              </div>
              <div className="text-center bg-gray-50 rounded-lg py-2">
                <div className="font-bold text-gray-900">{currentMapFeatured.livingRooms}</div>
                <div className="text-[10px] text-gray-500">Living</div>
              </div>
              <div className="text-center bg-gray-50 rounded-lg py-2 border border-gray-200">
                <div className="font-bold text-gray-900">{currentMapFeatured.sqft}</div>
                <div className="text-[10px] text-gray-500">m²</div>
              </div>
            </div>

            {/* Recommendation Text */}
            {currentMapFeatured.agentRecommendation && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 border-l-4" style={{ borderColor: tierConfig.color }}>
                <p className="text-sm text-gray-700 italic">
                  "{currentMapFeatured.agentRecommendation}"
                </p>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={isAnimating}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Prev</span>
              </button>

              {/* Counter with dots */}
              <div className="flex items-center gap-1.5">
                {highlightedProperties.slice(0, 5).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentFeaturedIndex % 5
                        ? 'w-4'
                        : 'bg-gray-300'
                    }`}
                    style={{
                      backgroundColor: idx === currentFeaturedIndex % 5 ? tierConfig.color : undefined
                    }}
                  />
                ))}
                {highlightedProperties.length > 5 && (
                  <span className="text-xs text-gray-400 ml-1">
                    +{highlightedProperties.length - 5}
                  </span>
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={isAnimating}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <span className="text-sm font-medium">Next</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between"
          >
            <span className="text-xs text-gray-500">
              {currentFeaturedIndex + 1} of {highlightedProperties.length} promoted listings
            </span>
            <button
              onClick={handleViewProperty}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-gradient-to-r ${tierConfig.gradient} hover:opacity-90 transition-opacity`}
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Floating Agent Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`relative transition-all duration-300 ${isExpanded ? 'scale-110' : 'scale-100'}`}
      >
        {/* Pulsing ring */}
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ backgroundColor: tierConfig.color, animationDuration: '2s' }}
        />

        {/* Main button */}
        <div
          className="relative w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center overflow-hidden"
          style={{
            border: `3px solid ${tierConfig.color}`,
            boxShadow: `0 4px 20px ${tierConfig.color}40`,
          }}
        >
          {/* Agent icon */}
          <div className="text-3xl">🏠</div>

          {/* Tier badge */}
          <div
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-sm shadow-md"
            style={{ backgroundColor: tierConfig.color }}
          >
            {tierConfig.icon}
          </div>
        </div>

        {/* Count badge */}
        <div className="absolute -bottom-1 -left-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
          {highlightedProperties.length}
        </div>

        {/* Tooltip */}
        {isExpanded && !showPanel && (
          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap animate-fade-in">
            {highlightedProperties.length} Premium Listings
            <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
          </div>
        )}
      </button>
    </div>
  );
};

export const MapAgentAvatarInner = MapAgentAvatar;
export default MapAgentAvatar;
