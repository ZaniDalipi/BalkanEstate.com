/**
 * MapAgentAvatarMapbox - Interactive Agent Assistant for Map Recommendations
 *
 * Mapbox GL version of the agent avatar component.
 *
 * @module MapAgentAvatarMapbox
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMap } from 'react-map-gl/mapbox';
import { useHighlightedProperties, PROMOTION_TIER_COLORS } from '../../context/HighlightedPropertiesContext';
import { formatPrice } from '../../../utils/currency';

interface MapAgentAvatarMapboxProps {
  onPropertySelect: (propertyId: string) => void;
}

// Tier configuration
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

/**
 * Inner component that needs access to the Mapbox map
 */
export const MapAgentAvatarInnerMapbox: React.FC<MapAgentAvatarMapboxProps> = ({ onPropertySelect }) => {
  const { t } = useTranslation(['property']);
  const { current: mapRef } = useMap();
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
  const [showHint, setShowHint] = useState(true);

  const getTierConfig = useCallback(() => {
    const tier = currentMapFeatured?.promotionTier || 'featured';
    return TIER_CONFIG[tier] || TIER_CONFIG.featured;
  }, [currentMapFeatured?.promotionTier]);

  // Fly map to property location
  const flyToProperty = useCallback((property: typeof currentMapFeatured) => {
    if (property && property.lat && property.lng && mapRef) {
      setIsAnimating(true);
      mapRef.flyTo({
        center: [property.lng, property.lat],
        zoom: 15,
        duration: 1200,
      });
      setTimeout(() => setIsAnimating(false), 1200);
    }
  }, [mapRef]);

  const handleNext = useCallback(() => {
    navigateToNextFeatured();
    const nextIndex = (currentFeaturedIndex + 1) % highlightedProperties.length;
    const nextProperty = highlightedProperties[nextIndex];
    if (nextProperty) {
      flyToProperty(nextProperty);
    }
  }, [navigateToNextFeatured, currentFeaturedIndex, highlightedProperties, flyToProperty]);

  const handlePrev = useCallback(() => {
    navigateToPrevFeatured();
    const prevIndex = currentFeaturedIndex === 0 ? highlightedProperties.length - 1 : currentFeaturedIndex - 1;
    const prevProperty = highlightedProperties[prevIndex];
    if (prevProperty) {
      flyToProperty(prevProperty);
    }
  }, [navigateToPrevFeatured, currentFeaturedIndex, highlightedProperties, flyToProperty]);

  const handleViewProperty = useCallback(() => {
    if (currentMapFeatured) {
      flyToProperty(currentMapFeatured);
      onPropertySelect(currentMapFeatured.id);
    }
  }, [currentMapFeatured, flyToProperty, onPropertySelect]);

  const handleTogglePanel = useCallback(() => {
    const newShowPanel = !showPanel;
    setShowPanel(newShowPanel);
    setShowHint(false);

    if (newShowPanel && currentMapFeatured) {
      flyToProperty(currentMapFeatured);
    }
  }, [showPanel, currentMapFeatured, flyToProperty]);

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
    <div className="absolute bottom-24 md:bottom-auto md:top-20 right-2 md:right-3 z-[999] flex flex-col items-end gap-2">
      {/* Recommendation Panel */}
      {showPanel && currentMapFeatured && (
        <div
          className="animate-fade-in w-[240px] md:w-[260px] bg-white/95 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden max-h-[50vh] md:max-h-[60vh] overflow-y-auto"
          style={{
            border: `2px solid ${tierConfig.color}`,
            boxShadow: `0 6px 24px ${tierConfig.color}25, 0 2px 8px rgba(0,0,0,0.1)`,
          }}
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${tierConfig.gradient} px-3 py-2 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm">{tierConfig.icon}</span>
              </div>
              <div>
                <p className="text-white text-[10px] font-medium opacity-90">Recommendation</p>
                <p className="text-white font-bold text-xs">{tierConfig.label}</p>
              </div>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Property Card */}
          <div className="p-2.5">
            <div className="relative rounded-lg overflow-hidden mb-2 group cursor-pointer" onClick={handleViewProperty}>
              <img
                src={currentMapFeatured.imageUrl}
                alt={currentMapFeatured.title || currentMapFeatured.address}
                className="w-full h-24 object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md shadow-lg">
                <span className="text-sm font-bold text-gray-900">
                  {formatPrice(currentMapFeatured.price, currentMapFeatured.country)}
                </span>
              </div>
            </div>

            <div className="mb-2">
              <h3 className="font-bold text-gray-900 text-sm mb-0.5 line-clamp-1">
                {currentMapFeatured.title || currentMapFeatured.address}
              </h3>
              <p className="text-gray-500 text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {currentMapFeatured.city}, {currentMapFeatured.country}
              </p>
            </div>

            {/* Property Stats */}
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              <div className="text-center bg-gray-50 rounded py-1.5">
                <div className="font-bold text-gray-900 text-xs">{currentMapFeatured.beds}</div>
                <div className="text-[9px] text-gray-500">Beds</div>
              </div>
              <div className="text-center bg-gray-50 rounded py-1.5">
                <div className="font-bold text-gray-900 text-xs">{currentMapFeatured.baths}</div>
                <div className="text-[9px] text-gray-500">Baths</div>
              </div>
              <div className="text-center bg-gray-50 rounded py-1.5">
                <div className="font-bold text-gray-900 text-xs">{currentMapFeatured.livingRooms}</div>
                <div className="text-[9px] text-gray-500">Living</div>
              </div>
              <div className="text-center bg-gray-50 rounded py-1.5 border border-gray-200">
                <div className="font-bold text-gray-900 text-xs">{currentMapFeatured.sqft}</div>
                <div className="text-[9px] text-gray-500">m²</div>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={isAnimating}
                className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-xs font-medium">Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {highlightedProperties.slice(0, 5).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx === currentFeaturedIndex % 5 ? 'w-3' : 'bg-gray-300'
                    }`}
                    style={{
                      backgroundColor: idx === currentFeaturedIndex % 5 ? tierConfig.color : undefined
                    }}
                  />
                ))}
                {highlightedProperties.length > 5 && (
                  <span className="text-[10px] text-gray-400 ml-0.5">
                    +{highlightedProperties.length - 5}
                  </span>
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={isAnimating}
                className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                <span className="text-xs font-medium">Next</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] text-gray-500">
              {currentFeaturedIndex + 1}/{highlightedProperties.length} listings
            </span>
            <button
              onClick={handleViewProperty}
              className={`text-[10px] font-bold px-2 py-1 rounded text-white bg-gradient-to-r ${tierConfig.gradient} hover:opacity-90 transition-opacity`}
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Floating Agent Button */}
      <button
        onClick={handleTogglePanel}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`relative transition-all duration-300 ${isExpanded ? 'scale-105' : 'scale-100'}`}
      >
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ backgroundColor: tierConfig.color, animationDuration: '3s' }}
        />

        <div
          className="relative w-10 h-10 md:w-11 md:h-11 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden"
          style={{
            border: `2px solid ${tierConfig.color}`,
            boxShadow: `0 2px 10px ${tierConfig.color}30`,
          }}
        >
          <div className="text-lg md:text-xl">🏠</div>

          <div
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] shadow-sm"
            style={{ backgroundColor: tierConfig.color }}
          >
            {tierConfig.icon}
          </div>
        </div>

        <div className="absolute -bottom-0.5 -left-0.5 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center shadow">
          {highlightedProperties.length}
        </div>

        {isExpanded && !showPanel && !showHint && (
          <div className="hidden lg:block absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap animate-fade-in">
            {highlightedProperties.length} Promoted
            <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
          </div>
        )}
      </button>

      {/* Initial hint message */}
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
              {highlightedProperties.length} promoted {highlightedProperties.length === 1 ? 'listing' : 'listings'}
            </p>
            <p className="text-[9px] text-gray-500">Tap to explore</p>
          </div>
          <div
            className="absolute left-full top-1/2 -translate-y-1/2 border-[6px] border-transparent"
            style={{ borderLeftColor: 'white' }}
          />
        </div>
      )}
    </div>
  );
};

// Default export for standalone use
const MapAgentAvatarMapbox: React.FC<MapAgentAvatarMapboxProps> = (props) => {
  return <MapAgentAvatarInnerMapbox {...props} />;
};

export default MapAgentAvatarMapbox;
