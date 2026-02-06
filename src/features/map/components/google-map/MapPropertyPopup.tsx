/**
 * Property Popup Component for Google Maps
 * Displays a compact mini card when clicking on a property marker
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { formatPrice } from '@/utils/currency';

// Promotion tier colors
const PROMOTION_TIER_COLORS: Record<string, string> = {
  premium: '#FFB800',
  highlight: '#0EA5E9',
  featured: '#7C3AED',
  standard: '#9ca3af',
};

interface MapPropertyPopupProps {
  property: Property;
  onClose: () => void;
  onViewDetails: () => void;
}

const MapPropertyPopup: React.FC<MapPropertyPopupProps> = ({ property, onClose, onViewDetails }) => {
  const { t } = useTranslation(['property']);
  const imageUrl = property.images?.[0]
    ? (typeof property.images[0] === 'string' ? property.images[0] : property.images[0].url)
    : property.imageUrl;

  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();

  // Format property type display
  const propertyTypeDisplay = property.propertyType
    ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)
    : 'Property';

  return (
    <div
      className="bg-white rounded-xl shadow-xl border border-gray-100/50 relative"
      style={{ width: 200, maxWidth: '85vw' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }}
        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors z-50"
        aria-label="Close popup"
      >
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image container */}
      <div className="relative h-24 rounded-t-xl overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={property.title || property.address}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <span className="text-2xl opacity-50">🏠</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Promotion badge */}
        {isActivelyPromoted && property.promotionTier && (
          <div
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold text-white shadow backdrop-blur-sm"
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
      <div className="p-2.5">
        {/* Price */}
        <div className="font-bold text-base text-gray-900 mb-0.5">
          {formatPrice(property.price, property.country)}
        </div>

        {/* Address */}
        <p className="text-[11px] text-gray-500 truncate mb-2">
          {property.address || property.city}
        </p>

        {/* Quick stats */}
        <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-2">
          {property.bedrooms !== undefined && (
            <span className="flex items-center gap-0.5">
              <span>🛏️</span>
              <span>{property.bedrooms}</span>
            </span>
          )}
          {property.bathrooms !== undefined && (
            <span className="flex items-center gap-0.5">
              <span>🚿</span>
              <span>{property.bathrooms}</span>
            </span>
          )}
          {property.size && (
            <span className="flex items-center gap-0.5">
              <span>📐</span>
              <span>{property.size}m²</span>
            </span>
          )}
        </div>

        {/* View button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onViewDetails();
          }}
          className="w-full py-1.5 bg-gradient-to-r from-primary to-blue-600 text-white text-[11px] font-semibold rounded-lg hover:shadow-md transition-all"
        >
          {t('property:viewDetails', 'View Details')}
        </button>
      </div>
    </div>
  );
};

export default MapPropertyPopup;
