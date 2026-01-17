import React, { useState, useCallback, memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { MapPinIcon, BedIcon, BathIcon, SqftIcon, UserCircleIcon, LivingRoomIcon, BuildingOfficeIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { formatPrice } from '@/utils/currency';

// Chevron Icons
const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

interface HighlightedPropertyCardProps {
  property: Property;
  showToast?: (message: string, type: 'success' | 'error') => void;
}

const HighlightedPropertyCard: React.FC<HighlightedPropertyCardProps> = ({ property, showToast }) => {
  const { t } = useTranslation(['property', 'common']);
  const { state, dispatch, toggleSavedHome } = useAppContext();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [isHovered, setIsHovered] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const isFavorited = state.savedHomes.some(p => p.id === property.id);
  const promotionTier = property.promotionTier || 'featured';

  // Get up to 3 images from the property
  const images = property.images?.slice(0, 3) || [];
  const displayImages = images.length > 0
    ? images.map(img => typeof img === 'string' ? img : img.url)
    : [property.imageUrl];

  // Auto-advance carousel every 3 seconds when not hovered
  useEffect(() => {
    if (!isAutoPlaying || displayImages.length <= 1) return;

    const interval = setInterval(() => {
      if (!isHovered) {
        setCurrentImageIndex(prev => (prev + 1) % displayImages.length);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, isHovered, displayImages.length]);

  const handlePrevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentImageIndex(prev => (prev - 1 + displayImages.length) % displayImages.length);
  }, [displayImages.length]);

  const handleNextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentImageIndex(prev => (prev + 1) % displayImages.length);
  }, [displayImages.length]);

  const handleDotClick = useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentImageIndex(index);
  }, []);

  const handleCardClick = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: property.id });
    window.history.pushState({ propertyId: property.id }, '', `/property/${property.id}`);
  }, [dispatch, property.id]);

  const handleFavoriteClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!state.isAuthenticated && !state.user) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
    } else {
      try {
        await toggleSavedHome(property);
      } catch (error) {
        console.error('Failed to toggle saved home:', error);
        showToast?.('Failed to save property. Please try again.', 'error');
      }
    }
  }, [state.isAuthenticated, state.user, dispatch, property, toggleSavedHome, showToast]);

  const handleImageError = useCallback((index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  }, []);

  const propertyTypeLabel = t(`property:types.${property.propertyType}`, { defaultValue: t('property:property') });

  // Tier-specific styles with glowing borders
  // Premium = Gold (1st), Highlight = Light Blue (2nd), Featured = Pink (3rd)
  const getTierStyles = () => {
    switch (promotionTier) {
      case 'premium':
        return {
          border: 'ring-2 ring-amber-400 border-amber-400',
          badge: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400',
          icon: '👑',
          glow: 'shadow-[0_0_20px_rgba(255,184,0,0.4)] hover:shadow-[0_0_30px_rgba(255,184,0,0.6)]',
          label: t('property:map.tiers.premium', 'PREMIUM PREMIERE')
        };
      case 'highlight':
        return {
          border: 'ring-2 ring-sky-400 border-sky-400',
          badge: 'bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400',
          icon: '💎',
          glow: 'shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:shadow-[0_0_30px_rgba(14,165,233,0.6)]',
          label: t('property:map.tiers.highlight', 'HIGHLIGHT')
        };
      case 'featured':
        return {
          border: 'ring-2 ring-violet-500 border-violet-500',
          badge: 'bg-gradient-to-r from-violet-600 via-purple-500 to-violet-400',
          icon: '⭐',
          glow: 'shadow-[0_0_15px_rgba(124,58,237,0.35)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)]',
          label: t('property:map.tiers.featured', 'FEATURED')
        };
      default:
        return {
          border: 'ring-1 ring-gray-300 border-gray-200',
          badge: 'bg-gradient-to-r from-gray-500 to-gray-600',
          icon: '✨',
          glow: 'shadow-md hover:shadow-lg',
          label: 'PROMOTED'
        };
    }
  };

  const tierStyles = getTierStyles();

  return (
    <div
      className={`group bg-white rounded-2xl overflow-hidden shadow-xl ${tierStyles.border} ${tierStyles.glow} transition-all duration-500 cursor-pointer flex flex-col md:flex-row w-full ${
        isHovered ? 'shadow-2xl scale-[1.01]' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image Carousel Section */}
      <div className="relative w-full md:w-2/5 h-56 md:h-auto md:min-h-[280px] overflow-hidden">
        {/* Images */}
        <div className="relative w-full h-full">
          {displayImages.map((imgUrl, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {imageErrors.has(index) ? (
                <div className="w-full h-full bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 flex items-center justify-center">
                  <BuildingOfficeIcon className="w-16 h-16 text-neutral-400" />
                </div>
              ) : (
                <img
                  src={imgUrl}
                  alt={`${property.title || propertyTypeLabel} - Image ${index + 1}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    isHovered ? 'scale-105' : 'scale-100'
                  }`}
                  onError={() => handleImageError(index)}
                />
              )}
            </div>
          ))}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Navigation Arrows */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
            >
              <ChevronLeftIcon className="w-5 h-5 text-neutral-700" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
            >
              <ChevronRightIcon className="w-5 h-5 text-neutral-700" />
            </button>
          </>
        )}

        {/* Image Dots */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {displayImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => handleDotClick(e, index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? 'bg-white w-6'
                    : 'bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
          {currentImageIndex + 1} / {displayImages.length}
        </div>

        {/* Promotion Badge */}
        <div className={`absolute top-3 left-3 ${tierStyles.badge} text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 z-10`}>
          <span className="text-sm">{tierStyles.icon}</span>
          {tierStyles.label}
        </div>

        {/* Urgent Badge */}
        {property.hasUrgentBadge && (
          <div className="absolute top-3 right-14 bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg animate-pulse flex items-center gap-1 z-10">
            🔥 {t('property:status.urgent').toUpperCase()}
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 p-2.5 rounded-full shadow-lg transition-all duration-300 z-10 ${
            isFavorited
              ? 'bg-red-500 text-white scale-110'
              : 'bg-white/95 text-neutral-600 hover:bg-red-500 hover:text-white hover:scale-110'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-5 md:p-6 flex flex-col">
        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <span className="bg-gradient-to-r from-primary to-primary-dark text-white text-lg md:text-xl font-bold px-4 py-1.5 rounded-lg shadow-md">
            {formatPrice(property.price, property.country)}
          </span>
          <span className="bg-neutral-100 text-neutral-700 text-sm font-semibold px-3 py-1 rounded-lg">
            {propertyTypeLabel}
          </span>
        </div>

        {/* Title */}
        {property.title && (
          <h3 className="text-lg md:text-xl font-bold text-neutral-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
        )}

        {/* Location */}
        <div className="flex items-center gap-2 mb-4 text-neutral-600">
          <MapPinIcon className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm">{property.address}</span>
        </div>

        {/* Property Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="flex flex-col items-center bg-neutral-50 py-2 px-2 rounded-xl border border-neutral-100">
            <BedIcon className="w-5 h-5 text-primary mb-1" />
            <span className="font-bold text-sm text-neutral-800">{property.beds}</span>
            <span className="text-[10px] text-neutral-500">{t('property:features.beds')}</span>
          </div>
          <div className="flex flex-col items-center bg-neutral-50 py-2 px-2 rounded-xl border border-neutral-100">
            <BathIcon className="w-5 h-5 text-primary mb-1" />
            <span className="font-bold text-sm text-neutral-800">{property.baths}</span>
            <span className="text-[10px] text-neutral-500">{t('property:features.baths')}</span>
          </div>
          <div className="flex flex-col items-center bg-neutral-50 py-2 px-2 rounded-xl border border-neutral-100">
            <LivingRoomIcon className="w-5 h-5 text-primary mb-1" />
            <span className="font-bold text-sm text-neutral-800">{property.livingRooms}</span>
            <span className="text-[10px] text-neutral-500">{t('property:features.rooms')}</span>
          </div>
          <div className="flex flex-col items-center bg-primary/5 py-2 px-2 rounded-xl border border-primary/20">
            <SqftIcon className="w-5 h-5 text-primary mb-1" />
            <span className="font-bold text-sm text-primary">{property.sqft}</span>
            <span className="text-[10px] text-primary/70">{t('common:sqm')}</span>
          </div>
        </div>

        {/* Description excerpt */}
        {property.description && (
          <p className="text-sm text-neutral-600 line-clamp-2 mb-4 flex-grow">
            {property.description}
          </p>
        )}

        {/* Seller Info */}
        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {property.seller.avatarUrl ? (
              <img
                src={property.seller.avatarUrl}
                alt={property.seller.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow">
                <UserCircleIcon className="w-6 h-6 text-primary" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-neutral-800">{property.seller.name}</p>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                property.seller.type === 'agent'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-neutral-100 text-neutral-600'
              }`}>
                {property.seller.type === 'agent' ? t('property:seller.agent') : t('property:seller.private')}
              </span>
            </div>
          </div>

          {/* View Details Button */}
          <button
            onClick={handleCardClick}
            className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-md"
          >
            {t('property:actions.viewDetails')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(HighlightedPropertyCard);