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
import { validateCoordinates } from '@/shared/utils/validation';
import { getVillaMarkerPalette, buildLuxuryVillaMarkerHTML } from '@/shared/map/villaMarker';
import { formatCityPlace } from '@/shared/geo';

/**
 * A property is mappable only when it carries coordinates that are real
 * numbers inside the valid lat/lng ranges. Guards against corrupt API rows
 * (null island, out-of-range, NaN) placing markers in the ocean.
 */
const hasValidCoordinates = (prop: Property): prop is Property & { lat: number; lng: number } => {
  if (prop.lat == null || prop.lng == null) return false;
  return validateCoordinates(prop.lat, prop.lng).isValid;
};

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

    /* Urgent Badge - Red pulsing glow for urgent properties */
    @keyframes glowUrgent {
      0%, 100% {
        filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.8)) drop-shadow(0 0 12px rgba(220, 38, 38, 0.5));
      }
      50% {
        filter: drop-shadow(0 0 14px rgba(248, 113, 113, 0.95)) drop-shadow(0 0 22px rgba(239, 68, 68, 0.7));
      }
    }

    /* Border pulse animation for Urgent */
    @keyframes borderPulseUrgent {
      0%, 100% {
        stroke-width: 3;
        stroke: #EF4444;
      }
      50% {
        stroke-width: 5;
        stroke: #F87171;
      }
    }

    /* Urgent marker - Red glow with bouncing effect */
    .promoted-marker-inner-urgent {
      animation: markerBounce 1.8s ease-in-out infinite, glowUrgent 1.5s ease-in-out infinite;
      transform-origin: center bottom;
    }
    .promoted-marker-inner-urgent svg circle,
    .promoted-marker-inner-urgent svg path:last-of-type,
    .promoted-marker-inner-urgent svg rect {
      animation: borderPulseUrgent 1.5s ease-in-out infinite;
    }

    /* ---- Marker entrance fly-in animation after splash screen ---- */
    @keyframes markerFlyIn {
      0% {
        opacity: 0;
        transform: translate(var(--fly-x, 0px), var(--fly-y, -300px)) scale(0.2) rotate(var(--fly-r, 0deg));
      }
      35% {
        opacity: 1;
      }
      65% {
        transform: translate(0px, -10px) scale(1.15) rotate(0deg);
      }
      82% {
        transform: translate(0px, 4px) scale(0.96) rotate(0deg);
      }
      100% {
        opacity: 1;
        transform: translate(0px, 0px) scale(1) rotate(0deg);
      }
    }

    .marker-entrance-fly {
      will-change: transform, opacity;
      animation: markerFlyIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
      animation-delay: var(--fly-delay, 0ms);
    }

    /* Google Maps marker entrance animation */
    @keyframes gmarkerFlyIn {
      0% {
        opacity: 0;
        transform: translate(var(--fly-x, 0px), var(--fly-y, -300px)) scale(0.2) rotate(var(--fly-r, 0deg));
      }
      35% {
        opacity: 1;
      }
      65% {
        transform: translate(0px, -8px) scale(1.18) rotate(0deg);
      }
      82% {
        transform: translate(0px, 3px) scale(0.95) rotate(0deg);
      }
      100% {
        opacity: 1;
        transform: translate(0px, 0px) scale(1) rotate(0deg);
      }
    }

    .gmarker-entrance-fly {
      will-change: transform, opacity;
      animation: gmarkerFlyIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) both !important;
      animation-delay: var(--fly-delay, 0ms) !important;
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
 * Markers maintain good visibility at all zoom levels
 */
const getMarkerScaleForZoom = (zoom: number): number => {
  // Keep markers visible at all zoom levels
  // Slightly larger when zoomed in for better visibility
  if (zoom >= 16) return 1.1;     // 110% at zoom 16+ (street level)
  if (zoom >= 14) return 1.0;     // 100% at zoom 14-15
  if (zoom >= 12) return 0.95;    // 95% at zoom 12-13
  if (zoom >= 10) return 0.9;     // 90% at zoom 10-11
  if (zoom >= 8) return 0.85;     // 85% at zoom 8-9
  return 0.8;                      // 80% at zoom 7 and below
};

const PROPERTY_TYPE_COLORS: Record<
  NonNullable<Property['propertyType']> | 'other',
  string
> = {
  house: '#0252CD',
  apartment: '#28a745',
  villa: '#6f42c1',
  'luxury-villa': '#FFA500', // Amber/gold — exclusive to the Luxury Villas tab
  commercial: '#E11D48', // Rose — business premises
  parking: '#475569',    // Slate — reads like parking signage
  land: '#8B4513',    // Brown for land
  other: '#0D9488',   // Teal — friendlier than the old gray, distinct from the other types
};

// Luxury villa marker builder is shared with the Google marker
// (src/features/map/components/useGoogleMap.ts) via @/shared/map/villaMarker.

/**
 * Format price for marker display (short format)
 * Adds rental period suffix for rental properties
 */
const formatMarkerPrice = (property: Property): string => {
  if (property.isNegotiable) {
    return 'Negotiable';
  }
  const price = property.price;
  let formatted: string;
  if (price >= 1000000) {
    const millions = price / 1000000;
    // Use integer if it's a whole number, otherwise 1 decimal
    if (millions >= 10) {
      formatted = `€${Math.round(millions)}M`;
    } else {
      formatted = `€${millions.toFixed(1).replace('.0', '')}M`;
    }
  } else if (price >= 1000) {
    formatted = `€${Math.round(price / 1000)}K`;
  } else {
    formatted = `€${price}`;
  }

  // Add rental period suffix
  if ((property.listingType || 'sale') === 'rent') {
    const suffix = property.rentPeriod === 'weekly' ? '/wk' : property.rentPeriod === 'daily' ? '/d' : '/mo';
    formatted += suffix;
  }

  return formatted;
};

/**
 * Get marker width based on price text length
 */
const getMarkerWidthForPrice = (price: string): number => {
  // Base padding on each side (left + right)
  const horizontalPadding = 20;
  // Approximate width per character (using Inter font at 11px)
  const charWidth = 7;
  // Calculate width based on text length + padding
  return Math.max(44, (price.length * charWidth) + horizontalPadding);
};

/**
 * Get animation class for promoted property markers (inner element)
 * Urgent badges take priority for the red pulsing effect
 */
const getPromotedMarkerInnerClass = (property: Property): string => {
  // Urgent badge takes priority - shows red pulsing regardless of promotion status
  if (property.hasUrgentBadge) {
    return 'promoted-marker-inner-urgent';
  }

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
  const price = formatMarkerPrice(property);
  const color = PROPERTY_TYPE_COLORS[property.propertyType] || PROPERTY_TYPE_COLORS.other;
  const zoomScale = getMarkerScaleForZoom(zoom);

  // Check if property is actively promoted
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  // Get ring color based on urgent badge, promotion tier, or property type
  // Urgent = Red, Premium = Gold (1st), Highlight = Light Blue (2nd), Featured = Dark Purple (3rd)
  let ringColor = 'none';
  let ringWidth = 2;

  // Urgent badge takes priority - red ring
  if (property.hasUrgentBadge) {
    ringColor = '#EF4444'; // Red for urgent properties
    ringWidth = isHovered ? 4 : 3;
  } else if (isActivelyPromoted) {
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

  // Night mode: Promoted properties and urgent badges get glow effect
  const shouldGlow = isNightMode && (isActivelyPromoted || property.hasUrgentBadge);
  // Use red glow for urgent badges, cyan for promoted
  const nightModeGlow = property.hasUrgentBadge
    ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8)) drop-shadow(0 0 16px rgba(220, 38, 38, 0.5)) drop-shadow(0 0 24px rgba(185, 28, 28, 0.3))'
    : 'drop-shadow(0 0 8px rgba(0, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(0, 200, 255, 0.5)) drop-shadow(0 0 24px rgba(0, 150, 255, 0.3))';
  const baseFilter = shouldGlow
    ? nightModeGlow
    : 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))';

  // In night mode, use brighter colors but no special stroke for non-promoted
  const markerColor = isNightMode ? lightenColor(color, 20) : color;
  const strokeColorFinal = ringColor !== 'none' ? ringColor : '#FFFFFF';

  const promotedInnerClass = getPromotedMarkerInnerClass(property);
  const nightModeClass = shouldGlow ? 'night-mode-marker-pulse' : '';

  // Luxury villa: rich metallic gold gradient pill — stands out as premium on any map
  const isLuxuryVilla = property.propertyType === 'luxury-villa';
  const displayPrice = isLuxuryVilla ? `✦ ${price}` : price;
  const pillFilter = isLuxuryVilla
    ? 'drop-shadow(0 0 7px rgba(212,168,0,0.85)) drop-shadow(0 0 14px rgba(200,140,0,0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.4))'
    : baseFilter;

  // Calculate dimensions based on price length - use pill shape for longer prices
  const baseWidth = getMarkerWidthForPrice(displayPrice);
  const baseHeight = 28;
  const scaledWidth = Math.round(baseWidth * zoomScale);
  const scaledHeight = Math.round(baseHeight * zoomScale);
  const fontSize = Math.max(9, Math.round(11 * zoomScale));
  const borderRadius = scaledHeight / 2; // Pill shape
  const hoverScale = isHovered ? 1.15 : 1;

  const hoverClass = isHovered ? 'drop-shadow-lg' : '';

  // Luxury villa: branded pin (crown = signature, star = actively promoted)
  if (isLuxuryVilla) {
    const scaledW = Math.round(24 * zoomScale);
    const scaledH = Math.round(40 * zoomScale); // price label + pin
    const uid = `s${String(property.id).slice(-6)}`;
    const pal = getVillaMarkerPalette(property.listingType);
    const markerHtml = buildLuxuryVillaMarkerHTML(price, uid, pal, isActivelyPromoted ? 'star' : 'crown', 24);
    const svgHouseHtml = `
      <div class="promoted-marker-wrapper ${nightModeClass}" style="width:${scaledW}px;height:${scaledH}px;">
        <div class="${promotedInnerClass}" style="width:${scaledW}px;height:${scaledH}px;transform:scale(${hoverScale});transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);">
          ${markerHtml}
        </div>
      </div>
    `;
    return L.divIcon({
      html: svgHouseHtml,
      className: hoverClass,
      iconSize: [scaledW, scaledH],
      iconAnchor: [scaledW / 2, scaledH], // anchor at pointer tip
      popupAnchor: [0, -scaledH],
    });
  }

  // Build SVG pill for all other property types
  const pillFill    = markerColor;
  const pillText    = 'white';
  const pillStroke  = strokeColorFinal;
  const pillStrokeW = ringWidth;

  // Wrap SVG in a container - the outer div stays in place, the inner div animates
  const svgHtml = `
    <div class="promoted-marker-wrapper ${nightModeClass}" style="width: ${scaledWidth}px; height: ${scaledHeight}px;">
      <div class="${promotedInnerClass}" style="width: ${scaledWidth}px; height: ${scaledHeight}px; transform: scale(${hoverScale}); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <svg width="${scaledWidth}" height="${scaledHeight}" viewBox="0 0 ${baseWidth} ${baseHeight}" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: ${pillFilter};">
            <rect x="${pillStrokeW / 2}" y="${pillStrokeW / 2}" width="${baseWidth - pillStrokeW}" height="${baseHeight - pillStrokeW}" rx="${(baseHeight - pillStrokeW) / 2}" fill="${pillFill}" stroke="${pillStroke}" stroke-width="${pillStrokeW}"/>
            <text x="${baseWidth / 2}" y="${baseHeight / 2 + 1}" font-family="Inter, sans-serif" font-size="${11}" font-weight="800" fill="${pillText}" text-anchor="middle" dominant-baseline="middle">${price}</text>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: hoverClass,
    iconSize: [scaledWidth, scaledHeight],
    iconAnchor: [scaledWidth / 2, scaledHeight / 2],
    popupAnchor: [0, -scaledHeight / 2],
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
const createDetailedMarkerIcon = (property: Property, isHovered: boolean = false, isNightMode: boolean = false, zoom: number = 12) => {
  const price = formatMarkerPrice(property);
  const color = PROPERTY_TYPE_COLORS[property.propertyType] || PROPERTY_TYPE_COLORS.other;
  const zoomScale = getMarkerScaleForZoom(zoom);

  // Check if property is actively promoted
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  // Get stroke color based on urgent badge, promotion tier, or property type
  // Urgent = Red, Premium = Gold (1st), Highlight = Light Blue (2nd), Featured = Dark Purple (3rd)
  let strokeColor = '#FFFFFF';
  let strokeWidth = 2;

  // Urgent badge takes priority - red stroke
  if (property.hasUrgentBadge) {
    strokeColor = '#EF4444'; // Red for urgent properties
    strokeWidth = isHovered ? 4 : 3;
  } else if (isActivelyPromoted) {
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

  // Night mode: Promoted properties and urgent badges get glow effect
  const shouldGlow = isNightMode && (isActivelyPromoted || property.hasUrgentBadge);
  // Use red glow for urgent badges, cyan for promoted
  const nightModeGlow = property.hasUrgentBadge
    ? 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.9)) drop-shadow(0 0 20px rgba(220, 38, 38, 0.6)) drop-shadow(0 0 30px rgba(185, 28, 28, 0.4))'
    : 'drop-shadow(0 0 10px rgba(0, 255, 255, 0.9)) drop-shadow(0 0 20px rgba(0, 200, 255, 0.6)) drop-shadow(0 0 30px rgba(0, 150, 255, 0.4))';
  const baseFilter = shouldGlow
    ? nightModeGlow
    : 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))';

  // In night mode, use brighter colors but no special stroke for non-promoted
  const markerColor = isNightMode ? lightenColor(color, 20) : color;
  const strokeColorFinal = strokeColor;
  const pointerColor = isNightMode ? '#001a33' : '#003A96';

  const scale = isHovered ? 1.25 : 1;
  const promotedInnerClass = getPromotedMarkerInnerClass(property);

  // Luxury villa: rich metallic gold house marker — unmistakably premium
  const isLuxuryVilla = property.propertyType === 'luxury-villa';
  const finalPointerColor = isLuxuryVilla ? '#5C3A00' : pointerColor;
  const finalTextColor    = isLuxuryVilla ? '#2C1A00' : 'white';
  const finalStrokeColor  = isLuxuryVilla ? '#7A5000' : strokeColorFinal;
  const finalStrokeWidth  = isLuxuryVilla ? 2 : strokeWidth;
  const finalFilter = isLuxuryVilla
    ? `drop-shadow(0 0 10px rgba(212,168,0,0.9)) drop-shadow(0 0 20px rgba(200,140,0,0.5)) drop-shadow(0 4px 10px rgba(0,0,0,0.4))`
    : baseFilter;
  const nightModeClass = shouldGlow ? 'night-mode-marker-pulse' : '';
  const hoverClass = isHovered ? 'drop-shadow-xl' : '';

  // Luxury villa: branded pin (crown = signature, star = actively promoted)
  if (isLuxuryVilla) {
    const scaledW = Math.round(28 * zoomScale);
    const scaledH = Math.round(45 * zoomScale); // price label + pin
    const uid = `d${String(property.id).slice(-6)}`;
    const pal = getVillaMarkerPalette(property.listingType);
    const markerHtml = buildLuxuryVillaMarkerHTML(price, uid, pal, isActivelyPromoted ? 'star' : 'crown', 28);
    const svgVillaHtml = `
      <div class="promoted-marker-wrapper ${nightModeClass}" style="width:${scaledW}px;height:${scaledH}px;">
        <div class="${promotedInnerClass}" style="width:${scaledW}px;height:${scaledH}px;transform-origin:bottom center;transform:scale(${scale});transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);">
          ${markerHtml}
        </div>
      </div>
    `;
    return L.divIcon({
      html: svgVillaHtml,
      className: hoverClass,
      iconSize: [scaledW, scaledH],
      iconAnchor: [scaledW / 2, scaledH], // anchor at pointer tip
      popupAnchor: [0, -scaledH],
    });
  }

  // Standard house-pin marker for all other property types
  const baseWidth = 52;
  const baseHeight = 42;
  const scaledWidth = Math.round(baseWidth * zoomScale);
  const scaledHeight = Math.round(baseHeight * zoomScale);
  const fontSize = Math.max(11, Math.round(14 * zoomScale));

  // Wrap SVG in a container - the outer div stays in place, the inner div animates
  const svgHtml = `
    <div class="promoted-marker-wrapper ${nightModeClass}" style="width: ${scaledWidth}px; height: ${scaledHeight}px;">
      <div class="${promotedInnerClass}" style="width: ${scaledWidth}px; height: ${scaledHeight}px;">
        <svg width="${scaledWidth}" height="${scaledHeight}" viewBox="0 0 70 56" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: ${finalFilter}; transform-origin: bottom center; transform: scale(${scale}); transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <path d="M35 56L25 44H45L35 56Z" fill="${finalPointerColor}" />
            <path d="M65 24.5V44H5V24.5L35 5L65 24.5Z" fill="${markerColor}" stroke="${strokeColorFinal}" stroke-width="${strokeWidth}" />
            <text x="35" y="30" font-family="Inter, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${price}</text>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: hoverClass,
    iconSize: [scaledWidth, scaledHeight],
    iconAnchor: [scaledWidth / 2, scaledHeight],
    popupAnchor: [0, -scaledHeight],
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
  return createDetailedMarkerIcon(property, isHovered, isNightMode, zoom);
};

/**
 * Wrap a Leaflet divIcon with an entrance fly-in animation wrapper.
 * Each marker flies in from a unique direction using golden-angle distribution
 * for a visually appealing starburst scatter-gather effect.
 */
const wrapIconWithEntrance = (icon: L.DivIcon, index: number, total: number): L.DivIcon => {
  // Golden angle distribution for even spread of directions
  const goldenAngle = 137.508 * (Math.PI / 180);
  const angle = index * goldenAngle;
  const distance = 400 + (index % 7) * 80;
  const flyX = Math.round(Math.cos(angle) * distance);
  const flyY = Math.round(Math.sin(angle) * distance);
  const flyR = Math.round(Math.cos(angle * 2) * 25);
  // Stagger: cap total cascade at 2s regardless of marker count
  const maxStagger = 2000;
  const delay = total > 1 ? Math.round((index / (total - 1)) * maxStagger) : 0;

  const opts = icon.options;
  const wrappedHtml = `<div class="marker-entrance-fly" style="--fly-x:${flyX}px;--fly-y:${flyY}px;--fly-r:${flyR}deg;--fly-delay:${delay}ms">${opts.html || ''}</div>`;

  return L.divIcon({
    html: wrappedHtml,
    className: opts.className,
    iconSize: opts.iconSize,
    iconAnchor: opts.iconAnchor,
    popupAnchor: opts.popupAnchor,
  });
};

// Tier badge configurations for popup
// Premium = Gold (1st), Highlight = Light Blue (2nd), Featured = Dark Purple (3rd)
const POPUP_TIER_CONFIG: Record<string, { bg: string; border: string; icon: string }> = {
  premium: { bg: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400', border: 'border-amber-400', icon: '👑' },
  highlight: { bg: 'bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400', border: 'border-sky-400', icon: '💎' },
  featured: { bg: 'bg-gradient-to-r from-violet-600 via-purple-500 to-violet-400', border: 'border-violet-500', icon: '⭐' },
  standard: { bg: 'bg-gradient-to-r from-gray-500 to-gray-600', border: 'border-gray-300', icon: '✨' },
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
  const { t } = useTranslation(['property', 'common']);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const isRental = (property.listingType || 'sale') === 'rent';

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

  // Enhanced popup for promoted properties - compact design
  // Responsive: smaller on mobile
  if (isActivelyPromoted) {
    return (
      <div
        className="cursor-pointer rounded-xl overflow-hidden border-2 bg-white"
        style={{ width: '192px', maxWidth: '192px' }}
        onClick={() => onPopupClick(property.id)}
      >
        {/* Image carousel - fixed container */}
        <div className="relative w-full" style={{ height: '112px' }}>
          <div className="absolute inset-0 overflow-hidden">
            {images.map((imgUrl, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {imageErrors.has(index) ? (
                  <div className="w-full h-full bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 flex items-center justify-center">
                    <BuildingOfficeIcon className="w-10 h-10 text-neutral-400" />
                  </div>
                ) : (
                  <img
                    src={imgUrl}
                    alt={`${property.title || property.address} - ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => handleImageError(index)}
                  />
                )}
              </div>
            ))}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Promotion tier badge - smaller */}
          <div className={`absolute top-1.5 left-1.5 ${tierConfig.bg} text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 z-10`}>
            <span className="text-[10px]">{tierConfig.icon}</span>
            {t(`map.popup.tierLabels.${promotionTier}`)}
          </div>

          {/* Image navigation - smaller */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-neutral-700 rounded-full w-5 h-5 flex items-center justify-center transition-colors shadow text-xs z-10"
              >
                ‹
              </button>
              <button
                onClick={nextImage}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-neutral-700 rounded-full w-5 h-5 flex items-center justify-center transition-colors shadow text-xs z-10"
              >
                ›
              </button>

              {/* Image dots indicator */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(index);
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      index === currentImageIndex
                        ? 'bg-white w-3'
                        : 'bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content section - compact */}
        <div className="p-2">
          {/* Price row */}
          <div className="flex items-center justify-between mb-1.5">
            <span className={`font-bold px-2 py-0.5 rounded-md text-sm shadow-sm text-white ${
              priceInfo.hasReduction
                ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                : 'bg-gradient-to-r from-primary to-primary-dark'
            }`}>
              {formatPrice(priceInfo.currentPrice, property.country)}
              {isRental && <span className="text-[9px] font-normal opacity-80">/{property.rentPeriod === 'weekly' ? t('common:wk', 'wk') : property.rentPeriod === 'daily' ? t('common:day', 'day') : t('common:mo', 'mo')}</span>}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 capitalize">
              {property.propertyType}
            </span>
          </div>

          {/* Title */}
          {property.title && (
            <p className="font-semibold text-xs text-neutral-800 mb-1 line-clamp-1">
              {property.title}
            </p>
          )}

          {/* Location */}
          <p className="text-[10px] text-neutral-500 mb-1.5 line-clamp-1">
            {formatCityPlace(property.city, property.country).full}
          </p>

          {/* Property stats - compact */}
          {property.propertyType === 'land' ? (
            <div className="flex items-center gap-2 text-[10px] text-neutral-600 mb-1.5">
              <span className="font-semibold">{property.sqft?.toLocaleString()} m²</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] text-neutral-600 mb-1.5">
              <span><b>{property.beds}</b> {t('map.popup.bed')}</span>
              <span><b>{property.baths}</b> {t('map.popup.bath')}</span>
              <span><b>{property.sqft}</b> m²</span>
            </div>
          )}

          {/* CTA */}
          <div className="text-center py-1.5 rounded-lg bg-primary/10">
            <span className="text-[10px] font-semibold text-primary">{t('map.clickForDetails')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Standard popup - modern clean design, compact for mobile
  return (
    <div
      className="cursor-pointer rounded-xl overflow-hidden bg-white"
      style={{
        width: '180px',
        maxWidth: '180px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
      onClick={() => onPopupClick(property.id)}
    >
      {/* Image section - fixed container */}
      <div className="relative w-full" style={{ height: '100px' }}>
        <div className="absolute inset-0 overflow-hidden">
          {imageErrors.has(0) ? (
            <div className="w-full h-full bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 flex items-center justify-center">
              <BuildingOfficeIcon className="w-10 h-10 text-neutral-400" />
            </div>
          ) : (
            <img
              src={images[0]}
              alt={property.address}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => handleImageError(0)}
            />
          )}
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* Property type badge - smaller on mobile */}
        <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/95 text-neutral-700 capitalize shadow-sm z-10">
          {property.propertyType}
        </span>

        {/* Price on image */}
        <div className="absolute bottom-1.5 left-1.5 z-10">
          <p className="font-bold text-white text-sm drop-shadow-lg">
            {formatPrice(priceInfo.currentPrice, property.country)}
            {isRental && <span className="text-[10px] font-normal opacity-80">/{property.rentPeriod === 'weekly' ? t('common:wk', 'wk') : property.rentPeriod === 'daily' ? t('common:day', 'day') : t('common:mo', 'mo')}</span>}
          </p>
        </div>
      </div>

      {/* Content section - compact */}
      <div className="p-2">
        {/* Title */}
        <h3 className="font-bold text-xs text-neutral-900 line-clamp-1 mb-0.5">
          {property.title || property.address}
        </h3>

        {/* Location */}
        <p className="text-[10px] text-neutral-500 mb-1.5 line-clamp-1">
          {formatCityPlace(property.city, property.country).full}
        </p>

        {/* Specs row with icons - compact */}
        {property.propertyType === 'land' ? (
          <div className="flex items-center gap-1 text-[10px] text-neutral-600 mb-2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="font-semibold">{property.sqft?.toLocaleString()}</span>
            <span>m²</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[10px] text-neutral-600 mb-2">
            <div className="flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-semibold">{property.beds}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              <span className="font-semibold">{property.baths}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span className="font-semibold">{property.sqft}</span>
            </div>
          </div>
        )}

        {/* CTA Button - touch-friendly */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPopupClick(property.id);
          }}
          className="w-full py-1.5 rounded-lg bg-primary hover:bg-primary-dark active:bg-primary-dark text-white text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 touch-manipulation"
        >
          <span>{t('map.popup.viewDetails')}</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
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

// Compute small offsets for properties sharing the same coordinates
// so they don't stack on top of each other. Uses circular distribution.
const computeColocatedOffsets = (properties: Property[]): Map<string, [number, number]> => {
  const offsets = new Map<string, [number, number]>();
  const PRECISION = 5; // ~1.1m precision for grouping
  const OFFSET_RADIUS = 0.00015; // ~17m offset radius

  // Group properties by rounded lat/lng
  const groups = new Map<string, Property[]>();
  for (const prop of properties) {
    if (!hasValidCoordinates(prop)) continue;
    const key = `${prop.lat.toFixed(PRECISION)},${prop.lng.toFixed(PRECISION)}`;
    const group = groups.get(key);
    if (group) {
      group.push(prop);
    } else {
      groups.set(key, [prop]);
    }
  }

  // Apply circular offsets for groups with multiple properties
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const angleStep = (2 * Math.PI) / group.length;
    for (let i = 0; i < group.length; i++) {
      const angle = i * angleStep;
      const latOffset = OFFSET_RADIUS * Math.cos(angle);
      const lngOffset = OFFSET_RADIUS * Math.sin(angle);
      offsets.set(group[i].id, [latOffset, lngOffset]);
    }
  }

  return offsets;
};

const MarkersComponent: React.FC<MarkersProps> = ({ properties, onPopupClick, hoveredPropertyId, isNightMode = false }) => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const markerRefsMap = React.useRef<Map<string, L.Marker>>(new Map());
  const prevHoveredIdRef = React.useRef<string | null | undefined>(null);
  const prevZoomRef = React.useRef<number>(zoom);
  const prevNightModeRef = React.useRef<boolean>(isNightMode);

  // Entrance animation: check if splash screen just completed
  const [animateEntrance, setAnimateEntrance] = useState(() => {
    const splashDone = (window as any).__balkanestateSplashDone;
    return !!(splashDone && Date.now() - splashDone < 5000);
  });
  const entranceAnimatingRef = React.useRef(animateEntrance);

  // Clear entrance animation flag after all fly-in animations complete
  useEffect(() => {
    if (!animateEntrance) return;
    entranceAnimatingRef.current = true;
    const timer = setTimeout(() => {
      setAnimateEntrance(false);
      entranceAnimatingRef.current = false;
      delete (window as any).__balkanestateSplashDone;
    }, 3500);
    return () => clearTimeout(timer);
  }, [animateEntrance]);

  useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });

  // Update marker icon only when hover state, zoom, or night mode actually changes
  React.useEffect(() => {
    const hoverChanged = prevHoveredIdRef.current !== hoveredPropertyId;
    const zoomChanged = prevZoomRef.current !== zoom;
    const nightModeChanged = prevNightModeRef.current !== isNightMode;

    if (!hoverChanged && !zoomChanged && !nightModeChanged) return;

    // Skip hover-only icon updates during entrance animation to avoid interrupting fly-in
    if (entranceAnimatingRef.current && hoverChanged && !zoomChanged && !nightModeChanged) {
      prevHoveredIdRef.current = hoveredPropertyId;
      return;
    }

    // Only update affected markers for hover changes (performance optimization)
    if (hoverChanged && !zoomChanged && !nightModeChanged) {
      // Update previously hovered marker
      if (prevHoveredIdRef.current) {
        const prevMarker = markerRefsMap.current.get(prevHoveredIdRef.current);
        const prevProp = properties.find(p => p.id === prevHoveredIdRef.current);
        if (prevMarker && prevProp) {
          prevMarker.setIcon(createCustomMarkerIcon(prevProp, zoom, false, isNightMode));
        }
      }
      // Update newly hovered marker
      if (hoveredPropertyId) {
        const newMarker = markerRefsMap.current.get(hoveredPropertyId);
        const newProp = properties.find(p => p.id === hoveredPropertyId);
        if (newMarker && newProp) {
          newMarker.setIcon(createCustomMarkerIcon(newProp, zoom, true, isNightMode));
        }
      }
    } else {
      // Full update for zoom or night mode changes
      markerRefsMap.current.forEach((marker, id) => {
        const prop = properties.find(p => p.id === id);
        if (prop) {
          const isHovered = id === hoveredPropertyId;
          marker.setIcon(createCustomMarkerIcon(prop, zoom, isHovered, isNightMode));
        }
      });
    }

    prevHoveredIdRef.current = hoveredPropertyId;
    prevZoomRef.current = zoom;
    prevNightModeRef.current = isNightMode;
  }, [hoveredPropertyId, zoom, isNightMode, properties]);

  // Helper to check if property is actively promoted
  const isPropertyPromoted = (prop: Property) =>
    prop.isPromoted && prop.promotionEndDate && prop.promotionEndDate > Date.now();

  // Compute offsets for co-located properties
  const colocatedOffsets = useMemo(() => computeColocatedOffsets(properties), [properties]);

  return (
    <>
      {properties.map((prop, idx) => {
        // Skip properties without valid, in-range coordinates
        if (!hasValidCoordinates(prop)) {
          return null;
        }
        const isPromoted = isPropertyPromoted(prop);
        const baseIcon = createCustomMarkerIcon(prop, zoom, prop.id === hoveredPropertyId, isNightMode);
        const icon = animateEntrance
          ? wrapIconWithEntrance(baseIcon, idx, properties.length)
          : baseIcon;
        const offset = colocatedOffsets.get(prop.id);
        const markerLat = offset ? prop.lat + offset[0] : prop.lat;
        const markerLng = offset ? prop.lng + offset[1] : prop.lng;
        return (
          <Marker
            key={prop.id}
            position={[markerLat, markerLng]}
            icon={icon}
            ref={(marker) => {
              if (marker) {
                markerRefsMap.current.set(prop.id, marker);
              }
            }}
            zIndexOffset={isPromoted ? 1000 : 0} // Promoted markers appear on top
          >
            <Popup
              maxWidth={isPromoted ? 200 : 170}
              minWidth={isPromoted ? 150 : 130}
              className={`property-popup ${isPromoted ? 'promoted-property-popup' : 'standard-property-popup'} ${isNightMode ? 'night-mode-popup' : ''}`}
              autoPan={true}
              autoPanPadding={[30, 50]}
              keepInView={true}
            >
              <PropertyPopup property={prop} onPopupClick={onPopupClick} />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export const Markers = React.memo(MarkersComponent);

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
    <div
      className="px-4 py-3 rounded-2xl shadow-xl border border-white/30"
      style={{
        background: isNightMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      }}
    >
      {/* Property Types - Single column for clarity */}
      <div className="flex flex-col gap-2">
        {Object.entries(PROPERTY_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2.5">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className={`text-xs font-medium whitespace-nowrap ${isNightMode ? 'text-slate-200' : 'text-neutral-700'}`}>
              {t(`map.propertyTypes.${type}`)}
            </span>
          </div>
        ))}

        {/* Urgent Badge indicator */}
        <div className="flex items-center gap-2.5 pt-1 mt-1 border-t border-neutral-200/50">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
            style={{ backgroundColor: '#EF4444', boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)' }}
          />
          <span className={`text-xs font-medium whitespace-nowrap ${isNightMode ? 'text-slate-200' : 'text-neutral-700'}`}>
            {t('map.propertyTypes.urgent', 'Urgent')}
          </span>
        </div>
      </div>
    </div>
  );
};
