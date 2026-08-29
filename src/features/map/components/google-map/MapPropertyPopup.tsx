/**
 * Property Popup Component for Google Maps
 * Displays a compact mini card when clicking on a property marker
 */

import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { formatPrice } from '@/utils/currency';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

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
  const allImages = (() => {
    const base = property.imageUrl ? [property.imageUrl] : [];
    const extras = (property.images || []).map((img: any) =>
      typeof img === 'string' ? img : img.url
    ).filter(Boolean) as string[];
    const combined = [...base, ...extras.filter((u: string) => !base.includes(u))];
    return combined.slice(0, 8);
  })();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [imageError, setImageError] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const imageUrl = allImages[currentImageIndex] ?? property.imageUrl ?? '';
  const hasMultipleImages = allImages.length > 1;

  const handlePrevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSlideDirection('left');
    setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  const handleNextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSlideDirection('right');
    setCurrentImageIndex(prev => (prev + 1) % allImages.length);
  }, [allImages.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 30) {
      if (diff > 0) {
        setSlideDirection('right');
        setCurrentImageIndex(prev => (prev + 1) % allImages.length);
      } else {
        setSlideDirection('left');
        setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
      }
    }
    touchStartXRef.current = null;
  }, [allImages.length]);

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
      <div
        className="relative h-28 rounded-t-xl overflow-hidden bg-gray-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {imageUrl && !imageError ? (
          <div
            key={currentImageIndex}
            className={`absolute inset-0 ${slideDirection === 'right' ? 'animate-gallery-right' : 'animate-gallery-left'}`}
          >
            <img
              src={optimizeCloudinaryUrl(imageUrl, { width: 200, quality: 'auto', format: 'auto', crop: 'fill', gravity: 'center' })}
              srcSet={`${optimizeCloudinaryUrl(imageUrl, { width: 160, quality: 'auto', format: 'auto', crop: 'fill', gravity: 'center' })} 160w, ${optimizeCloudinaryUrl(imageUrl, { width: 200, quality: 'auto', format: 'auto', crop: 'fill', gravity: 'center' })} 200w, ${optimizeCloudinaryUrl(imageUrl, { width: 280, quality: 'auto', format: 'auto', crop: 'fill', gravity: 'center' })} 280w`}
              sizes="(max-width: 640px) calc(70vw - 20px), 200px"
              alt={property.title || property.address || 'Property image'}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover object-center"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        {/* Navigation arrows — always visible for touch usability */}
        {hasMultipleImages && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/50 active:bg-black/70 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Previous image"
            >
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/50 active:bg-black/70 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Next image"
            >
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        {/* Dot indicators — min 24px tap targets */}
        {hasMultipleImages && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center z-20 pointer-events-none">
            {allImages.slice(0, 5).map((_, i) => (
              <button
                key={i}
                className="pointer-events-auto min-w-[24px] min-h-[24px] flex items-center justify-center focus:outline-none"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setSlideDirection(i > currentImageIndex ? 'right' : 'left'); setCurrentImageIndex(i); }}
                aria-label={`Image ${i + 1} of ${Math.min(allImages.length, 5)}`}
                aria-current={i === currentImageIndex ? 'true' : undefined}
              >
                <span className={`block rounded-full transition-all duration-200 ${
                  i === currentImageIndex ? 'w-2.5 h-1 bg-white' : 'w-1 h-1 bg-white/60'
                }`} />
              </button>
            ))}
            {allImages.length > 5 && (
              <span className="text-[8px] text-white/80 self-center ml-0.5 pointer-events-none">+{allImages.length - 5}</span>
            )}
          </div>
        )}

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
          {property.isNegotiable
            ? t('property:byNegotiation', 'By Negotiation')
            : formatPrice(property.price, property.country)}
        </div>

        {/* Address */}
        <p className="text-[11px] text-gray-500 truncate mb-2">
          {property.address || property.city}
        </p>

        {/* Quick stats */}
        <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-2">
          {property.beds !== undefined && (
            <span className="flex items-center gap-0.5">
              <span>🛏️</span>
              <span>{property.beds}</span>
            </span>
          )}
          {property.baths !== undefined && (
            <span className="flex items-center gap-0.5">
              <span>🚿</span>
              <span>{property.baths}</span>
            </span>
          )}
          {property.sqft && (
            <span className="flex items-center gap-0.5">
              <span>📐</span>
              <span>{property.sqft}m²</span>
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
