import React, { useState, useCallback, memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { MapPinIcon, BedIcon, BathIcon, SqftIcon, UserCircleIcon, LivingRoomIcon, BuildingOfficeIcon, StarIconSolid, FireIcon } from '@/constants';
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

// Seller Avatar component with error handling
const SellerAvatar: React.FC<{ avatarUrl?: string; name: string; type: string }> = ({
  avatarUrl,
  name,
  type
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!avatarUrl || error) {
    return (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-sm border-2 border-white">
        <UserCircleIcon className="w-4 h-4 text-primary" />
      </div>
    );
  }

  return (
    <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gradient-to-br from-primary/20 to-primary/40">
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/20 animate-pulse" />
      )}
      <img
        src={avatarUrl}
        alt={`${name} - Real Estate ${type === 'agent' ? 'Agent' : 'Seller'}`}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

const HighlightedPropertyCard: React.FC<HighlightedPropertyCardProps> = ({ property, showToast }) => {
  const { t } = useTranslation(['property', 'common']);
  const { state, dispatch, toggleSavedHome } = useAppContext();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [isHovered, setIsHovered] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const isFavorited = state.savedHomes.some(p => p.id === property.id);
  const promotionTier = property.promotionTier || 'featured';
  const isRental = (property.listingType || 'sale') === 'rent';

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

  const handleCardClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: property.id });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'property-details' });
    window.history.pushState({ propertyId: property.id }, '', `/property/${property.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [dispatch, property.id]);

  const handleFavoriteClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!state.isAuthenticated && !state.user) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
    } else {
      try {
        await toggleSavedHome(property);
      } catch (error) {
        showToast?.('Failed to save property. Please try again.', 'error');
      }
    }
  }, [state.isAuthenticated, state.user, dispatch, property, toggleSavedHome, showToast]);

  const handleImageError = useCallback((index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  }, []);

  const propertyTypeLabel = t(`property:types.${property.propertyType}`, { defaultValue: t('property:property') });

  // Tier-specific styles with glowing borders
  const getTierStyles = () => {
    switch (promotionTier) {
      case 'premium':
        return {
          border: 'ring-2 ring-amber-400 border-amber-400',
          badge: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400',
          glow: 'shadow-[0_0_20px_rgba(255,184,0,0.4)] hover:shadow-[0_0_30px_rgba(255,184,0,0.6)]',
          label: t('property:map.tiers.premium', 'PREMIUM PREMIERE')
        };
      case 'highlight':
        return {
          border: 'ring-2 ring-sky-400 border-sky-400',
          badge: 'bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400',
          glow: 'shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:shadow-[0_0_30px_rgba(14,165,233,0.6)]',
          label: t('property:map.tiers.highlight', 'HIGHLIGHT')
        };
      case 'featured':
        return {
          border: 'ring-2 ring-violet-500 border-violet-500',
          badge: 'bg-gradient-to-r from-violet-600 via-purple-500 to-violet-400',
          glow: 'shadow-[0_0_15px_rgba(124,58,237,0.35)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)]',
          label: t('property:map.tiers.featured', 'FEATURED')
        };
      default:
        return {
          border: 'ring-1 ring-gray-300 border-gray-200',
          badge: 'bg-gradient-to-r from-gray-500 to-gray-600',
          glow: 'shadow-md hover:shadow-lg',
          label: 'PROMOTED'
        };
    }
  };

  const tierStyles = getTierStyles();

  return (
    <div
      className={`group bg-white rounded-xl overflow-hidden shadow-xl ${tierStyles.border} ${tierStyles.glow} transition-all duration-500 cursor-pointer flex flex-col md:flex-row w-full ${
        isHovered ? 'shadow-2xl scale-[1.01]' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image Section - fills height of card in row layout */}
      <div className="relative w-full md:w-[40%] aspect-[4/3] md:aspect-auto overflow-hidden">
        <div className="absolute inset-0">
          {displayImages.map((imgUrl, index) => (
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
                  alt={`${property.title || propertyTypeLabel} - Image ${index + 1}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    isHovered ? 'scale-105' : 'scale-100'
                  }`}
                  onError={() => handleImageError(index)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-[1]" />

        {/* Navigation Arrows */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5 text-neutral-700" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
            >
              <ChevronRightIcon className="w-3.5 h-3.5 text-neutral-700" />
            </button>
          </>
        )}

        {/* Image Dots */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {displayImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => handleDotClick(e, index)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? 'bg-white w-4'
                    : 'bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full z-10">
          {currentImageIndex + 1}/{displayImages.length}
        </div>

        {/* Promotion Badge */}
        <div className={`absolute top-2 left-2 ${tierStyles.badge} text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 z-10`}>
          <StarIconSolid className="w-2.5 h-2.5" />
          {tierStyles.label}
        </div>

        {/* Urgent Badge */}
        {property.hasUrgentBadge && (
          <div
            className="absolute top-2 right-10 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md animate-pulse flex items-center gap-0.5 z-10"
            style={{ boxShadow: '0 0 12px 2px rgba(239, 68, 68, 0.6), 0 0 20px 4px rgba(239, 68, 68, 0.3)' }}
          >
            <FireIcon className="w-2.5 h-2.5" /> {t('property:status.urgent').toUpperCase()}
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-2 right-2 p-1.5 rounded-full shadow-lg transition-all duration-300 z-10 ${
            isFavorited
              ? 'bg-red-500 text-white scale-110'
              : 'bg-white/95 text-neutral-600 hover:bg-red-500 hover:text-white hover:scale-110'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${isFavorited ? 'fill-current' : ''}`} fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-3.5 md:p-4 flex flex-col min-w-0">
        {/* Price & Type Row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="bg-gradient-to-r from-primary to-primary-dark text-white text-sm md:text-base font-bold px-3 py-1 rounded-lg shadow-md">
            {formatPrice(property.price, property.country)}
            {isRental && <span className="text-xs font-normal opacity-80">/{property.rentPeriod === 'weekly' ? t('common:wk', 'wk') : property.rentPeriod === 'daily' ? t('common:day', 'day') : t('common:mo', 'mo')}</span>}
          </span>
          <span className="bg-neutral-100 text-neutral-700 text-xs font-semibold px-2.5 py-1 rounded-md">
            {propertyTypeLabel}
          </span>
        </div>

        {/* Title */}
        {property.title && (
          <h3 className="text-sm md:text-base font-bold text-neutral-900 mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
        )}

        {/* Location */}
        <div className="flex items-center gap-1.5 mb-2.5 text-neutral-600">
          <MapPinIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-xs truncate">{property.address}</span>
        </div>

        {/* Property Stats - compact inline row */}
        <div className="flex items-center gap-4 mb-2.5 text-neutral-600">
          <div className="flex items-center gap-1">
            <BedIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{property.beds}</span>
          </div>
          <div className="flex items-center gap-1">
            <BathIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{property.baths}</span>
          </div>
          <div className="flex items-center gap-1">
            <LivingRoomIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{property.livingRooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <SqftIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary">{property.sqft} {t('common:sqm')}</span>
          </div>
        </div>

        {/* Description excerpt */}
        {property.description && (
          <p className="text-xs text-neutral-500 line-clamp-2 mb-2.5 flex-grow">
            {property.description}
          </p>
        )}

        {/* Seller Info & View Details */}
        <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2 min-w-0">
            <SellerAvatar
              avatarUrl={property.seller.avatarUrl}
              name={property.seller.name}
              type={property.seller.type}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-800 truncate">{property.seller.name}</p>
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
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
            className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-md flex-shrink-0"
          >
            {t('property:actions.viewDetails')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(HighlightedPropertyCard);
