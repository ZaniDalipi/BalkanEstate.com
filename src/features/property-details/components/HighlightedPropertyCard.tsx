import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { MapPinIcon, BedIcon, BathIcon, SqftIcon, UserCircleIcon, LivingRoomIcon, BuildingOfficeIcon, StarIconSolid, FireIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { generatePropertySlug } from '@/utils/slug';
import { formatPrice } from '@/utils/currency';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import PropertyImage from '@/src/components/ui/PropertyImage';
import { buildLocalizedPath } from '@/src/utils/languageRouting';

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

// Props for the pure inner component
interface HighlightedCardInnerProps {
  property: Property;
  isFavorited: boolean;
  showToast?: (message: string, type: 'success' | 'error') => void;
  onCardClick: (e?: React.MouseEvent) => void;
  onFavoriteClick: (e: React.MouseEvent) => void;
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
        src={optimizeCloudinaryUrl(avatarUrl, { width: 56, quality: 'auto', crop: 'fill' })}
        alt={`${name} - Real Estate ${type === 'agent' ? 'Agent' : 'Seller'}`}
        loading="lazy"
        decoding="async"
        width={28}
        height={28}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

/**
 * Pure inner component - handles ALL rendering, NO context subscription.
 * Wrapped in memo() so it only re-renders when its specific props change.
 */
const HighlightedCardInner = memo<HighlightedCardInnerProps>(({
  property,
  isFavorited,
  showToast,
  onCardClick,
  onFavoriteClick,
}) => {
  const { t } = useTranslation(['property', 'common', 'rental']);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [isHovered, setIsHovered] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const touchStartX = useRef<number | null>(null);

  const promotionTier = property.promotionTier || 'featured';
  const isRental = (property.listingType || 'sale') === 'rent';

  // Get up to 5 images from the property
  const images = property.images?.slice(0, 5) || [];
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

  const handleImageError = useCallback((index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  }, []);

  // Touch swipe for mobile carousel
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      setIsAutoPlaying(false);
      if (diff > 0) {
        setCurrentImageIndex(prev => (prev + 1) % displayImages.length);
      } else {
        setCurrentImageIndex(prev => (prev - 1 + displayImages.length) % displayImages.length);
      }
    }
    touchStartX.current = null;
  }, [displayImages.length]);

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
      className={`group bg-white rounded-2xl overflow-hidden shadow-md ${tierStyles.border} ${tierStyles.glow} transition-all duration-300 cursor-pointer flex flex-col md:flex-row w-full ${
        isHovered ? 'shadow-xl scale-[1.005]' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onCardClick}
    >
      {/* Image Section */}
      <div
        className="relative w-full md:w-[42%] flex-shrink-0 aspect-[4/3] md:aspect-auto overflow-hidden bg-neutral-200"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {displayImages.map((imgUrl, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <PropertyImage
              src={imgUrl}
              alt={`${property.title || propertyTypeLabel} - Image ${index + 1}`}
              priority={index === 0}
              widths={[400, 640, 800]}
              sizes="(max-width: 768px) 100vw, 42vw"
              imgClassName={isHovered ? 'scale-[1.02] transition-transform duration-[8000ms] ease-[cubic-bezier(0.05,0,0.2,1)]' : 'scale-100 transition-transform duration-[8000ms]'}
            />
          </div>
        ))}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-[1]" />

        {/* Navigation Arrows - desktop only */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
            >
              <ChevronLeftIcon className="w-4 h-4 text-neutral-700" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
            >
              <ChevronRightIcon className="w-4 h-4 text-neutral-700" />
            </button>
          </>
        )}

        {/* iOS-style Page Dots */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-[5px] z-10">
            {displayImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => handleDotClick(e, index)}
                className={`rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? 'bg-white w-[7px] h-[7px]'
                    : 'bg-white/45 w-[6px] h-[6px] active:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}

        {/* iOS-style Image Counter Pill */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 bg-black/40 backdrop-blur-md text-white/90 text-[10px] font-medium px-1.5 py-[2px] rounded-full z-10 tabular-nums">
            {currentImageIndex + 1}/{displayImages.length}
          </div>
        )}

        {/* Promotion Badge - compact iOS pill */}
        <div className={`absolute top-2.5 left-2.5 ${tierStyles.badge} text-white text-[10px] font-semibold px-2 py-[3px] rounded-full flex items-center gap-1 z-10`}>
          <StarIconSolid className="w-2.5 h-2.5" />
          {tierStyles.label}
        </div>

        {/* Urgent Badge - iOS compact */}
        {property.hasUrgentBadge && (
          <div className="absolute top-2.5 right-11 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-[3px] rounded-full animate-pulse flex items-center gap-1 z-10">
            <FireIcon className="w-2.5 h-2.5" /> {t('property:status.urgent').toUpperCase()}
          </div>
        )}

        {/* iOS-style Favorite Button - frosted glass */}
        <button
          onClick={onFavoriteClick}
          className={`absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 z-10 active:scale-90 ${
            isFavorited
              ? 'bg-red-500 text-white'
              : 'bg-black/20 backdrop-blur-md text-white border border-white/20'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-[18px] w-[18px] ${isFavorited ? 'fill-current' : ''}`} fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isFavorited ? 0 : 1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-4 md:p-5 flex flex-col min-w-0">
        {/* Price & Type Row - iOS style */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            {property.isNegotiable ? (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs md:text-sm font-semibold px-2 py-1 rounded-full border border-amber-200">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {t('property:byNegotiation', 'By Negotiation')}
              </span>
            ) : (
              <>
                <span className="text-primary text-base md:text-lg font-bold tracking-tight">
                  {formatPrice(property.price, property.country)}
                  {isRental && <span className="text-xs font-normal text-neutral-400">/{property.rentPeriod === 'weekly' ? t('common:wk', 'wk') : property.rentPeriod === 'daily' ? t('common:day', 'day') : t('common:mo', 'mo')}</span>}
                </span>
                {isRental ? (
                  property.rentPeriod !== 'daily' && (
                    <p className="text-[11px] text-neutral-400 font-medium">
                      {formatPrice(Math.round(property.price / (property.rentPeriod === 'weekly' ? 7 : 30)), property.country)}{t('rental:perDay', '/day')}
                    </p>
                  )
                ) : (
                  property.sqft > 0 && property.propertyType !== 'land' && (
                    <p className="text-[11px] text-neutral-400 font-medium">
                      {formatPrice(Math.round(property.price / property.sqft), property.country)} per m²
                    </p>
                  )
                )}
              </>
            )}
          </div>
          <span className="bg-neutral-100 text-neutral-600 text-[11px] font-medium px-2.5 py-[3px] rounded-full">
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

        {/* Property Stats */}
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
              <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-[1px] rounded-full ${
                property.seller.type === 'agent'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-neutral-50 text-neutral-500'
              }`}>
                {property.seller.type === 'agent' ? t('property:seller.agent') : t('property:seller.private')}
              </span>
            </div>
          </div>

          {/* iOS-style View Details Button */}
          <button
            onClick={onCardClick}
            className="bg-primary hover:bg-primary-dark text-white text-[13px] font-medium px-4 py-[7px] rounded-full transition-all active:scale-[0.97] flex-shrink-0"
          >
            {t('property:actions.viewDetails')}
          </button>
        </div>
      </div>
    </div>
  );
});

HighlightedCardInner.displayName = 'HighlightedCardInner';

/**
 * Outer connected component - thin wrapper that subscribes to AppContext,
 * extracts primitive values, and passes them to the memoized inner component.
 */
const HighlightedPropertyCard: React.FC<HighlightedPropertyCardProps> = ({ property, showToast }) => {
  const { state, dispatch, toggleSavedHome } = useAppContext();

  const isFavorited = state.savedHomes.some(p => p.id === property.id);

  // Use refs for values that change often but are only needed in handlers
  const stateRef = useRef(state);
  stateRef.current = state;

  const toggleSavedHomeRef = useRef(toggleSavedHome);
  toggleSavedHomeRef.current = toggleSavedHome;

  const handleCardClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    dispatch({ type: 'SET_SELECTED_PROPERTY_OBJECT', payload: property });
    window.history.pushState({}, '', buildLocalizedPath(`/property/${generatePropertySlug(property)}`));
  }, [dispatch, property]);

  const handleFavoriteClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!stateRef.current.isAuthenticated && !stateRef.current.user) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
    } else {
      try {
        await toggleSavedHomeRef.current(property);
      } catch (error) {
        showToast?.('Failed to save property. Please try again.', 'error');
      }
    }
  }, [dispatch, property, showToast]);

  return (
    <HighlightedCardInner
      property={property}
      isFavorited={isFavorited}
      showToast={showToast}
      onCardClick={handleCardClick}
      onFavoriteClick={handleFavoriteClick}
    />
  );
};

export default memo(HighlightedPropertyCard);
