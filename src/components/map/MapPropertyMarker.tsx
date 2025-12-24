// MapPropertyMarker
// Property markers and popups for map display

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Property } from '../../../types';
import { formatPrice } from '../../../utils/currency';
import { BuildingOfficeIcon } from '../../../constants';

// Inject CSS animations for map markers
const injectMapMarkerStyles = () => {
  const styleId = 'map-marker-animations';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes markerBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    @keyframes markerPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    /* Premium Premiere - GOLD and glowing, bouncing */
    @keyframes glowGold {
      0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 20px rgba(255, 193, 7, 0.6)); }
      50% { filter: drop-shadow(0 0 20px rgba(255, 215, 0, 1)) drop-shadow(0 0 35px rgba(255, 193, 7, 0.8)); }
    }

    /* Highlight Listing - Baby blue glow */
    @keyframes glowBabyBlue {
      0%, 100% { filter: drop-shadow(0 0 8px rgba(135, 206, 250, 0.7)) drop-shadow(0 0 16px rgba(135, 206, 250, 0.5)); }
      50% { filter: drop-shadow(0 0 16px rgba(135, 206, 250, 0.9)) drop-shadow(0 0 28px rgba(135, 206, 250, 0.6)); }
    }

    /* Featured - Simple subtle glow only */
    @keyframes glowSubtle {
      0%, 100% { filter: drop-shadow(0 0 6px rgba(147, 197, 253, 0.5)) drop-shadow(0 0 10px rgba(147, 197, 253, 0.3)); }
      50% { filter: drop-shadow(0 0 10px rgba(147, 197, 253, 0.7)) drop-shadow(0 0 16px rgba(147, 197, 253, 0.4)); }
    }

    /* Marker wrapper - stays in place, provides anchor point */
    .promoted-marker-wrapper {
      position: relative;
    }

    /* Premium Premiere - Gold, glowing, bouncing (TOP tier) */
    .promoted-marker-inner-premium {
      animation: markerBounce 2s ease-in-out infinite, glowGold 1.5s ease-in-out infinite;
      transform-origin: center bottom;
    }

    /* Highlight Listing - Baby blue, bouncing */
    .promoted-marker-inner-highlight {
      animation: markerBounce 2.5s ease-in-out infinite, glowBabyBlue 2s ease-in-out infinite;
      transform-origin: center bottom;
    }

    /* Featured - Only subtle glow, no bounce (lower tier) */
    .promoted-marker-inner-featured {
      animation: glowSubtle 3s ease-in-out infinite;
      transform-origin: center bottom;
    }

    /* Standard promotion - just a subtle pulse */
    .promoted-marker-inner-standard {
      animation: markerPulse 3s ease-in-out infinite;
      transform-origin: center bottom;
    }

    /* Enhanced popup styles for promoted properties */
    .promoted-property-popup .leaflet-popup-content-wrapper {
      padding: 0;
      overflow: hidden;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }

    .promoted-property-popup .leaflet-popup-content {
      margin: 0;
      width: 100% !important;
    }

    .promoted-property-popup .leaflet-popup-tip {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `;
  document.head.appendChild(style);
};

// Initialize styles
if (typeof window !== 'undefined') {
  injectMapMarkerStyles();
}

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
 * Get animation class for promoted property markers (inner element)
 */
const getPromotedMarkerInnerClass = (property: Property): string => {
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  if (!isActivelyPromoted) return '';

  switch (property.promotionTier) {
    case 'premium': return 'promoted-marker-inner-premium';
    case 'highlight': return 'promoted-marker-inner-highlight';
    case 'featured': return 'promoted-marker-inner-featured';
    default: return 'promoted-marker-inner-standard';
  }
};

/**
 * Create simple circular marker for zoomed out view
 */
const createSimpleMarkerIcon = (property: Property, isHovered: boolean = false) => {
  const price = formatMarkerPrice(property.price);
  const color = PROPERTY_TYPE_COLORS[property.propertyType] || PROPERTY_TYPE_COLORS.other;

  // Check if property is actively promoted
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  // Get ring color based on promotion tier or property type
  // Premium = Gold, Highlight = Baby Blue, Featured = Light Blue (lower tier)
  let ringColor = 'none';
  let ringWidth = 2;
  if (isActivelyPromoted) {
    if (property.promotionTier === 'premium') {
      ringColor = '#FFD700'; // Gold for Premium Premiere
    } else if (property.promotionTier === 'highlight') {
      ringColor = '#87CEEB'; // Baby blue for Highlight
    } else if (property.promotionTier === 'featured') {
      ringColor = '#93C5FD'; // Light blue for Featured (lower tier)
    } else {
      ringColor = '#9ca3af'; // gray-400 for standard
    }
    ringWidth = isHovered ? 4 : 3;
  } else if (isHovered) {
    ringColor = color; // Use property type color on hover
    ringWidth = 4;
  }

  const baseFilter = 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))';
  const promotedInnerClass = getPromotedMarkerInnerClass(property);

  // Wrap SVG in a container - the outer div stays in place, the inner div animates
  const svgHtml = `
    <div class="promoted-marker-wrapper" style="width: 30px; height: 30px;">
      <div class="${promotedInnerClass}" style="width: 30px; height: 30px;">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: ${baseFilter}; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <circle cx="15" cy="15" r="${13 + (isHovered ? 3 : 0)}" fill="${color}" stroke="${ringColor !== 'none' ? ringColor : '#FFFFFF'}" stroke-width="${ringWidth}"/>
            <text x="15" y="16" font-family="Inter, sans-serif" font-size="8" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${price}</text>
        </svg>
      </div>
    </div>
  `;

  const hoverClass = isHovered ? 'scale-150 drop-shadow-lg' : '';

  return L.divIcon({
    html: svgHtml,
    className: hoverClass,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

/**
 * Create detailed house-shaped marker for zoomed in view
 */
const createDetailedMarkerIcon = (property: Property, isHovered: boolean = false) => {
  const price = formatMarkerPrice(property.price);
  const color = PROPERTY_TYPE_COLORS[property.propertyType] || PROPERTY_TYPE_COLORS.other;

  // Check if property is actively promoted
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  // Get stroke color based on promotion tier or property type
  // Premium = Gold, Highlight = Baby Blue, Featured = Light Blue (lower tier)
  let strokeColor = '#FFFFFF';
  let strokeWidth = 2;
  if (isActivelyPromoted) {
    if (property.promotionTier === 'premium') {
      strokeColor = '#FFD700'; // Gold for Premium Premiere
    } else if (property.promotionTier === 'highlight') {
      strokeColor = '#87CEEB'; // Baby blue for Highlight
    } else if (property.promotionTier === 'featured') {
      strokeColor = '#93C5FD'; // Light blue for Featured (lower tier)
    } else {
      strokeColor = '#9ca3af'; // gray-400 for standard
    }
    strokeWidth = isHovered ? 4 : 3;
  } else if (isHovered) {
    strokeColor = color; // Use property type color on hover
    strokeWidth = 4;
  }

  const scale = isHovered ? 1.25 : 1;
  const baseFilter = 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))';
  const promotedInnerClass = getPromotedMarkerInnerClass(property);

  // Wrap SVG in a container - the outer div stays in place, the inner div animates
  const svgHtml = `
    <div class="promoted-marker-wrapper" style="width: 45px; height: 36px;">
      <div class="${promotedInnerClass}" style="width: 45px; height: 36px;">
        <svg width="45" height="36" viewBox="0 0 70 56" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: ${baseFilter}; transform-origin: bottom center; transform: scale(${scale}); transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <path d="M35 56L25 44H45L35 56Z" fill="#003A96" />
            <path d="M65 24.5V44H5V24.5L35 5L65 24.5Z" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
            <text x="35" y="30" font-family="Inter, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${price}</text>
        </svg>
      </div>
    </div>
  `;

  const hoverClass = isHovered ? 'drop-shadow-xl' : '';

  return L.divIcon({
    html: svgHtml,
    className: hoverClass,
    iconSize: [45, 36],
    iconAnchor: [22.5, 36],
    popupAnchor: [0, -36],
  });
};

/**
 * Create appropriate marker icon based on zoom level
 */
const createCustomMarkerIcon = (property: Property, zoom: number, isHovered: boolean = false): L.DivIcon => {
  if (zoom < ZOOM_THRESHOLD) {
    return createSimpleMarkerIcon(property, isHovered);
  }
  return createDetailedMarkerIcon(property, isHovered);
};

// Tier badge configurations for popup
// Premium = Gold, Highlight = Baby Blue, Featured = Light Blue (lower tier)
const POPUP_TIER_CONFIG: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  premium: { bg: 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300', border: 'border-yellow-400', icon: '👑', label: 'PREMIUM PREMIERE' },
  highlight: { bg: 'bg-gradient-to-r from-sky-400 via-sky-300 to-cyan-300', border: 'border-sky-300', icon: '💎', label: 'HIGHLIGHT' },
  featured: { bg: 'bg-gradient-to-r from-blue-400 via-blue-300 to-blue-200', border: 'border-blue-200', icon: '⭐', label: 'FEATURED' },
  standard: { bg: 'bg-gradient-to-r from-gray-500 to-gray-600', border: 'border-gray-300', icon: '✨', label: 'PROMOTED' },
};

/**
 * PropertyPopup Component
 *
 * Displays property information in map popup with image carousel.
 * Enhanced version for promoted properties with 3-image gallery.
 */
const PropertyPopup: React.FC<{
  property: Property;
  onPopupClick: (id: string) => void;
}> = ({ property, onPopupClick }) => {
  const { t } = useTranslation(['property']);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // Check if property is actively promoted
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  const promotionTier = property.promotionTier || 'standard';
  const tierConfig = POPUP_TIER_CONFIG[promotionTier] || POPUP_TIER_CONFIG.standard;

  // For promoted properties, show up to 3 images; for regular, show all
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

  // Auto-advance for promoted properties
  useEffect(() => {
    if (!isActivelyPromoted || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isActivelyPromoted, images.length]);

  // Enhanced popup for promoted properties
  if (isActivelyPromoted) {
    return (
      <div
        className={`w-72 cursor-pointer rounded-lg overflow-hidden border-2 ${tierConfig.border}`}
        onClick={() => onPopupClick(property.id)}
      >
        {/* Image carousel - larger for promoted */}
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

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          {/* Promotion tier badge */}
          <div className={`absolute top-2 left-2 ${tierConfig.bg} text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1.5`}>
            <span>{tierConfig.icon}</span>
            {tierConfig.label}
          </div>

          {/* Image navigation for promoted */}
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

              {/* Image dots indicator */}
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

              {/* Image counter */}
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                {currentImageIndex + 1}/{images.length}
              </div>
            </>
          )}
        </div>

        {/* Content section */}
        <div className="p-3 bg-white">
          {/* Price with gradient */}
          <div className="flex items-center justify-between mb-2">
            <span className="bg-gradient-to-r from-primary to-primary-dark text-white font-bold px-3 py-1 rounded-lg text-base shadow">
              {formatPrice(property.price, property.country)}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 capitalize">
              {property.propertyType}
            </span>
          </div>

          {/* Title */}
          {property.title && (
            <p className="font-bold text-sm text-neutral-900 mb-1 line-clamp-1">
              {property.title}
            </p>
          )}

          {/* Address */}
          <p className="text-xs text-neutral-500 mb-2 line-clamp-1">
            📍 {property.address}, {property.city}
          </p>

          {/* Property stats - enhanced grid */}
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

          {/* View details button */}
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

  // Standard popup for non-promoted properties
  return (
    <div className="w-56 cursor-pointer" onClick={() => onPopupClick(property.id)}>
      {/* Image carousel */}
      <div className="relative mb-2">
        <img
          src={images[currentImageIndex]}
          alt={property.address}
          className="w-full h-28 object-cover rounded"
        />

        {/* Image navigation */}
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

            {/* Image counter */}
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
              {currentImageIndex + 1}/{images.length}
            </div>
          </>
        )}
      </div>

      {/* Title */}
      {property.title && (
        <p className="font-bold text-sm text-neutral-900 mb-1 line-clamp-1">
          {property.title}
        </p>
      )}

      {/* Price and property type */}
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

      {/* Address */}
      <p className="text-xs text-neutral-600 mb-2 line-clamp-1">
        {property.address}, {property.city}
      </p>

      {/* Essential information */}
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

      {/* Additional features */}
      <div className="flex flex-wrap gap-1 mb-1.5">
        {property.livingRooms > 0 && (
          <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
            {property.livingRooms} {t('map.living')}
          </span>
        )}
        {property.parking > 0 && (
          <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
            {property.parking} {t('map.parking')}
          </span>
        )}
        {property.yearBuilt && (
          <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
            {property.yearBuilt}
          </span>
        )}
      </div>

      {/* View details prompt */}
      <div className="text-center pt-1.5 border-t border-neutral-200">
        <p className="text-xs font-semibold text-primary">{t('map.clickForDetails')}</p>
      </div>
    </div>
  );
};

/**
 * Markers Component
 *
 * Renders all property markers on the map with zoom-responsive icons.
 */
interface MarkersProps {
  properties: Property[];
  onPopupClick: (id: string) => void;
  hoveredPropertyId?: string | null;
}

export const Markers: React.FC<MarkersProps> = ({ properties, onPopupClick, hoveredPropertyId }) => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const markerRefsMap = React.useRef<Map<string, L.Marker>>(new Map());

  useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });

  // Update marker icon when hover state changes
  React.useEffect(() => {
    properties.forEach((prop) => {
      const marker = markerRefsMap.current.get(prop.id);
      if (marker) {
        const isHovered = prop.id === hoveredPropertyId;
        const newIcon = createCustomMarkerIcon(prop, zoom, isHovered);
        marker.setIcon(newIcon);
      }
    });
  }, [hoveredPropertyId, zoom, properties]);

  // Helper to check if property is actively promoted
  const isPropertyPromoted = (prop: Property) =>
    prop.isPromoted && prop.promotionEndDate && prop.promotionEndDate > Date.now();

  return (
    <>
      {properties.map((prop) => {
        const isPromoted = isPropertyPromoted(prop);
        return (
          <Marker
            key={prop.id}
            position={[prop.lat, prop.lng]}
            icon={createCustomMarkerIcon(prop, zoom, prop.id === hoveredPropertyId)}
            ref={(marker) => {
              if (marker) {
                markerRefsMap.current.set(prop.id, marker);
              }
            }}
            zIndexOffset={isPromoted ? 1000 : 0} // Promoted markers appear on top
          >
            <Popup
              maxWidth={isPromoted ? 300 : 230}
              minWidth={isPromoted ? 288 : 220}
              className={isPromoted ? 'promoted-property-popup' : ''}
            >
              <PropertyPopup property={prop} onPopupClick={onPopupClick} />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

/**
 * Promotion Tier Colors for map markers
 * Premium = Gold, Highlight = Baby Blue, Featured = Light Blue
 */
const PROMOTION_TIER_COLORS = {
  premium: '#FFD700',   // Gold for Premium Premiere
  highlight: '#87CEEB', // Baby blue for Highlight
  featured: '#93C5FD',  // Light blue for Featured
} as const;

/**
 * HighlightedPropertyMarkers Component
 *
 * Special markers for highlighted/promoted properties with pulsing animations
 * and tier-specific styling.
 */
interface HighlightedPropertyMarkersProps {
  onPopupClick: (id: string) => void;
}

export const HighlightedPropertyMarkers: React.FC<HighlightedPropertyMarkersProps> = ({
  onPopupClick,
}) => {
  // This component uses the HighlightedPropertiesContext from the parent
  // For now, we'll use the existing markers with enhanced styling
  // The actual highlighting is handled by the marker icon functions above
  return null; // Highlighting is already applied through marker icons
};

/**
 * Legend Component
 *
 * Shows color legend for different property types and promotion tiers.
 */
export const Legend: React.FC = () => {
  const { t } = useTranslation(['property']);

  return (
    <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-neutral-200 animate-fade-in">
      <h4 className="font-bold text-sm mb-2 text-neutral-800">{t('map.legend')}</h4>

      {/* Property Types */}
      <div className="space-y-1.5 mb-3">
        {Object.entries(PROPERTY_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: color }}
            ></span>
            <span className="text-xs font-semibold text-neutral-700">
              {t(`map.propertyTypes.${type}`)}
            </span>
          </div>
        ))}
      </div>

      {/* Promotion Tiers Separator */}
      <div className="border-t border-neutral-200 pt-2 mt-2">
        <h5 className="text-xs font-bold text-neutral-600 mb-1.5">{t('map.promotedListings', 'Promoted')}</h5>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full border-2 shadow-sm"
              style={{ borderColor: PROMOTION_TIER_COLORS.premium, backgroundColor: 'white' }}
            ></span>
            <span className="text-xs text-neutral-600">👑 {t('map.tiers.premium', 'Premium Premiere')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full border-2 shadow-sm"
              style={{ borderColor: PROMOTION_TIER_COLORS.highlight, backgroundColor: 'white' }}
            ></span>
            <span className="text-xs text-neutral-600">💎 {t('map.tiers.highlight', 'Highlight Listing')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full border-2 shadow-sm"
              style={{ borderColor: PROMOTION_TIER_COLORS.featured, backgroundColor: 'white' }}
            ></span>
            <span className="text-xs text-neutral-600">⭐ {t('map.tiers.featured', 'Featured Listing')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
