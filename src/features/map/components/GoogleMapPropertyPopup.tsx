/**
 * GoogleMapPropertyPopup - Compact mini card popup for property markers
 * Extracted from GoogleMapComponent.tsx
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { formatPrice } from '@/utils/currency';
import { PROMOTION_TIER_COLORS } from './googleMapConstants';

interface GoogleMapPropertyPopupProps {
  property: Property;
  onClose: () => void;
  onViewDetails: () => void;
  /** Distance from the user's current location, pre-formatted (e.g. "3.2 km"). */
  distanceLabel?: string | null;
  /** Whether the card opens above ('top') or below ('bottom') the marker. */
  placement?: 'top' | 'bottom';
  /** Horizontal offset (px) applied to the pointer tail so it points at the marker. */
  tailOffsetX?: number;
}

const GoogleMapPropertyPopup: React.FC<GoogleMapPropertyPopupProps> = ({ property, onClose, onViewDetails, distanceLabel, placement = 'top', tailOffsetX = 0 }) => {
  const { t } = useTranslation(['property']);
  const imageUrl = property.images?.[0]
    ? (typeof property.images[0] === 'string' ? property.images[0] : property.images[0].url)
    : property.imageUrl;

  const [imageLoaded, setImageLoaded] = useState(false);

  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  // Format property type display
  const propertyTypeDisplay = property.propertyType
    ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)
    : 'Property';

  return (
    <div
      className="animate-map-popup-in bg-white rounded-2xl shadow-xl ring-1 ring-black/5 border border-gray-100/50 relative"
      style={{ width: 248, maxWidth: '88vw' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Pointer tail toward the marker (flips to the top when card opens below) */}
      <div
        className={placement === 'bottom' ? 'map-popup-tail map-popup-tail-top' : 'map-popup-tail'}
        style={{ left: `calc(50% + ${tailOffsetX}px)` }}
        aria-hidden="true"
      />

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }}
        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-all duration-200 hover:rotate-90 hover:scale-110 active:scale-95 z-50"
        aria-label="Close popup"
      >
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image container */}
      <div className="relative h-32 rounded-t-2xl overflow-hidden bg-gray-200">
        {imageUrl ? (
          <>
            {/* Shimmer skeleton while the image loads */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-shimmer" />
            )}
            {/* Blurred fill — the same image scaled to cover, sitting behind the
                contained hero so letterbox bars are filled instead of empty. */}
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className={`absolute -inset-8 w-[calc(100%+4rem)] h-[calc(100%+4rem)] object-cover blur-xl animate-map-popup-kenburns transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
            {/* Foreground hero — object-contain so the whole building is visible. */}
            <img
              src={imageUrl}
              alt={property.title || property.address}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              className={`relative w-full h-full object-contain transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <span className="text-2xl opacity-50 animate-float">🏠</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent pointer-events-none" />

        {/* Promotion badge */}
        {isActivelyPromoted && property.promotionTier && (
          <div
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold text-white shadow backdrop-blur-sm animate-pulse-glow"
            style={{ backgroundColor: `${PROMOTION_TIER_COLORS[property.promotionTier]}ee` }}
          >
            {property.promotionTier === 'premium' ? '👑' :
             property.promotionTier === 'highlight' ? '💎' :
             property.promotionTier === 'featured' ? '⭐' : '✨'}
          </div>
        )}

        {/* Property type badge */}
        <div className="absolute bottom-1.5 right-1.5">
          <span className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-medium text-white">
            {propertyTypeDisplay}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Price */}
        <div className="map-popup-reveal map-popup-reveal-1 font-bold text-lg text-gray-900 mb-1 tracking-tight">
          {property.isNegotiable
            ? t('property:byNegotiation', 'By Negotiation')
            : formatPrice(property.price, property.country)}
        </div>

        {/* Location */}
        <p className="map-popup-reveal map-popup-reveal-2 text-[11px] text-gray-500 mb-2.5 truncate">
          📍 {property.city}, {property.country}
          {distanceLabel && (
            <span className="text-primary font-semibold"> · {t('map.popup.distanceFromYou', '{{distance}} away', { distance: distanceLabel })}</span>
          )}
        </p>

        {/* Property details - inline */}
        <div className="map-popup-reveal map-popup-reveal-3 flex items-center gap-2 mb-2.5 text-[11px] text-gray-600">
          {property.propertyType === 'land' ? (
            <span className="flex items-center gap-1 bg-gray-100 px-2 py-1.5 rounded-md transition-all duration-200 hover:bg-primary/10 hover:-translate-y-0.5">
              📐 <b>{property.sqft?.toLocaleString()}</b> m²
            </span>
          ) : (
            <>
              <span className="bg-gray-100 px-2 py-1.5 rounded-md transition-all duration-200 hover:bg-primary/10 hover:-translate-y-0.5">🛏 {property.beds || 0}</span>
              <span className="bg-gray-100 px-2 py-1.5 rounded-md transition-all duration-200 hover:bg-primary/10 hover:-translate-y-0.5">🚿 {property.baths || 0}</span>
              <span className="bg-gray-100 px-2 py-1.5 rounded-md transition-all duration-200 hover:bg-primary/10 hover:-translate-y-0.5">📐 {property.sqft || 0}</span>
            </>
          )}
        </div>

        {/* View details button */}
        <button
          onClick={onViewDetails}
          className="map-popup-cta map-popup-reveal map-popup-reveal-4 w-full py-2 bg-gradient-to-r from-primary to-blue-600 hover:shadow-lg hover:shadow-primary/30 text-white text-[13px] font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        >
          {t('map.popup.viewDetails', 'View')} <span className="map-popup-cta-arrow">→</span>
        </button>
      </div>
    </div>
  );
};

export default GoogleMapPropertyPopup;
