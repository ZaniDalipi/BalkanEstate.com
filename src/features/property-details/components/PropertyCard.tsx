import React, { useState, useCallback, memo, useRef } from 'react';
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
import { optimizeCloudinaryUrl, cloudinarySrcSet } from '@/config/cloudinaryConfig';

interface PropertyCardProps {
  property: Property;
  showToast?: (message: string, type: 'success' | 'error') => void;
  showCompareButton?: boolean;
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
  onCardClick: (e: React.MouseEvent) => void;
  onFavoriteClick: (e: React.MouseEvent) => void;
  onCompareClick: (e: React.MouseEvent) => void;
  onLocationClick: (e: React.MouseEvent, type: 'city' | 'country') => void;
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
    ? 'w-8 h-8'
    : 'w-10 h-10';
  const iconSize = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

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
 * This prevents the "everything refreshes" issue when toggling favorites.
 */
const PropertyCardInner = memo<PropertyCardInnerProps>(({
  property,
  isFavorited,
  isInComparison,
  showToast,
  showCompareButton,
  onCardClick,
  onFavoriteClick,
  onCompareClick,
  onLocationClick,
}) => {
  const { t, i18n } = useTranslation(['property', 'rental', 'common']);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Safe access with fallbacks
  const safeProperty = {
    ...property,
    city: property?.city || 'Unknown',
    country: property?.country || 'Unknown',
    beds: property?.beds ?? 0,
    baths: property?.baths ?? 0,
    livingRooms: property?.livingRooms ?? 0,
    sqft: property?.sqft ?? 0,
    seller: property?.seller || { type: 'private' as const, name: 'Unknown', phone: '' },
  };

  const isNew = property?.createdAt && (Date.now() - property.createdAt < 3 * 24 * 60 * 60 * 1000);
  const isPriceReduced = property?.originalPrice !== undefined && property?.originalPrice > property?.price;
  const isSold = property?.status === 'sold';
  // Treat rental as expired (property available) if rentedUntil date has passed
  const isRentalExpired = property?.status === 'rented' && property?.rentedUntil && new Date(property.rentedUntil) <= new Date();
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
    return 'border-neutral-200 hover:border-primary/30';
  };

  return (
    <div
      className={`group bg-white rounded-2xl overflow-hidden shadow-sm border transition-all duration-300 text-left w-full flex flex-col cursor-pointer isolate ${getCardStyles()} ${
        isHovered && !isSold && !isRented ? 'shadow-lg -translate-y-1 scale-[1.01]' : 'hover:shadow-md'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onCardClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(e as any); } }}
      role="article"
      tabIndex={0}
      aria-label={`${property.title || propertyTypeLabel}, ${formatPrice(property.price, property.country)}${isRental ? '/mo' : ''}, ${safeProperty.city}, ${safeProperty.country}`}
    >
      {/* Image Section */}
      <div className="relative overflow-hidden">
        {imageError ? (
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 flex items-center justify-center">
            <BuildingOfficeIcon className="w-10 h-10 text-neutral-400" />
          </div>
        ) : (
          <div className="relative w-full aspect-[4/3] overflow-hidden bg-neutral-200">
            {/* Blurred background - fills any gaps from object-cover edge cases */}
            <img
              src={optimizeCloudinaryUrl(property.imageUrl, { width: 100, quality: 'auto:low', crop: 'fill' })}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              width={100}
              height={75}
              className="absolute inset-0 w-full h-full object-cover blur-2xl scale-150 opacity-80"
            />
            {/* Main image - server-cropped to 4:3 for consistent cards */}
            <img
              src={optimizeCloudinaryUrl(property.imageUrl, { width: 640, height: 480, quality: 'auto', crop: 'fill', gravity: 'auto' })}
              srcSet={`${optimizeCloudinaryUrl(property.imageUrl, { width: 320, height: 240, quality: 'auto', crop: 'fill', gravity: 'auto' })} 320w, ${optimizeCloudinaryUrl(property.imageUrl, { width: 480, height: 360, quality: 'auto', crop: 'fill', gravity: 'auto' })} 480w, ${optimizeCloudinaryUrl(property.imageUrl, { width: 640, height: 480, quality: 'auto', crop: 'fill', gravity: 'auto' })} 640w`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              alt={`${property.title || propertyTypeLabel} - ${property.beds} bed, ${property.baths} bath ${propertyTypeLabel} for ${isRental ? 'rent' : 'sale'} in ${property.city}, ${property.country}`}
              loading="lazy"
              decoding="async"
              width={640}
              height={480}
              className={`relative w-full h-full object-cover transition-transform duration-700 ${
                isHovered && !isSold && !isRented ? 'scale-110' : 'scale-100'
              } ${isSold || isRented ? 'grayscale' : ''}`}
              onError={() => setImageError(true)}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>
        )}

        {/* Top badges row */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
          <div className="flex flex-col gap-1.5">
            {/* iOS-style Listing Type Badge */}
            {isRental ? (
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
                  t('rental:status.availableBadge', { date: new Date(property.rentedUntil).toLocaleDateString(i18n.language === 'me' ? 'sr-Latn-ME' : i18n.language === 'sq' ? 'sq-AL' : i18n.language, { month: 'short', year: 'numeric' }).toUpperCase() })
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
          </div>

          {/* iOS-style Favorite Button - frosted glass */}
          <button
            onClick={onFavoriteClick}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 touch-manipulation focus:outline-none active:scale-90 ${
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
      <div className="relative p-2.5 sm:p-3.5 flex flex-col flex-grow">
        {/* Glass background layer - sits behind all content */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-0" />

        {/* Content wrapper - on top of glass */}
        <div className="relative z-10 flex flex-col flex-grow">
        {/* Property Type & Price Row - iOS style */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Property Type Badge */}
          <span className="bg-neutral-100 text-neutral-600 text-[11px] font-medium px-2 py-[3px] rounded-full">
            {propertyTypeLabel}
          </span>
          {/* Price Badge */}
          {(() => {
            const priceInfo = getPriceReductionInfo(property);
            return (
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {(priceInfo.hasReduction || priceInfo.hasIncrease) && (
                    <span className="text-[11px] text-neutral-400 line-through">
                      {formatPrice(priceInfo.originalPrice, property.country)}
                    </span>
                  )}
                  <span className="text-primary text-sm sm:text-base font-bold tracking-tight">
                    {formatPrice(property.price, property.country)}
                    {isRental && <span className="text-[11px] font-normal text-neutral-400">/{property.rentPeriod === 'weekly' ? t('common:wk', 'wk') : property.rentPeriod === 'daily' ? t('common:day', 'day') : t('common:mo', 'mo')}</span>}
                  </span>
                  {priceInfo.hasReduction && (
                    <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      -{priceInfo.discountPercentage}%
                    </span>
                  )}
                  {priceInfo.hasIncrease && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      +{priceInfo.increasePercentage}%
                    </span>
                  )}
                </div>
                {safeProperty.sqft > 0 && property.propertyType !== 'land' && (
                  <p className="text-[10px] text-neutral-400 font-medium">
                    {formatPrice(Math.round(property.price / safeProperty.sqft), property.country)} per m²
                  </p>
                )}
              </div>
            );
          })()}
        </div>
        {/* Title */}
        {property.title && (
          <h3 className="text-sm sm:text-base font-bold text-neutral-900 mb-1.5 line-clamp-1 group-hover:text-primary transition-colors duration-300">
            {property.title}
          </h3>
        )}

        {/* Location - Clickable for navigation */}
        <div className="flex items-center gap-1.5 mb-3">
          <MapPinIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <div className="text-xs sm:text-sm text-neutral-600 truncate flex items-center gap-1">
            <button
              onClick={(e) => onLocationClick(e, 'city')}
              className="hover:text-primary hover:underline transition-colors cursor-pointer"
              aria-label={`View all properties in ${safeProperty.city}`}
            >
              {safeProperty.city}
            </button>
            <span>,</span>
            <button
              onClick={(e) => onLocationClick(e, 'country')}
              className="hover:text-primary hover:underline transition-colors cursor-pointer"
              aria-label={`View all properties in ${safeProperty.country}`}
            >
              {safeProperty.country}
            </button>
          </div>
        </div>

        {/* Property Stats - Liquid Glass Design */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          {/* Beds */}
          <div
            className="group relative flex flex-col items-center py-2 px-1 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[0_4px_12px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-blue-200/60 transition-all duration-300"
            aria-label={`${safeProperty.beds} ${t('property:features.bedrooms')}`}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <svg className="w-4 h-4 text-blue-500 mb-1 relative z-10 drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 17V8a2 2 0 012-2h16a2 2 0 012 2v9M2 17v2a1 1 0 001 1h1m16-3v2a1 1 0 01-1 1h-1M2 17h20M6 12h12a2 2 0 012 2v1H4v-1a2 2 0 012-2z" />
            </svg>
            <span className="font-bold text-xs text-neutral-700 relative z-10">{safeProperty.beds}</span>
          </div>

          {/* Baths */}
          <div
            className="group relative flex flex-col items-center py-2 px-1 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[0_4px_12px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-emerald-200/60 transition-all duration-300"
            aria-label={`${safeProperty.baths} ${t('property:features.bathrooms')}`}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <svg className="w-4 h-4 text-emerald-500 mb-1 relative z-10 drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M4 12V7a3 3 0 013-3h1M8 4v4M12 4v2m-1 2a1 1 0 102 0 1 1 0 00-2 0z" />
            </svg>
            <span className="font-bold text-xs text-neutral-700 relative z-10">{safeProperty.baths}</span>
          </div>

          {/* Living Rooms */}
          <div
            className="group relative flex flex-col items-center py-2 px-1 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[0_4px_12px_rgba(168,85,247,0.15),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-purple-200/60 transition-all duration-300"
            aria-label={`${safeProperty.livingRooms} ${t('property:features.livingRooms')}`}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <svg className="w-4 h-4 text-purple-500 mb-1 relative z-10 drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12v6a1 1 0 001 1h2v-4h12v4h2a1 1 0 001-1v-6M3 12V9a3 3 0 013-3h12a3 3 0 013 3v3M7 19v-4m10 4v-4" />
            </svg>
            <span className="font-bold text-xs text-neutral-700 relative z-10">{safeProperty.livingRooms}</span>
          </div>

          {/* Sqft - Highlighted */}
          <div
            className="group relative flex flex-col items-center py-2 px-1 rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-md border border-blue-200/60 shadow-[0_2px_8px_rgba(59,130,246,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] hover:shadow-[0_4px_12px_rgba(59,130,246,0.2),inset_0_1px_0_rgba(255,255,255,1)] hover:border-blue-300/70 transition-all duration-300"
            aria-label={`${safeProperty.sqft} ${t('common:sqm')}`}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-100/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <svg className="w-4 h-4 text-blue-600 mb-1 relative z-10 drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M4 16v4h4M16 4h4v4M16 20h4v-4M9 9h6v6H9z" />
            </svg>
            <span className="font-bold text-xs text-blue-600 relative z-10">{safeProperty.sqft}</span>
          </div>
        </div>

        <div className="flex-grow"></div>

        {/* Seller/Agent Info Section */}
        <div className="pt-3 border-t border-neutral-100">
          <div className="flex items-center gap-2">
            {/* Seller Avatar */}
            <div className="relative flex-shrink-0">
              <SellerAvatar
                avatarUrl={safeProperty.seller.avatarUrl}
                name={safeProperty.seller.name}
                type={safeProperty.seller.type}
                size="sm"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
            </div>

            {/* Seller Info */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-neutral-800 truncate">{safeProperty.seller.name}</p>
              <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-[1px] rounded-full ${
                safeProperty.seller.type === 'agent'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-neutral-50 text-neutral-500'
              }`}>
                {safeProperty.seller.type === 'agent' ? t('property:seller.agent') : t('property:seller.private')}
              </span>
            </div>

            {/* Agency Logo (if agent with agency) */}
            {safeProperty.seller.type === 'agent' && safeProperty.seller.agencyName && (
              <div className="flex items-center gap-1.5 flex-shrink-0 bg-neutral-50 px-2 py-1.5 rounded-lg border border-neutral-200">
                {safeProperty.seller.agencyLogo ? (
                  <img
                    src={optimizeCloudinaryUrl(safeProperty.seller.agencyLogo, { width: 48, quality: 'auto', crop: 'fill' })}
                    alt={`${safeProperty.seller.agencyName} - Real Estate Agency`}
                    loading="lazy"
                    decoding="async"
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded object-contain bg-white"
                  />
                ) : (
                  <BuildingOfficeIcon className="w-5 h-5 text-primary" />
                )}
                <div className="hidden sm:block">
                  <p className="text-[9px] text-neutral-500 leading-none">{t('property:seller.agency')}</p>
                  <p className="text-[10px] font-medium text-neutral-700 truncate max-w-[60px]">{safeProperty.seller.agencyName}</p>
                </div>
              </div>
            )}
          </div>

          {/* iOS-style Compare Button */}
          {showCompareButton && (
            <button
              onClick={onCompareClick}
              className={`mt-2.5 flex items-center justify-center gap-1.5 h-10 px-4 rounded-full text-[13px] font-medium transition-all duration-200 w-full touch-manipulation focus:outline-none active:scale-[0.98] ${
                isInComparison
                  ? 'bg-primary text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
              aria-pressed={isInComparison}
            >
              <ScaleIcon className="w-4 h-4" aria-hidden="true" />
              <span>{isInComparison ? t('property:actions.removeFromCompare') : t('property:actions.addToCompare')}</span>
            </button>
          )}
        </div>
        </div>{/* Close content wrapper */}
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
const PropertyCard: React.FC<PropertyCardProps> = ({ property, showToast, showCompareButton }) => {
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

  // Stable handlers using refs - won't cause PropertyCardInner re-renders
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
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
      onCardClick={handleCardClick}
      onFavoriteClick={handleFavoriteClick}
      onCompareClick={handleCompareClick}
      onLocationClick={handleLocationClick}
    />
  );
};

export default memo(PropertyCard);
