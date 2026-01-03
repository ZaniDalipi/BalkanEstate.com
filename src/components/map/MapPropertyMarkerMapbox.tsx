// MapPropertyMarkerMapbox
// Property markers and popups for Mapbox GL display

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker, Popup } from 'react-map-gl';
import { Property } from '../../../types';
import { formatPrice } from '../../../utils/currency';
import { BuildingOfficeIcon } from '../../../constants';

const ZOOM_THRESHOLD = 12;

const PROPERTY_TYPE_COLORS: Record<
  NonNullable<Property['propertyType']> | 'other',
  string
> = {
  house: '#0252CD',
  apartment: '#28a745',
  villa: '#6f42c1',
  other: '#6c757d',
};

/**
 * Format price for marker display (short format)
 */
const formatMarkerPrice = (price: number): string => {
  if (price >= 1000000) {
    return `€${(price / 1000000).toFixed(1).replace('.0', '')}M`;
  }
  if (price >= 1000) {
    return `€${Math.round(price / 1000)}K`;
  }
  return `€${price}`;
};

/**
 * Get promotion tier animation class
 */
const getPromotedMarkerClass = (property: Property): string => {
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  if (!isActivelyPromoted) return '';

  switch (property.promotionTier) {
    case 'premium': return 'animate-bounce';
    case 'highlight': return 'animate-bounce';
    case 'featured': return 'animate-pulse';
    default: return 'animate-pulse';
  }
};

/**
 * Get ring color based on promotion tier
 */
const getRingColor = (property: Property): string | null => {
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  if (!isActivelyPromoted) return null;

  switch (property.promotionTier) {
    case 'premium': return '#FFB800';    // Gold
    case 'highlight': return '#0EA5E9';   // Light Blue
    case 'featured': return '#7C3AED';    // Purple
    default: return '#9ca3af';            // Gray
  }
};

// Tier badge configurations for popup
const POPUP_TIER_CONFIG: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  premium: { bg: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400', border: 'border-amber-400', icon: '👑', label: 'PREMIUM PREMIERE' },
  highlight: { bg: 'bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400', border: 'border-sky-400', icon: '💎', label: 'HIGHLIGHT' },
  featured: { bg: 'bg-gradient-to-r from-violet-600 via-purple-500 to-violet-400', border: 'border-violet-500', icon: '⭐', label: 'FEATURED' },
  standard: { bg: 'bg-gradient-to-r from-gray-500 to-gray-600', border: 'border-gray-300', icon: '✨', label: 'PROMOTED' },
};

/**
 * PropertyPopup Component
 */
const PropertyPopup: React.FC<{
  property: Property;
  onPopupClick: (id: string) => void;
}> = ({ property, onPopupClick }) => {
  const { t } = useTranslation(['property']);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  const promotionTier = property.promotionTier || 'standard';
  const tierConfig = POPUP_TIER_CONFIG[promotionTier] || POPUP_TIER_CONFIG.standard;

  const images =
    property.images && property.images.length > 0
      ? property.images.slice(0, isActivelyPromoted ? 3 : property.images.length).map((img) => typeof img === 'string' ? img : img.url)
      : [property.imageUrl];

  const nextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleImageError = useCallback((index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  }, []);

  useEffect(() => {
    if (!isActivelyPromoted || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isActivelyPromoted, images.length]);

  if (isActivelyPromoted) {
    return (
      <div
        className={`w-72 cursor-pointer rounded-lg overflow-hidden border-2 ${tierConfig.border}`}
        onClick={() => onPopupClick(property.id)}
      >
        <div className="relative">
          <div className="relative h-40 overflow-hidden">
            {images.map((imgUrl, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {imageErrors.has(index) ? (
                  <div className="w-full h-full bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 flex items-center justify-center">
                    <BuildingOfficeIcon className="w-12 h-12 text-neutral-400" />
                  </div>
                ) : (
                  <img
                    src={imgUrl}
                    alt={`${property.title || property.address} - ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(index)}
                  />
                )}
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          <div className={`absolute top-2 left-2 ${tierConfig.bg} text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1.5`}>
            <span>{tierConfig.icon}</span>
            {tierConfig.label}
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-neutral-700 rounded-full w-7 h-7 flex items-center justify-center transition-colors shadow-lg"
              >
                ‹
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-neutral-700 rounded-full w-7 h-7 flex items-center justify-center transition-colors shadow-lg"
              >
                ›
              </button>

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(index);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex
                        ? 'bg-white w-4'
                        : 'bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>

              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                {currentImageIndex + 1}/{images.length}
              </div>
            </>
          )}
        </div>

        <div className="p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="bg-gradient-to-r from-primary to-primary-dark text-white font-bold px-3 py-1 rounded-lg text-base shadow">
              {formatPrice(property.price, property.country)}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 capitalize">
              {property.propertyType}
            </span>
          </div>

          {property.title && (
            <p className="font-bold text-sm text-neutral-900 mb-1 line-clamp-1">
              {property.title}
            </p>
          )}

          <p className="text-xs text-neutral-500 mb-2 line-clamp-1">
            📍 {property.address}, {property.city}
          </p>

          <div className="grid grid-cols-4 gap-1.5 mb-2">
            <div className="bg-primary/5 rounded-lg py-1.5 px-1 text-center border border-primary/10">
              <div className="font-bold text-sm text-primary">{property.beds}</div>
              <div className="text-[9px] text-primary/70">{t('map.beds')}</div>
            </div>
            <div className="bg-primary/5 rounded-lg py-1.5 px-1 text-center border border-primary/10">
              <div className="font-bold text-sm text-primary">{property.baths}</div>
              <div className="text-[9px] text-primary/70">{t('map.baths')}</div>
            </div>
            <div className="bg-primary/5 rounded-lg py-1.5 px-1 text-center border border-primary/10">
              <div className="font-bold text-sm text-primary">{property.livingRooms}</div>
              <div className="text-[9px] text-primary/70">{t('map.living')}</div>
            </div>
            <div className="bg-primary/10 rounded-lg py-1.5 px-1 text-center border border-primary/20">
              <div className="font-bold text-sm text-primary">{property.sqft}</div>
              <div className="text-[9px] text-primary/70">m²</div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onPopupClick(property.id);
            }}
            className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-semibold py-2 rounded-lg transition-colors shadow-md"
          >
            {t('map.clickForDetails')}
          </button>
        </div>
      </div>
    );
  }

  // Standard popup
  return (
    <div className="w-56 cursor-pointer" onClick={() => onPopupClick(property.id)}>
      <div className="relative mb-2">
        <img
          src={images[currentImageIndex]}
          alt={property.address}
          className="w-full h-28 object-cover rounded"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors text-sm"
            >
              ‹
            </button>
            <button
              onClick={nextImage}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors text-sm"
            >
              ›
            </button>

            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
              {currentImageIndex + 1}/{images.length}
            </div>
          </>
        )}
      </div>

      {property.title && (
        <p className="font-bold text-sm text-neutral-900 mb-1 line-clamp-1">
          {property.title}
        </p>
      )}

      <div className="mb-1.5">
        <div className="flex items-center justify-between">
          <p className="font-bold text-base text-primary">
            {formatPrice(property.price, property.country)}
          </p>
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 capitalize">
            {property.propertyType}
          </span>
        </div>
      </div>

      <p className="text-xs text-neutral-600 mb-2 line-clamp-1">
        {property.address}, {property.city}
      </p>

      <div className="grid grid-cols-3 gap-1.5 mb-2 text-center">
        <div className="bg-neutral-50 rounded py-1.5">
          <div className="text-xs text-neutral-500">{t('map.beds')}</div>
          <div className="font-bold text-sm text-neutral-800">{property.beds}</div>
        </div>
        <div className="bg-neutral-50 rounded py-1.5">
          <div className="text-xs text-neutral-500">{t('map.baths')}</div>
          <div className="font-bold text-sm text-neutral-800">{property.baths}</div>
        </div>
        <div className="bg-neutral-50 rounded py-1.5">
          <div className="text-xs text-neutral-500">{t('map.area')}</div>
          <div className="font-bold text-sm text-neutral-800">{property.sqft}</div>
        </div>
      </div>

      <div className="text-center pt-1.5 border-t border-neutral-200">
        <p className="text-xs font-semibold text-primary">{t('map.clickForDetails')}</p>
      </div>
    </div>
  );
};

/**
 * Single property marker component
 */
const PropertyMarker: React.FC<{
  property: Property;
  onPopupClick: (id: string) => void;
  isHovered: boolean;
  isNightMode: boolean;
  zoom: number;
}> = ({ property, onPopupClick, isHovered, isNightMode, zoom }) => {
  const [showPopup, setShowPopup] = useState(false);

  const price = formatMarkerPrice(property.price);
  const color = PROPERTY_TYPE_COLORS[property.propertyType] || PROPERTY_TYPE_COLORS.other;
  const ringColor = getRingColor(property);
  const animationClass = getPromotedMarkerClass(property);
  const isPromoted = ringColor !== null;

  const isDetailed = zoom >= ZOOM_THRESHOLD;
  const size = isHovered ? 1.2 : 1;

  return (
    <>
      <Marker
        longitude={property.lng}
        latitude={property.lat}
        anchor={isDetailed ? 'bottom' : 'center'}
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setShowPopup(true);
        }}
      >
        <div
          className={`cursor-pointer transition-transform duration-200 ${animationClass}`}
          style={{ transform: `scale(${size})` }}
          onMouseEnter={() => setShowPopup(true)}
          onMouseLeave={() => setShowPopup(false)}
        >
          {isDetailed ? (
            // House-shaped marker for zoomed in view
            <div
              className="relative"
              style={{
                filter: isNightMode && isPromoted
                  ? 'drop-shadow(0 0 10px rgba(0, 255, 255, 0.9))'
                  : 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))'
              }}
            >
              <svg width="60" height="48" viewBox="0 0 70 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M35 56L25 44H45L35 56Z" fill="#003A96" />
                <path
                  d="M65 24.5V44H5V24.5L35 5L65 24.5Z"
                  fill={color}
                  stroke={ringColor || '#FFFFFF'}
                  strokeWidth={ringColor ? 3 : 2}
                />
                <text
                  x="35"
                  y="30"
                  fontFamily="Inter, sans-serif"
                  fontSize="14"
                  fontWeight="bold"
                  fill="white"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {price}
                </text>
              </svg>
            </div>
          ) : (
            // Circular marker for zoomed out view
            <div
              style={{
                filter: isNightMode && isPromoted
                  ? 'drop-shadow(0 0 8px rgba(0, 255, 255, 0.8))'
                  : 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))'
              }}
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill={color}
                  stroke={ringColor || '#FFFFFF'}
                  strokeWidth={ringColor ? 3 : 2}
                />
                <text
                  x="20"
                  y="21"
                  fontFamily="Inter, sans-serif"
                  fontSize="9"
                  fontWeight="bold"
                  fill="white"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {price}
                </text>
              </svg>
            </div>
          )}
        </div>
      </Marker>

      {showPopup && (
        <Popup
          longitude={property.lng}
          latitude={property.lat}
          anchor="bottom"
          onClose={() => setShowPopup(false)}
          closeButton={false}
          closeOnClick={false}
          offset={isDetailed ? 48 : 20}
          maxWidth="none"
        >
          <PropertyPopup property={property} onPopupClick={onPopupClick} />
        </Popup>
      )}
    </>
  );
};

/**
 * MarkersMapbox Component
 * Renders all property markers on the Mapbox map
 */
interface MarkersMapboxProps {
  properties: Property[];
  onPopupClick: (id: string) => void;
  hoveredPropertyId?: string | null;
  isNightMode?: boolean;
  zoom: number;
}

export const MarkersMapbox: React.FC<MarkersMapboxProps> = ({
  properties,
  onPopupClick,
  hoveredPropertyId,
  isNightMode = false,
  zoom
}) => {
  return (
    <>
      {properties.map((prop) => (
        <PropertyMarker
          key={prop.id}
          property={prop}
          onPopupClick={onPopupClick}
          isHovered={prop.id === hoveredPropertyId}
          isNightMode={isNightMode}
          zoom={zoom}
        />
      ))}
    </>
  );
};

/**
 * Promotion Tier Colors for legend
 */
const PROMOTION_TIER_COLORS = {
  premium: '#FFB800',
  highlight: '#0EA5E9',
  featured: '#7C3AED',
} as const;

/**
 * Legend Component
 */
interface LegendProps {
  isNightMode?: boolean;
}

export const Legend: React.FC<LegendProps> = ({ isNightMode = false }) => {
  const { t } = useTranslation(['property']);

  return (
    <div className={`${
      isNightMode
        ? 'bg-slate-900/90 border-slate-700'
        : 'bg-white/80 border-neutral-200'
    } backdrop-blur-sm p-3 rounded-lg shadow-lg border animate-fade-in transition-colors duration-300`}>
      <h4 className={`font-bold text-sm mb-2 ${isNightMode ? 'text-white' : 'text-neutral-800'}`}>
        {t('map.legend')}
      </h4>

      {/* Property Types */}
      <div className="space-y-1.5 mb-3">
        {Object.entries(PROPERTY_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <span
              className={`w-3.5 h-3.5 rounded-full border-2 shadow-sm ${
                isNightMode ? 'border-slate-700' : 'border-white'
              }`}
              style={{ backgroundColor: color }}
            ></span>
            <span className={`text-xs font-semibold ${isNightMode ? 'text-slate-300' : 'text-neutral-700'}`}>
              {t(`map.propertyTypes.${type}`)}
            </span>
          </div>
        ))}
      </div>

      {/* Promotion Tiers */}
      <div className={`border-t ${isNightMode ? 'border-slate-700' : 'border-neutral-200'} pt-2 mt-2`}>
        <h5 className={`text-xs font-bold mb-1.5 ${isNightMode ? 'text-slate-400' : 'text-neutral-600'}`}>
          {t('map.promotedListings', 'Promoted')}
        </h5>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-3.5 h-3.5 rounded-full border-2 shadow-sm ${isNightMode ? 'bg-slate-800' : 'bg-white'}`}
              style={{ borderColor: PROMOTION_TIER_COLORS.premium }}
            ></span>
            <span className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-neutral-600'}`}>
              👑 {t('map.tiers.premium', 'Premium Premiere')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3.5 h-3.5 rounded-full border-2 shadow-sm ${isNightMode ? 'bg-slate-800' : 'bg-white'}`}
              style={{ borderColor: PROMOTION_TIER_COLORS.highlight }}
            ></span>
            <span className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-neutral-600'}`}>
              💎 {t('map.tiers.highlight', 'Highlight Listing')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3.5 h-3.5 rounded-full border-2 shadow-sm ${isNightMode ? 'bg-slate-800' : 'bg-white'}`}
              style={{ borderColor: PROMOTION_TIER_COLORS.featured }}
            ></span>
            <span className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-neutral-600'}`}>
              ⭐ {t('map.tiers.featured', 'Featured Listing')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkersMapbox;
