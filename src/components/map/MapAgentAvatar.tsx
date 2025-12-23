/**
 * MapAgentAvatar - Interactive 3D Agent Avatar for Map Recommendations
 *
 * This component displays an animated agent avatar on the map that:
 * - Points to highlighted/promoted properties
 * - Shows recommendations with speech bubbles
 * - Navigates between featured properties
 * - Has 3D-like animated effects
 *
 * @module MapAgentAvatar
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMap } from 'react-leaflet';
import { useHighlightedProperties, PROMOTION_TIER_COLORS } from '../../context/HighlightedPropertiesContext';

interface MapAgentAvatarProps {
  onPropertySelect: (propertyId: string) => void;
}

/**
 * Create SVG for pointing arrow from agent to property
 */
const createPointingLine = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string
): string => {
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Create a curved path
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 - 20; // Curve upward

  return `
    <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 999;">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
        </linearGradient>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="${color}" />
        </marker>
      </defs>
      <path
        d="M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}"
        stroke="url(#lineGradient)"
        stroke-width="3"
        fill="none"
        stroke-dasharray="8,4"
        marker-end="url(#arrowhead)"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="24"
          to="0"
          dur="1s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  `;
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
  const [isWaving, setIsWaving] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);

  // Auto-show speech bubble for new recommendations
  useEffect(() => {
    if (currentMapFeatured) {
      setShowSpeechBubble(true);
      const timer = setTimeout(() => setShowSpeechBubble(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [currentMapFeatured?.id]);

  // Wave animation trigger
  useEffect(() => {
    const interval = setInterval(() => {
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 1000);
    }, 10000); // Wave every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Navigate map to featured property
  const handleNavigateToProperty = useCallback(() => {
    if (currentMapFeatured && currentMapFeatured.lat && currentMapFeatured.lng) {
      map.flyTo([currentMapFeatured.lat, currentMapFeatured.lng], 15, {
        duration: 1.5,
      });
      onPropertySelect(currentMapFeatured.id);
    }
  }, [currentMapFeatured, map, onPropertySelect]);

  // Get tier color
  const getTierColor = () => {
    if (!currentMapFeatured?.promotionTier) return PROMOTION_TIER_COLORS.featured;
    return PROMOTION_TIER_COLORS[currentMapFeatured.promotionTier] || PROMOTION_TIER_COLORS.featured;
  };

  // Get tier badge
  const getTierBadge = () => {
    if (!currentMapFeatured?.promotionTier) return null;
    const badges: Record<string, string> = {
      premium: '👑',
      highlight: '💎',
      featured: '⭐',
    };
    return badges[currentMapFeatured.promotionTier];
  };

  if (highlightedProperties.length === 0) {
    return null; // Don't render if no highlighted properties
  }

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
      {/* Speech Bubble */}
      {showSpeechBubble && currentMapFeatured?.agentRecommendation && (
        <div
          className="animate-fade-in max-w-[280px] bg-white rounded-2xl shadow-xl p-4 relative"
          style={{
            borderLeft: `4px solid ${getTierColor()}`,
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setShowSpeechBubble(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Tier badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getTierBadge()}</span>
            <span
              className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: getTierColor() }}
            >
              {currentMapFeatured.promotionTier}
            </span>
          </div>

          {/* Recommendation text */}
          <p className="text-sm text-gray-700 mb-3">
            {currentMapFeatured.agentRecommendation}
          </p>

          {/* Property preview */}
          <div
            className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={handleNavigateToProperty}
          >
            <img
              src={currentMapFeatured.imageUrl}
              alt={currentMapFeatured.title || currentMapFeatured.address}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {currentMapFeatured.title || currentMapFeatured.address}
              </p>
              <p className="text-xs text-gray-500">{currentMapFeatured.city}</p>
            </div>
            <span className="text-primary font-bold">
              €{(currentMapFeatured.price / 1000).toFixed(0)}K
            </span>
          </div>

          {/* Navigation arrows */}
          {highlightedProperties.length > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={navigateToPrevFeatured}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xs text-gray-400">
                {currentFeaturedIndex + 1} / {highlightedProperties.length}
              </span>
              <button
                onClick={navigateToNextFeatured}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Speech bubble tail */}
          <div
            className="absolute -right-2 bottom-6 w-4 h-4 bg-white transform rotate-45"
            style={{ boxShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}
          />
        </div>
      )}

      {/* Agent Avatar */}
      <div
        className={`relative cursor-pointer transition-all duration-300 ${
          isExpanded ? 'scale-110' : 'scale-100'
        }`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        onClick={() => setShowSpeechBubble(!showSpeechBubble)}
      >
        {/* Glowing ring animation */}
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{
            backgroundColor: getTierColor(),
            animationDuration: '2s',
          }}
        />

        {/* 3D Agent Avatar Container */}
        <div
          className="relative w-16 h-16 rounded-full bg-gradient-to-br from-white to-gray-100 shadow-xl flex items-center justify-center overflow-hidden"
          style={{
            border: `3px solid ${getTierColor()}`,
            boxShadow: `0 4px 20px ${getTierColor()}40, 0 0 40px ${getTierColor()}20`,
          }}
        >
          {/* 3D Agent SVG */}
          <svg
            viewBox="0 0 100 100"
            className={`w-14 h-14 transition-transform duration-300 ${
              isWaving ? 'animate-bounce' : ''
            }`}
          >
            {/* Head */}
            <defs>
              <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#FFE0BD' }} />
                <stop offset="100%" style={{ stopColor: '#F5C9A8' }} />
              </linearGradient>
              <linearGradient id="hairGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#4A3C31' }} />
                <stop offset="100%" style={{ stopColor: '#2C2416' }} />
              </linearGradient>
              <linearGradient id="suitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#1E3A5F' }} />
                <stop offset="100%" style={{ stopColor: '#0F2942' }} />
              </linearGradient>
            </defs>

            {/* Body/Suit */}
            <ellipse cx="50" cy="95" rx="30" ry="20" fill="url(#suitGradient)" />

            {/* Tie */}
            <path d="M50 65 L53 75 L50 90 L47 75 Z" fill="#C41E3A" />

            {/* Collar */}
            <path d="M35 65 L50 60 L65 65 L60 70 L50 65 L40 70 Z" fill="white" />

            {/* Neck */}
            <rect x="45" y="55" width="10" height="12" fill="url(#skinGradient)" />

            {/* Face */}
            <ellipse cx="50" cy="40" rx="22" ry="25" fill="url(#skinGradient)" />

            {/* Hair */}
            <path
              d="M28 35 Q30 15 50 12 Q70 15 72 35 Q70 25 50 22 Q30 25 28 35"
              fill="url(#hairGradient)"
            />

            {/* Eyes */}
            <ellipse cx="42" cy="38" rx="4" ry="4" fill="white" />
            <ellipse cx="58" cy="38" rx="4" ry="4" fill="white" />
            <circle cx="43" cy="38" r="2" fill="#2C3E50" />
            <circle cx="59" cy="38" r="2" fill="#2C3E50" />
            <circle cx="43.5" cy="37.5" r="0.8" fill="white" />
            <circle cx="59.5" cy="37.5" r="0.8" fill="white" />

            {/* Eyebrows */}
            <path d="M36 32 Q42 30 48 32" stroke="#4A3C31" strokeWidth="1.5" fill="none" />
            <path d="M52 32 Q58 30 64 32" stroke="#4A3C31" strokeWidth="1.5" fill="none" />

            {/* Nose */}
            <path d="M50 42 L52 48 L48 48" fill="none" stroke="#D4A574" strokeWidth="1" />

            {/* Smile */}
            <path
              d="M42 52 Q50 58 58 52"
              fill="none"
              stroke="#C41E3A"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Waving hand (when waving) */}
            {isWaving && (
              <g className="animate-wave">
                <ellipse cx="78" cy="45" rx="6" ry="8" fill="url(#skinGradient)" />
                <line x1="65" y1="60" x2="78" y2="45" stroke="url(#skinGradient)" strokeWidth="6" />
              </g>
            )}

            {/* Badge on suit */}
            <circle cx="40" cy="75" r="4" fill="#FFD700" />
            <text x="40" y="77" fontSize="5" textAnchor="middle" fill="#8B4513">★</text>
          </svg>

          {/* Tier indicator badge */}
          <div
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-sm shadow-lg"
            style={{ backgroundColor: getTierColor() }}
          >
            {getTierBadge()}
          </div>
        </div>

        {/* "Click me" hint on hover */}
        {isExpanded && !showSpeechBubble && (
          <div className="absolute -left-24 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap animate-fade-in">
            {t('property:map.agentHint', 'Click for recommendations!')}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-gray-800 transform rotate-45" />
          </div>
        )}

        {/* Highlight count badge */}
        {highlightedProperties.length > 0 && (
          <div className="absolute -bottom-1 -left-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
            {highlightedProperties.length}
          </div>
        )}
      </div>
    </div>
  );
};

// Export inner version for use inside MapContainer
export const MapAgentAvatarInner = MapAgentAvatar;

export default MapAgentAvatar;
