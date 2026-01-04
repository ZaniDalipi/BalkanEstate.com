// MapPropertyMarker
// Property markers and popups for map display

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Property } from '@/types';
import { formatPrice } from '@/utils/currency';
import { BuildingOfficeIcon } from '@/constants';
import { getPriceReductionInfo } from '@/utils/priceUtils';

// Inject CSS animations for map markers
const injectMapMarkerStyles = () => {
  const styleId = 'map-marker-animations';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes markerBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }

    @keyframes markerPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    /* Premium Premiere - Rich Gold with pulsing glow */
    @keyframes glowPremium {
      0%, 100% {
        filter: drop-shadow(0 0 8px rgba(255, 180, 0, 0.9)) drop-shadow(0 0 16px rgba(255, 140, 0, 0.6));
      }
      50% {
        filter: drop-shadow(0 0 18px rgba(255, 200, 0, 1)) drop-shadow(0 0 30px rgba(255, 160, 0, 0.8));
      }
    }

    /* Border pulse animation for Premium */
    @keyframes borderPulsePremium {
      0%, 100% {
        stroke-width: 3;
        stroke: #FFB800;
      }
      50% {
        stroke-width: 5;
        stroke: #FFC700;
      }
    }

    /* Highlight Listing - Light Blue/Sky (2nd tier) */
    @keyframes glowHighlight {
      0%, 100% {
        filter: drop-shadow(0 0 6px rgba(14, 165, 233, 0.8)) drop-shadow(0 0 14px rgba(2, 132, 199, 0.5));
      }
      50% {
        filter: drop-shadow(0 0 14px rgba(56, 189, 248, 0.95)) drop-shadow(0 0 24px rgba(14, 165, 233, 0.7));
      }
    }

    /* Border pulse animation for Highlight - Light Blue */
    @keyframes borderPulseHighlight {
      0%, 100% {
        stroke-width: 3;
        stroke: #0EA5E9;
      }
      50% {
        stroke-width: 5;
        stroke: #38BDF8;
      }
    }

    /* Featured - Vibrant Pink glow */
    @keyframes glowFeatured {
      0%, 100% {
        filter: drop-shadow(0 0 5px rgba(236, 72, 153, 0.6)) drop-shadow(0 0 10px rgba(219, 39, 119, 0.4));
      }
      50% {
        filter: drop-shadow(0 0 10px rgba(244, 114, 182, 0.8)) drop-shadow(0 0 18px rgba(236, 72, 153, 0.5));
      }
    }

    /* Marker wrapper - stays in place, provides anchor point */
    .promoted-marker-wrapper {
      position: relative;
      background: transparent !important;
    }

    /* Remove default Leaflet divIcon background */
    .leaflet-div-icon {
      background: transparent !important;
      border: none !important;
    }

    /* Premium Premiere - Gold, glowing, bouncing with border pulse (TOP tier) */
    .promoted-marker-inner-premium {
      animation: markerBounce 2s ease-in-out infinite, glowPremium 1.5s ease-in-out infinite;
      transform-origin: center bottom;
    }
    .promoted-marker-inner-premium svg circle,
    .promoted-marker-inner-premium svg path:last-of-type {
      animation: borderPulsePremium 1.5s ease-in-out infinite;
    }

    /* Highlight Listing - Cyan/Teal, bouncing with border pulse */
    .promoted-marker-inner-highlight {
      animation: markerBounce 2.2s ease-in-out infinite, glowHighlight 1.8s ease-in-out infinite;
      transform-origin: center bottom;
    }
    .promoted-marker-inner-highlight svg circle,
    .promoted-marker-inner-highlight svg path:last-of-type {
      animation: borderPulseHighlight 1.8s ease-in-out infinite;
    }

    /* Featured - Subtle purple glow, gentle pulse (lower tier) */
    .promoted-marker-inner-featured {
      animation: glowFeatured 2.5s ease-in-out infinite, markerPulse 3s ease-in-out infinite;
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

/**
 * Calculate marker scale factor based on zoom level
 * Markers get smaller when zoomed out to avoid clutter
 */
const getMarkerScaleForZoom = (zoom: number): number => {
  if (zoom >= 12) return 1;      // Full size at zoom 12+
  if (zoom >= 10) return 0.9;    // 90% at zoom 10-11
  if (zoom >= 8) return 0.75;    // 75% at zoom 8-9
  if (zoom >= 6) return 0.65;    // 65% at zoom 6-7
  return 0.55;                    // 55% at zoom 5 and below
};

const PROPERTY_TYPE_COLORS: Record<
  NonNullable<Property['propertyType']> | 'other',
  string
> = {
  house: '#0252CD',
  apartment: '#28a745',
  villa: '#6f42c1',
  land: '#8B4513',    // Brown for land
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
 * Supports night mode with neon glow effects
 * Scales based on zoom level to avoid clutter when zoomed out
 */
const createSimpleMarkerIcon = (property: Property, isHovered: boolean = false, isNightMode: boolean = false, zoom: number = 12) => {
  const price = formatMarkerPrice(property.price);
  const color = PROPERTY_TYPE_COLORS[property.propertyType] || PROPERTY_TYPE_COLORS.other;
  const zoomScale = getMarkerScaleForZoom(zoom);

  // Check if property is actively promoted
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  // Get ring color based on promotion tier or property type
  // Premium = Gold (1st), Highlight = Light Blue (2nd), Featured = Dark Purple (3rd)
  let ringColor = 'none';
  let ringWidth = 2;
  if (isActivelyPromoted) {
    if (property.promotionTier === 'premium') {
      ringColor = '#FFB800'; // Rich Gold for Premium Premiere (TOP tier)
    } else if (property.promotionTier === 'highlight') {
      ringColor = '#0EA5E9'; // Light Blue/Sky for Highlight (2nd tier)
    } else if (property.promotionTier === 'featured') {
      ringColor = '#7C3AED'; // Dark Purple/Violet for Featured (3rd tier)
    } else {
      ringColor = '#9ca3af'; // gray-400 for standard
    }
    ringWidth = isHovered ? 4 : 3;
  } else if (isHovered) {
    ringColor = color; // Use property type color on hover
    ringWidth = 4;
  }

  // Night mode: Only promoted properties get glow effect
  const shouldGlow = isNightMode && isActivelyPromoted;
  const nightModeGlow = shouldGlow
    ? 'drop-shadow(0 0 8px rgba(0, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(0, 200, 255, 0.5)) drop-shadow(0 0 24px rgba(0, 150, 255, 0.3))'
    : '';
  const baseFilter = shouldGlow
    ? nightModeGlow
    : 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))';

  // In night mode, use brighter colors but no special stroke for non-promoted
  const markerColor = isNightMode ? lightenColor(color, 20) : color;
  const strokeColorFinal = ringColor !== 'none' ? ringColor : '#FFFFFF';

  const promotedInnerClass = getPromotedMarkerInnerClass(property);
  const nightModeClass = shouldGlow ? 'night-mode-marker-pulse' : '';

  // Calculate scaled dimensions
  const baseSize = 30;
  const scaledSize = Math.round(baseSize * zoomScale);
  const fontSize = Math.max(6, Math.round(8 * zoomScale));
  const circleRadius = Math.round((13 + (isHovered ? 3 : 0)) * zoomScale);

  // Wrap SVG in a container - the outer div stays in place, the inner div animates
  const svgHtml = `
    <div class="promoted-marker-wrapper ${nightModeClass}" style="width: ${scaledSize}px; height: ${scaledSize}px;">
      <div class="${promotedInnerClass}" style="width: ${scaledSize}px; height: ${scaledSize}px;">
        <svg width="${scaledSize}" height="${scaledSize}" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: ${baseFilter}; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <circle cx="15" cy="15" r="${13 + (isHovered ? 3 : 0)}" fill="${markerColor}" stroke="${strokeColorFinal}" stroke-width="${ringWidth}"/>
            <text x="15" y="16" font-family="Inter, sans-serif" font-size="8" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${price}</text>
        </svg>
      </div>
    </div>
  `;

  const hoverClass = isHovered ? 'scale-150 drop-shadow-lg' : '';

  return L.divIcon({
    html: svgHtml,
    className: hoverClass,
    iconSize: [scaledSize, scaledSize],
    iconAnchor: [scaledSize / 2, scaledSize / 2],
    popupAnchor: [0, -scaledSize / 2],
  });
};

/**
 * Helper function to lighten a hex color
 */
const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
};

/**
 * Create detailed house-shaped marker for zoomed in view
 * Supports night mode with neon glow effects
 */
const createDetailedMarkerIcon = (property: Property, isHovered: boolean = false, isNightMode: boolean = false) => {
  const price = formatMarkerPrice(property.price);
  const color = PROPERTY_TYPE_COLORS[property.propertyType] || PROPERTY_TYPE_COLORS.other;

  // Check if property is actively promoted
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  // Get stroke color based on promotion tier or property type
  // Premium = Gold (1st), Highlight = Light Blue (2nd), Featured = Dark Purple (3rd)
  let strokeColor = '#FFFFFF';
  let strokeWidth = 2;
  if (isActivelyPromoted) {
    if (property.promotionTier === 'premium') {
      strokeColor = '#FFB800'; // Rich Gold for Premium Premiere (TOP tier)
    } else if (property.promotionTier === 'highlight') {
      strokeColor = '#0EA5E9'; // Light Blue/Sky for Highlight (2nd tier)
    } else if (property.promotionTier === 'featured') {
      strokeColor = '#7C3AED'; // Dark Purple/Violet for Featured (3rd tier)
    } else {
      strokeColor = '#9ca3af'; // gray-400 for standard
    }
    strokeWidth = isHovered ? 4 : 3;
  } else if (isHovered) {
    strokeColor = color; // Use property type color on hover
    strokeWidth = 4;
  }

  // Night mode: Only promoted properties get glow effect
  const shouldGlow = isNightMode && isActivelyPromoted;
  const nightModeGlow = shouldGlow
    ? 'drop-shadow(0 0 10px rgba(0, 255, 255, 0.9)) drop-shadow(0 0 20px rgba(0, 200, 255, 0.6)) drop-shadow(0 0 30px rgba(0, 150, 255, 0.4))'
    : '';
  const baseFilter = shouldGlow
    ? nightModeGlow
    : 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))';

  // In night mode, use brighter colors but no special stroke for non-promoted
  const markerColor = isNightMode ? lightenColor(color, 20) : color;
  const strokeColorFinal = strokeColor;
  const pointerColor = isNightMode ? '#001a33' : '#003A96';

  const scale = isHovered ? 1.25 : 1;
  const promotedInnerClass = getPromotedMarkerInnerClass(property);
  const nightModeClass = shouldGlow ? 'night-mode-marker-pulse' : '';

  // Wrap SVG in a container - the outer div stays in place, the inner div animates
  const svgHtml = `
    <div class="promoted-marker-wrapper ${nightModeClass}" style="width: 45px; height: 36px;">
      <div class="${promotedInnerClass}" style="width: 45px; height: 36px;">
        <svg width="45" height="36" viewBox="0 0 70 56" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: ${baseFilter}; transform-origin: bottom center; transform: scale(${scale}); transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <path d="M35 56L25 44H45L35 56Z" fill="${pointerColor}" />
            <path d="M65 24.5V44H5V24.5L35 5L65 24.5Z" fill="${markerColor}" stroke="${strokeColorFinal}" stroke-width="${strokeWidth}" />
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
 * Supports night mode with glowing neon effects
 */
const createCustomMarkerIcon = (property: Property, zoom: number, isHovered: boolean = false, isNightMode: boolean = false): L.DivIcon => {
  if (zoom < ZOOM_THRESHOLD) {
    return createSimpleMarkerIcon(property, isHovered, isNightMode, zoom);
  }
  return createDetailedMarkerIcon(property, isHovered, isNightMode);
};

// Tier badge configurations for popup
// Premium = Gold (1st), Highlight = Light Blue (2nd), Featured = Dark Purple (3rd)
const POPUP_TIER_CONFIG: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  premium: { bg: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400', border: 'border-amber-400', icon: '👑', label: 'PREMIUM PREMIERE' },
  highlight: { bg: 'bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400', border: 'border-sky-400', icon: '💎', label: 'HIGHLIGHT' },
  featured: { bg: 'bg-gradient-to-r from-violet-600 via-purple-500 to-violet-400', border: 'border-violet-500', icon: '⭐', label: 'FEATURED' },
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

  // Get price reduction info
  const priceInfo = useMemo(() => getPriceReductionInfo(property), [property]);

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
            <div className="flex flex-col">
              {priceInfo.hasReduction && (
                <span className="text-neutral-400 text-xs line-through">
                  {formatPrice(priceInfo.originalPrice, property.country)}
                </span>
              )}
              <span className={`font-bold px-3 py-1 rounded-lg text-base shadow text-white ${
                priceInfo.hasReduction
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                  : 'bg-gradient-to-r from-primary to-primary-dark'
              }`}>
                {formatPrice(priceInfo.currentPrice, property.country)}
                {priceInfo.hasReduction && (
                  <span className="ml-1 text-xs font-bold">-{priceInfo.discountPercentage}%</span>
                )}
              </span>
            </div>
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

          {/* Property stats - different layout for land vs residential */}
          {property.propertyType === 'land' ? (
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div className="bg-amber-50 rounded-lg py-2 px-2 text-center border border-amber-200">
                <div className="font-bold text-lg text-amber-800">{property.sqft?.toLocaleString()}</div>
                <div className="text-[10px] text-amber-600">{t('map.area', 'Area')} (m²)</div>
              </div>
              <div className="bg-primary/5 rounded-lg py-2 px-2 text-center border border-primary/10">
                <div className="font-bold text-sm text-primary">
                  €{property.sqft > 0 ? (property.price / property.sqft).toFixed(1) : '—'}
                </div>
                <div className="text-[10px] text-primary/70">{t('map.pricePerSqm', 'per m²')}</div>
              </div>
            </div>
          ) : (
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
          )}

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
          <div className="flex flex-col">
            {priceInfo.hasReduction && (
              <span className="text-neutral-400 text-xs line-through">
                {formatPrice(priceInfo.originalPrice, property.country)}
              </span>
            )}
            <p className={`font-bold text-base ${priceInfo.hasReduction ? 'text-green-600' : 'text-primary'}`}>
              {formatPrice(priceInfo.currentPrice, property.country)}
              {priceInfo.hasReduction && (
                <span className="ml-1 text-xs font-bold">-{priceInfo.discountPercentage}%</span>
              )}
            </p>
          </div>
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 capitalize">
            {property.propertyType}
          </span>
        </div>
      </div>

      {/* Address */}
      <p className="text-xs text-neutral-600 mb-2 line-clamp-1">
        {property.address}, {property.city}
      </p>

      {/* Essential information - different for land vs residential */}
      {property.propertyType === 'land' ? (
        <div className="grid grid-cols-2 gap-1.5 mb-2 text-center">
          <div className="bg-amber-50 rounded py-2">
            <div className="font-bold text-base text-amber-800">{property.sqft?.toLocaleString()}</div>
            <div className="text-xs text-amber-600">{t('map.area', 'Area')} (m²)</div>
          </div>
          <div className="bg-neutral-50 rounded py-2">
            <div className="font-bold text-sm text-neutral-700">
              €{property.sqft > 0 ? (property.price / property.sqft).toFixed(1) : '—'}
            </div>
            <div className="text-xs text-neutral-500">{t('map.pricePerSqm', 'per m²')}</div>
          </div>
        </div>
      ) : (
        <>
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

          {/* Additional features - only for residential */}
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
        </>
      )}

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
 * Supports night mode with glowing neon-style markers.
 */
interface MarkersProps {
  properties: Property[];
  onPopupClick: (id: string) => void;
  hoveredPropertyId?: string | null;
  isNightMode?: boolean;
}

export const Markers: React.FC<MarkersProps> = ({ properties, onPopupClick, hoveredPropertyId, isNightMode = false }) => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const markerRefsMap = React.useRef<Map<string, L.Marker>>(new Map());

  useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });

  // Update marker icon when hover state or night mode changes
  React.useEffect(() => {
    properties.forEach((prop) => {
      const marker = markerRefsMap.current.get(prop.id);
      if (marker) {
        const isHovered = prop.id === hoveredPropertyId;
        const newIcon = createCustomMarkerIcon(prop, zoom, isHovered, isNightMode);
        marker.setIcon(newIcon);
      }
    });
  }, [hoveredPropertyId, zoom, properties, isNightMode]);

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
            icon={createCustomMarkerIcon(prop, zoom, prop.id === hoveredPropertyId, isNightMode)}
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
              className={`${isPromoted ? 'promoted-property-popup' : ''} ${isNightMode ? 'night-mode-popup' : ''}`}
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
 * Premium = Gold (1st), Highlight = Light Blue (2nd), Featured = Dark Purple (3rd)
 */
const PROMOTION_TIER_COLORS = {
  premium: '#FFB800',   // Rich Gold for Premium Premiere (TOP tier)
  highlight: '#0EA5E9', // Light Blue/Sky for Highlight (2nd tier)
  featured: '#7C3AED',  // Dark Purple/Violet for Featured (3rd tier)
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
 * Supports night mode styling for dark map theme.
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

      {/* Promotion Tiers Separator */}
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

      {/* Heat Map Legend - Only in Night Mode */}
      {isNightMode && (
        <div className="border-t border-slate-700 pt-2 mt-2">
          <h5 className="text-xs font-bold text-slate-400 mb-1.5">
            {t('map.heatMapLegend', 'Property Density')}
          </h5>
          <div className="flex items-center gap-1">
            <div className="h-2 flex-1 rounded-full bg-gradient-to-r from-cyan-400 via-yellow-400 to-red-500" />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[9px] text-slate-500">{t('map.low', 'Low')}</span>
            <span className="text-[9px] text-slate-500">{t('map.high', 'High')}</span>
          </div>
        </div>
      )}
    </div>
  );
};
