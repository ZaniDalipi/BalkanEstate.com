import React, { useState, useCallback, memo, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { MapPinIcon, BedIcon, BathIcon, SqftIcon, UserCircleIcon, ScaleIcon, LivingRoomIcon, BuildingOfficeIcon, StarIconSolid, FireIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { useNavigationDirection } from '@/src/components/ui/ViewTransition';
import { generatePropertySlug } from '@/utils/slug';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { formatPrice } from '@/utils/currency';
import { getPriceReductionInfo } from '@/utils/priceUtils';
import { BALKAN_COUNTRIES } from '@/constants/countries';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import PropertyImage, { getPropertyImageSources } from '@/src/components/ui/PropertyImage';
import { shouldOpenInNewTab } from '@/shared/utils/pwa';
import ExternalSourceBadge from '@/features/properties/components/ExternalSourceBadge';

interface PropertyCardProps {
  property: Property;
  showToast?: (message: string, type: 'success' | 'error') => void;
  showCompareButton?: boolean;
  /** Pass true for cards visible above the fold so the browser prioritises their images */
  priority?: boolean;
}

// Props for the pure inner component
interface PropertyCardInnerProps {
  property: Property;
  isFavorited: boolean;
  isInComparison: boolean;
  isAuthenticated: boolean;
  comparisonCount: number;
  showToast?: (message: string, type: 'success' | 'error') => void;
  showCompareButton?: boolean;
  priority?: boolean;
  onCardClick: (e: React.MouseEvent) => void;
  onFavoriteClick: (e: React.MouseEvent) => void;
  onCompareClick: (e: React.MouseEvent) => void;
  onLocationClick: (e: React.MouseEvent, type: 'city' | 'country') => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

// Seller Avatar component with error handling
const SellerAvatar: React.FC<{ avatarUrl?: string; name: string; type: string; size?: 'sm' | 'md' }> = ({
  avatarUrl,
  name,
  type,
  size = 'sm'
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const sizeClasses = size === 'sm'
    ? 'w-6 h-6'
    : 'w-8 h-8';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  if (!avatarUrl || error) {
    return (
      <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow border-2 border-white`}>
        <UserCircleIcon className={`${iconSize} text-primary`} />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} rounded-full overflow-hidden border-2 border-white shadow bg-gradient-to-br from-primary/20 to-primary/40`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/20 animate-pulse" />
      )}
      <img
        src={optimizeCloudinaryUrl(avatarUrl, { width: 64, quality: 'auto', crop: 'fill' })}
        alt={`${name} - Real Estate ${type === 'agent' ? 'Agent' : 'Seller'}`}
        loading="lazy"
        decoding="async"
        width={64}
        height={64}
        className={`w-full h-full object-cover object-center transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

/**
 * Pure inner component - handles ALL rendering, NO context subscription.
 * Wrapped in memo() so it only re-renders when its specific props change.
 * This prevents the "everything refreshes" issue when toggling favorites.
 */
const PropertyCardInner = memo<PropertyCardInnerProps>(({
  property,
  isFavorited,
  isInComparison,
  showToast,
  showCompareButton,
  priority = false,
  onCardClick,
  onFavoriteClick,
  onCompareClick,
  onLocationClick,
  onContextMenu,
}) => {
  const { t, i18n } = useTranslation(['property', 'rental', 'common']);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const touchStartXRef = useRef<number | null>(null);

  const allImages = useMemo(() => {
    const base = property.imageUrl ? [property.imageUrl] : [];
    const extras = (property.images || []).map(img => img.url).filter(Boolean);
    return [...base, ...extras.filter(u => !base.includes(u))].slice(0, 10);
  }, [property.imageUrl, property.images]);

  const currentImageUrl = allImages[currentImageIndex] ?? property.imageUrl;
  const hasMultipleImages = allImages.length > 1;

  const handlePrevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideDirection('left');
    setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  const handleNextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideDirection('right');
    setCurrentImageIndex(prev => (prev + 1) % allImages.length);
  }, [allImages.length]);

  const handleImageTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  }, []);

  const handleImageTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
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

  // Preload the adjacent images (next + previous) so the switch is near-instant
  // instead of triggering a fresh network fetch on each arrow/swipe. We build the
  // exact URLs the <img> would request (same widths/sizes) so the browser serves
  // them straight from cache. Only runs for multi-image cards.
  const IMAGE_WIDTHS = useMemo(() => [320, 480, 640], []);
  const IMAGE_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
  useEffect(() => {
    if (allImages.length <= 1) return;
    const neighbors = [
      (currentImageIndex + 1) % allImages.length,
      (currentImageIndex - 1 + allImages.length) % allImages.length,
    ];
    neighbors.forEach((idx) => {
      const url = allImages[idx];
      if (!url) return;
      const { mainSrc, srcSet } = getPropertyImageSources(url, IMAGE_WIDTHS);
      const img = new Image();
      // Set sizes/srcSet before src so the browser picks the same responsive
      // candidate the rendered <img> will use.
      img.sizes = IMAGE_SIZES;
      if (srcSet) img.srcset = srcSet;
      img.src = mainSrc;
    });
  }, [currentImageIndex, allImages, IMAGE_WIDTHS]);

  // Safe access with fallbacks
  const safeProperty = {
    ...property,
    city: property?.city || 'Unknown',
    country: property?.country || 'Unknown',
    beds: property?.beds ?? 0,
    baths: property?.baths ?? 0,
    livingRooms: property?.livingRooms ?? 0,
    sqft: property?.sqft ?? 0,
    seller: property?.seller || { type: 'private' as const, name: '', phone: '' },
  };

  const isNew = property?.createdAt && (Date.now() - property.createdAt < 3 * 24 * 60 * 60 * 1000);
  const isPriceReduced = property?.originalPrice !== undefined && property?.originalPrice > property?.price;
  const isSold = property?.status === 'sold';
  // Treat rental as expired (property available) if rentedUntil date has fully passed
  // e.g. rentedUntil = March 22 → stays rented on March 22, becomes active on March 23
  const isRentalExpired = (() => {
    if (property?.status !== 'rented' || !property?.rentedUntil) return false;
    const rentedEnd = new Date(property.rentedUntil);
    rentedEnd.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return rentedEnd < today;
  })();
  const isRented = property?.status === 'rented' && !isRentalExpired;
  const isRental = (property?.listingType || 'sale') === 'rent';

  // Check if property has an active promotion
  const isActivelyPromoted = property?.isPromoted &&
    property?.promotionEndDate &&
    property.promotionEndDate > Date.now();
  const promotionTier = isActivelyPromoted ? property?.promotionTier : null;

  // Property type labels
  const propertyTypeLabel = t(`property:types.${property.propertyType}`, { defaultValue: t('property:property') });

  // Determine card styles based on promotion tier
  const getCardStyles = () => {
    if (isSold || isRented) return 'border-neutral-300 opacity-80';
    if (isActivelyPromoted) {
      if (promotionTier === 'premium') return 'ring-2 ring-amber-400 border-amber-200 shadow-amber-100';
      if (promotionTier === 'highlight') return 'ring-2 ring-sky-400 border-sky-200 shadow-sky-100';
      if (promotionTier === 'featured') return 'ring-2 ring-violet-500 border-violet-200 shadow-violet-100';
      return 'ring-1 ring-gray-400 border-gray-200';
    }
    if (property.propertyType === 'luxury-villa') {
      return 'ring-1 ring-[#FFA500]/50 border-[#FFA500]/25 shadow-[0_2px_16px_rgba(255,165,0,0.10)] hover:ring-[#FFA500]/70 hover:shadow-[0_4px_24px_rgba(255,165,0,0.16)]';
    }
    return 'border-neutral-200 hover:border-primary/30';
  };

  const isLuxuryVilla = property.propertyType === 'luxury-villa';

  // Build luxury amenity chips to show on the card
  const luxuryAmenityChips: { emoji: string; label: string }[] = isLuxuryVilla ? (() => {
    const chips: { emoji: string; label: string }[] = [];
    const amenities: string[] = (property.amenities as string[]) || [];
    if (property.hasPool)                             chips.push({ emoji: '🏊', label: 'Pool' });
    if (property.hasGarden)                           chips.push({ emoji: '🌿', label: 'Garden' });
    if (amenities.some(a => a.toLowerCase().includes('sauna')))        chips.push({ emoji: '🧖', label: 'Sauna' });
    if (amenities.some(a => a.toLowerCase().includes('wine cellar')))  chips.push({ emoji: '🍷', label: 'Wine Cellar' });
    if (amenities.some(a => a.toLowerCase().includes('panoramic')))    chips.push({ emoji: '🏔️', label: 'Panoramic' });
    if (property.breakfastIncluded)           chips.push({ emoji: '🍳', label: 'Breakfast' });
    if (property.towelsIncluded)              chips.push({ emoji: '🛁', label: 'Towels' });
    if (property.parkingIncluded)             chips.push({ emoji: '🚗', label: 'Parking' });
    return chips.slice(0, 5); // max 5 chips on the card
  })() : [];

  const viewTypeDisplay: Record<string, { emoji: string; label: string }> = {
    sea: { emoji: '🌊', label: 'Sea View' },
    mountain: { emoji: '⛰️', label: 'Mountain' },
    park: { emoji: '🌲', label: 'Forest/Lake' },
    city: { emoji: '🏙️', label: 'City View' },
    garden: { emoji: '🌷', label: 'Garden View' },
    street: { emoji: '🏘️', label: 'Street View' },
  };

  return (
    <div
      className={`group bg-white rounded-2xl overflow-hidden shadow-sm border text-left w-full flex flex-col cursor-pointer isolate transition-[translate,box-shadow,border-color] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ${getCardStyles()} ${
        isSold || isRented
          ? 'hover:shadow-md'
          : 'hover:shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_20px_-6px_rgba(15,23,42,0.13)] motion-safe:hover:-translate-y-1'
      }`}
      onClick={onCardClick}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(e as any); } }}
      role="article"
      tabIndex={0}
      aria-label={`${property.title || propertyTypeLabel}, ${property.isNegotiable ? t('property:byNegotiation', 'By Negotiation') : formatPrice(property.price, property.country) + (isRental ? '/mo' : '')}, ${safeProperty.city}, ${safeProperty.country}`}
    >
      {/* Image Section */}
      <div className="relative overflow-hidden">
        <div
          className="relative w-full aspect-[2/1] overflow-hidden bg-neutral-200"
          onTouchStart={handleImageTouchStart}
          onTouchEnd={handleImageTouchEnd}
        >
          {/* Directional slide wrapper — keyed so a new PropertyImage mounts (and fades in) on each slide */}
          <div
            key={currentImageIndex}
            className={`absolute inset-0 ${slideDirection === 'right' ? 'animate-gallery-right' : 'animate-gallery-left'}`}
          >
            {/* The hover zoom lives on its own wrapper rather than on the <img>.
                PropertyImage already puts a transition-opacity on that element
                for its fade-in, and two transition-property utilities on one
                element overwrite each other — the zoom and the fade would each
                cancel the other depending on CSS order. */}
            <div className="absolute inset-0 transition-transform duration-[600ms] ease-out motion-safe:group-hover:scale-[1.05]">
              <PropertyImage
                src={currentImageUrl}
                alt={`${property.title || propertyTypeLabel} - ${property.beds} bed, ${property.baths} bath ${propertyTypeLabel} for ${isRental ? 'rent' : 'sale'} in ${property.city}, ${property.country}`}
                priority={priority}
                widths={IMAGE_WIDTHS}
                sizes={IMAGE_SIZES}
                transitionDurationClass={currentImageIndex === 0 ? 'duration-300' : 'duration-150'}
                imgClassName={isSold || isRented ? 'grayscale' : ''}
              />
            </div>
          </div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

            {/* Navigation arrows — always visible on touch, hover-revealed on pointer */}
            {hasMultipleImages && !isSold && !isRented && (
              <>
                <button
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center transition-opacity duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white opacity-60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center transition-opacity duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white opacity-60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                  onClick={handleNextImage}
                  aria-label="Next image"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image indicator — max 3 dots + count */}
            {hasMultipleImages && (
              <div className="absolute bottom-1 left-0 right-0 flex justify-center items-center z-20 pointer-events-none gap-1">
                {allImages.slice(0, 3).map((_, i) => (
                  <button
                    key={i}
                    className="pointer-events-auto min-w-[28px] min-h-[28px] flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
                    onClick={(e) => { e.stopPropagation(); setSlideDirection(i > currentImageIndex ? 'right' : 'left'); setCurrentImageIndex(i); }}
                    aria-label={`Image ${i + 1} of ${allImages.length}`}
                    aria-current={i === currentImageIndex ? 'true' : undefined}
                  >
                    <span className={`block rounded-full transition-all duration-200 ${
                      i === currentImageIndex ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'
                    }`} />
                  </button>
                ))}
                {allImages.length > 3 && (
                  <span className="pointer-events-none bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                    +{allImages.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Photo overlays: property type, plus the view pill on luxury villas */}
          <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 pointer-events-none">
            <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-[3px] rounded-full shadow">
              {propertyTypeLabel}
            </span>
            {isLuxuryVilla && property.viewType && viewTypeDisplay[property.viewType] && (
              <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-[3px] rounded-full flex items-center gap-1 shadow">
                <span>{viewTypeDisplay[property.viewType].emoji}</span>
                {viewTypeDisplay[property.viewType].label}
              </span>
            )}
          </div>

        {/* Top badges row */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
          <div className="flex flex-col gap-1.5">
            {/* Listing Type Badge — luxury variant for luxury-villa */}
            {isLuxuryVilla ? (
              <div className="bg-gradient-to-r from-[#FFA500] to-[#E8940A] text-white text-[10px] font-bold px-2 py-[3px] rounded-full flex items-center gap-1 shadow-sm">
                <span className="text-[8px] leading-none">✦</span>
                LUXURY VILLA
              </div>
            ) : isRental ? (
              <div className="bg-blue-500/85 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-[3px] rounded-full flex items-center gap-1">
                {t('property:forRent', 'FOR RENT').toUpperCase()}
              </div>
            ) : (
              <div className="bg-emerald-500/85 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-[3px] rounded-full flex items-center gap-1">
                {t('property:forSale', 'FOR SALE').toUpperCase()}
              </div>
            )}

            {/* iOS-style Sold Badge */}
            {isSold && (
              <div className="bg-red-500/85 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-[3px] rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                {t('property:sold').toUpperCase()}
              </div>
            )}

            {/* iOS-style Rented Badge */}
            {isRented && (
              <div className="bg-orange-500/85 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-[3px] rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                {property?.rentedUntil ? (
                  t('rental:status.availableBadge', { date: new Date(property.rentedUntil).toLocaleDateString(i18n.language === 'me' ? 'sr-Latn-ME' : i18n.language === 'sq' ? 'sq-AL' : i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase() })
                ) : (
                  t('property:rented', 'RENTED').toUpperCase()
                )}
              </div>
            )}

            {/* iOS-style Price Drop Badge */}
            {!isSold && !isRented && property.originalPrice && property.originalPrice > property.price && (
              <div className="bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-[3px] rounded-full flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                {t('property:priceDrop', 'PRICE DROP').toUpperCase()}
              </div>
            )}

            {/* iOS-style Price Increase Badge */}
            {!isSold && !isRented && property.originalPrice && property.originalPrice < property.price && (
              <div className="bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-[3px] rounded-full flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                {t('property:priceUp', 'PRICE UP').toUpperCase()}
              </div>
            )}

            {/* iOS-style New Badge */}
            {!isSold && !isRented && isNew && !isActivelyPromoted && (
              <div className="bg-emerald-500/85 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-[3px] rounded-full flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                </span>
                {t('property:status.new').toUpperCase()}
              </div>
            )}

            {/* iOS-style Promotion Badges */}
            {!isSold && isActivelyPromoted && promotionTier && (
              <div className={`text-white text-[10px] font-semibold px-2 py-[3px] rounded-full flex items-center gap-1 ${
                promotionTier === 'premium'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-400 animate-pulse'
                  : promotionTier === 'highlight'
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-400'
                  : promotionTier === 'featured'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-400'
                  : 'bg-neutral-500/85'
              }`}>
                <StarIconSolid className="w-2.5 h-2.5" />
                {promotionTier === 'premium' && t('property:map.tiers.premium', 'PREMIUM').toUpperCase()}
                {promotionTier === 'highlight' && t('property:map.tiers.highlight', 'HIGHLIGHT').toUpperCase()}
                {promotionTier === 'featured' && t('property:map.tiers.featured', 'FEATURED').toUpperCase()}
                {promotionTier === 'standard' && 'PROMOTED'}
              </div>
            )}

            {/* iOS-style Urgent Badge */}
            {!isSold && isActivelyPromoted && property.hasUrgentBadge && (
              <div className="bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-[3px] rounded-full animate-pulse flex items-center gap-1">
                <FireIcon className="w-2.5 h-2.5" /> {t('property:status.urgent').toUpperCase()}
              </div>
            )}

            {/* iOS-style 360° Tour Badge */}
            {property.virtualTour360Url && (
              <div className="bg-purple-500/85 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-[3px] rounded-full flex items-center gap-1">
                <span>360°</span>
              </div>
            )}

            {/* External-source badge for ingested listings */}
            {property.source && (
              <ExternalSourceBadge source={property.source} sourceUrl={property.sourceUrl} />
            )}
          </div>

          {/* iOS-style Favorite Button - frosted glass */}
          <button
            onClick={onFavoriteClick}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-[background-color,scale] duration-200 touch-manipulation focus:outline-none active:scale-90 ${
              isFavorited
                ? 'bg-red-500 text-white'
                : 'bg-black/20 backdrop-blur-md text-white border border-white/20'
            }`}
            aria-label={isFavorited ? t('property:actions.removeFromFavorites', 'Remove from favorites') : t('property:actions.addToFavorites', 'Add to favorites')}
            aria-pressed={isFavorited}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-[18px] w-[18px] ${isFavorited ? 'fill-current' : ''}`} fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isFavorited ? 0 : 1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

      </div>

      {/* Content Section */}
      <div className="relative p-2 flex flex-col flex-grow bg-white">
        <div className="flex flex-col flex-grow">
        {/* Price — the primary scan target, so it leads the block on its own line */}
        <div className="flex items-baseline justify-between gap-2 mb-1">
          {property.isNegotiable ? (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-[3px] rounded-full border border-amber-200">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {t('property:byNegotiation', 'By Negotiation')}
            </span>
          ) : (() => {
            const priceInfo = getPriceReductionInfo(property);
            return (
              <>
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className={`text-base sm:text-lg font-bold tracking-tight truncate ${isLuxuryVilla ? 'text-[#0252CD]' : 'text-neutral-900'}`}>
                    {formatPrice(property.price, property.country)}
                    {isRental && <span className="text-[11px] font-medium text-neutral-400">/{property.rentPeriod === 'weekly' ? t('common:wk', 'wk') : property.rentPeriod === 'daily' ? (isLuxuryVilla ? 'night' : t('common:day', 'day')) : t('common:mo', 'mo')}</span>}
                  </span>
                  {(priceInfo.hasReduction || priceInfo.hasIncrease) && (
                    <span className="text-[10px] text-neutral-400 line-through whitespace-nowrap">
                      {formatPrice(priceInfo.originalPrice, property.country)}
                    </span>
                  )}
                  {/* Unit price sits beside the headline figure rather than under it */}
                  {isRental ? (
                    property.rentPeriod !== 'daily' && (
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                        {formatPrice(Math.round(property.price / (property.rentPeriod === 'weekly' ? 7 : 30)), property.country)}{t('rental:perDay', '/day')}
                      </span>
                    )
                  ) : (
                    safeProperty.sqft > 0 && property.propertyType !== 'land' && (
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                        {formatPrice(Math.round(property.price / safeProperty.sqft), property.country)}/m²
                      </span>
                    )
                  )}
                </div>
                {priceInfo.hasReduction && (
                  <span className="flex-shrink-0 bg-red-50 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 whitespace-nowrap">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {priceInfo.discountPercentage}%
                  </span>
                )}
                {priceInfo.hasIncrease && (
                  <span className="flex-shrink-0 bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 whitespace-nowrap">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    {priceInfo.increasePercentage}%
                  </span>
                )}
              </>
            );
          })()}
        </div>

        {/* Title — secondary to the price, so medium weight rather than bold */}
        <h3 className="text-[13px] font-semibold text-neutral-800 mb-0.5 line-clamp-1 group-hover:text-primary transition-colors duration-300">
          {property.title || `${safeProperty.beds > 0 ? safeProperty.beds + '-Bed ' : ''}${propertyTypeLabel} ${isRental ? t('property:forRent', 'for Rent') : t('property:forSale', 'for Sale')}`}
        </h3>

        {/* Location - Clickable for navigation */}
        <div className="flex items-center gap-1 mb-1.5">
          <MapPinIcon className="w-3 h-3 text-neutral-400 flex-shrink-0" />
          {/* No gap between the city and its comma — the flex gap was rendering
              as "Durres , Albania". */}
          <div className="text-[11px] text-neutral-500 truncate flex items-center">
            <button
              onClick={(e) => onLocationClick(e, 'city')}
              className="hover:text-primary hover:underline transition-colors cursor-pointer"
              aria-label={`View all properties in ${safeProperty.city}`}
            >
              {safeProperty.city}
            </button>
            <span className="mr-1">,</span>
            <button
              onClick={(e) => onLocationClick(e, 'country')}
              className="hover:text-primary hover:underline transition-colors cursor-pointer"
              aria-label={`View all properties in ${safeProperty.country}`}
            >
              {safeProperty.country}
            </button>
          </div>
        </div>

        {/* Facts row. One muted icon colour instead of four competing ones, and
            no surrounding box — at this size the chrome was louder than the
            numbers it framed. */}
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-neutral-400 mb-1.5">
          <span
            className="inline-flex items-center gap-1"
            aria-label={`${safeProperty.beds} ${safeProperty.beds === 1 ? t('property:features.bedroom') : t('property:features.bedrooms')}`}
          >
            <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 17V8a2 2 0 012-2h16a2 2 0 012 2v9M2 17v2a1 1 0 001 1h1m16-3v2a1 1 0 01-1 1h-1M2 17h20M6 12h12a2 2 0 012 2v1H4v-1a2 2 0 012-2z" />
            </svg>
            <span className="font-semibold text-neutral-700 tabular-nums">{safeProperty.beds}</span>
            {t('property:features.bedroomsShort', 'bd')}
          </span>

          <span
            className="inline-flex items-center gap-1"
            aria-label={`${safeProperty.baths} ${safeProperty.baths === 1 ? t('property:features.bathroom') : t('property:features.bathrooms')}`}
          >
            <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M4 12V7a3 3 0 013-3h1M8 4v4M12 4v2m-1 2a1 1 0 102 0 1 1 0 00-2 0z" />
            </svg>
            <span className="font-semibold text-neutral-700 tabular-nums">{safeProperty.baths}</span>
            {t('property:features.bathroomsShort', 'ba')}
          </span>

          <span
            className="inline-flex items-center gap-1"
            aria-label={`${safeProperty.livingRooms} ${safeProperty.livingRooms === 1 ? t('property:features.livingRoom') : t('property:features.livingRooms')}`}
          >
            <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12v6a1 1 0 001 1h2v-4h12v4h2a1 1 0 001-1v-6M3 12V9a3 3 0 013-3h12a3 3 0 013 3v3M7 19v-4m10 4v-4" />
            </svg>
            <span className="font-semibold text-neutral-700 tabular-nums">{safeProperty.livingRooms}</span>
            {t('property:features.livingRoomsShort', 'liv')}
          </span>

          {/* Area keeps the accent — it is the figure this market compares on */}
          <span
            className="inline-flex items-center gap-1 ml-auto"
            aria-label={`${safeProperty.sqft} ${t('common:sqm')}`}
          >
            <svg className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M4 16v4h4M16 4h4v4M16 20h4v-4M9 9h6v6H9z" />
            </svg>
            <span className="font-semibold text-primary tabular-nums">{safeProperty.sqft}</span>
            <span className="text-primary/60">{t('common:sqm')}</span>
          </span>
        </div>

        {/* Luxury Amenity Chips — shown only for luxury-villa */}
        {isLuxuryVilla && luxuryAmenityChips.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {luxuryAmenityChips.map(chip => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[9px] font-medium bg-[#FFA500]/10 text-[#0252CD] border border-[#FFA500]/20"
              >
                <span className="text-[9px]">{chip.emoji}</span>
                {chip.label}
              </span>
            ))}
          </div>
        )}

        {/* Daily Rental Info Strip — check-in/out + cleaning fee for luxury-villa */}
        {isLuxuryVilla && (property.checkInTime || (property.cleaningFee ?? 0) > 0 || property.cancellationPolicy) && (
          <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
            {property.checkInTime && (
              <div className="flex items-center gap-1 text-[9px] text-gray-500">
                <svg className="w-2.5 h-2.5 text-[#FFA500] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{property.checkInTime}{property.checkOutTime ? `–${property.checkOutTime}` : ''}</span>
              </div>
            )}
            {(property.cleaningFee ?? 0) > 0 && (
              <>
                {property.checkInTime && <span className="text-gray-200">·</span>}
                <div className="flex items-center gap-1 text-[9px] text-gray-500">
                  <svg className="w-2.5 h-2.5 text-[#FFA500] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>+€{property.cleaningFee} {t('rental:details.cleaningFee', 'cleaning')}</span>
                </div>
              </>
            )}
            {property.cancellationPolicy && (
              <>
                <span className="text-gray-200">·</span>
                <span className="text-[9px] text-gray-500 capitalize">{property.cancellationPolicy}</span>
              </>
            )}
          </div>
        )}

        <div className="flex-grow"></div>

        {/* Seller/Agent Info Section */}
        <div className="pt-1.5 border-t border-neutral-100">
          <div className="flex items-center gap-1.5">
            {/* Seller Avatar */}
            <div className="relative flex-shrink-0">
              <SellerAvatar
                avatarUrl={safeProperty.seller.avatarUrl}
                name={safeProperty.seller.name}
                type={safeProperty.seller.type}
                size="sm"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>
            </div>

            {/* Seller and agency read as one sentence. The agency used to sit in
                its own bordered chip capped at 72px, which truncated most names
                to a couple of letters; inline it gets the leftover width. */}
            <div className="min-w-0 flex-1 flex items-baseline gap-1 text-[11px]">
              {safeProperty.seller.name && (
                <span className="font-semibold text-neutral-700 truncate flex-shrink-0 max-w-[45%]">{safeProperty.seller.name}</span>
              )}
              <span className="text-neutral-300 flex-shrink-0">·</span>
              <span className={`flex-shrink-0 ${safeProperty.seller.type === 'agent' ? 'text-primary' : 'text-neutral-400'}`}>
                {safeProperty.seller.type === 'agent' ? t('property:seller.agent') : t('property:seller.private')}
              </span>
              {safeProperty.seller.type === 'agent' && safeProperty.seller.agencyName && (
                <span className="text-neutral-400 truncate min-w-0">· {safeProperty.seller.agencyName}</span>
              )}
            </div>

            {/* Agency mark — the logo when the agency has one, the building glyph
                otherwise, so every agency listing carries a visual marker. */}
            {safeProperty.seller.type === 'agent' && safeProperty.seller.agencyName && (
              <div
                className="flex-shrink-0 w-6 h-6 rounded-md border border-neutral-200 bg-white flex items-center justify-center overflow-hidden"
                title={safeProperty.seller.agencyName}
              >
                {safeProperty.seller.agencyLogo ? (
                  <img
                    src={optimizeCloudinaryUrl(safeProperty.seller.agencyLogo, { width: 48, quality: 'auto', crop: 'fit' })}
                    alt={`${safeProperty.seller.agencyName} - Real Estate Agency`}
                    loading="lazy"
                    decoding="async"
                    width={24}
                    height={24}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <BuildingOfficeIcon className="w-3.5 h-3.5 text-primary" />
                )}
              </div>
            )}
          </div>

          {/* iOS-style Compare Button */}
          {showCompareButton && (
            <button
              onClick={onCompareClick}
              className={`mt-2 flex items-center justify-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium transition-colors duration-200 w-full touch-manipulation focus:outline-none active:scale-[0.98] ${
                isInComparison
                  ? 'bg-primary text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
              aria-pressed={isInComparison}
            >
              <ScaleIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isInComparison ? t('property:actions.removeFromCompare') : t('property:actions.addToCompare')}</span>
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
});

PropertyCardInner.displayName = 'PropertyCardInner';

/**
 * Outer connected component - thin wrapper that subscribes to AppContext,
 * extracts primitive/stable values, and passes them to the memoized inner component.
 * When context changes (e.g., savedHomes toggle), this wrapper re-renders but
 * PropertyCardInner only re-renders if its specific props actually changed.
 */
const PropertyCard: React.FC<PropertyCardProps> = ({ property, showToast, showCompareButton, priority }) => {
  const { state, dispatch, toggleSavedHome, updateSearchPageState } = useAppContext();
  const { setDirection } = useNavigationDirection();

  // Defensive check for required fields
  const hasRequiredFields = property && property.id && property.price !== undefined;

  // Extract primitive values from context - these are compared by memo()
  const isFavorited = state.savedHomes.some(p => p.id === property?.id);
  const isInComparison = state.comparisonList.includes(property?.id || '');
  const isAuthenticated = state.isAuthenticated;
  const comparisonCount = state.comparisonList.length;

  // Use refs for values that change often but are only needed in handlers
  // This keeps handler callbacks stable (no dependency on changing state)
  const stateRef = useRef(state);
  stateRef.current = state;

  const toggleSavedHomeRef = useRef(toggleSavedHome);
  toggleSavedHomeRef.current = toggleSavedHome;

  const updateSearchPageStateRef = useRef(updateSearchPageState);
  updateSearchPageStateRef.current = updateSearchPageState;

  // Generate property URL
  const getPropertyUrl = useCallback(() => {
    if (!property?.id) {
      console.warn('PropertyCard: Invalid property ID for URL generation');
      return null;
    }
    try {
      const slug = generatePropertySlug(property);
      if (!slug) {
        console.warn('PropertyCard: Failed to generate property slug');
        return null;
      }
      return buildLocalizedPath(`/property/${slug}`);
    } catch (error) {
      console.error('PropertyCard: Error generating property URL:', error);
      return null;
    }
  }, [property]);

  // Stable handlers using refs - won't cause PropertyCardInner re-renders
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildLocalizedPath(`/property/${generatePropertySlug(property)}`);
    if (shouldOpenInNewTab()) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      dispatch({ type: 'SET_SELECTED_PROPERTY_OBJECT', payload: property });
      window.history.pushState({}, '', url);
    }
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

  const handleCompareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (stateRef.current.comparisonList.includes(property.id)) {
      dispatch({ type: 'REMOVE_FROM_COMPARISON', payload: property.id });
    } else {
      if (stateRef.current.comparisonList.length < 5) {
        dispatch({ type: 'ADD_TO_COMPARISON', payload: property.id });
      } else {
        showToast?.("You can compare a maximum of 5 properties.", 'error');
      }
    }
  }, [dispatch, property.id, showToast]);

  const handleLocationClick = useCallback((e: React.MouseEvent, type: 'city' | 'country') => {
    e.stopPropagation();

    const countryKey = Object.keys(BALKAN_COUNTRIES).find(
      key => BALKAN_COUNTRIES[key].name.toLowerCase() === property.country.toLowerCase()
    ) || '';

    setDirection('back');
    if (type === 'city') {
      const newFilters = {
        ...stateRef.current.searchPageState.filters,
        query: property.city,
        country: countryKey,
      };
      updateSearchPageStateRef.current({
        filters: newFilters,
        activeFilters: newFilters,
      });
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
      window.history.pushState({}, '', `/search?city=${encodeURIComponent(property.city)}&country=${encodeURIComponent(countryKey)}`);
    } else {
      const newFilters = {
        ...stateRef.current.searchPageState.filters,
        query: '',
        country: countryKey,
      };
      updateSearchPageStateRef.current({
        filters: newFilters,
        activeFilters: newFilters,
      });
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
      window.history.pushState({}, '', `/search?country=${encodeURIComponent(countryKey)}`);
    }
  }, [property.city, property.country, dispatch]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Early return for invalid/incomplete properties
  if (!hasRequiredFields) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-lg border-2 border-neutral-200 w-full flex flex-col">
        <div className="w-full h-36 sm:h-40 md:h-44 bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 flex items-center justify-center">
          <BuildingOfficeIcon className="w-10 h-10 text-neutral-400" />
        </div>
        <div className="p-2.5 sm:p-3.5">
          <div className="h-3.5 bg-neutral-200 rounded w-3/4 mb-1.5 animate-pulse" />
          <div className="h-2.5 bg-neutral-200 rounded w-1/2 mb-2.5 animate-pulse" />
          <div className="grid grid-cols-2 xs:grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-9 bg-neutral-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PropertyCardInner
      property={property}
      isFavorited={isFavorited}
      isInComparison={isInComparison}
      isAuthenticated={isAuthenticated}
      comparisonCount={comparisonCount}
      showToast={showToast}
      showCompareButton={showCompareButton}
      priority={priority}
      onCardClick={handleCardClick}
      onFavoriteClick={handleFavoriteClick}
      onCompareClick={handleCompareClick}
      onLocationClick={handleLocationClick}
      onContextMenu={handleContextMenu}
    />
  );
};

export default memo(PropertyCard);
