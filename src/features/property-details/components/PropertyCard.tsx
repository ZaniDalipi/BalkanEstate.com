import React, { useState, useCallback, memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { MapPinIcon, BedIcon, BathIcon, SqftIcon, UserCircleIcon, ScaleIcon, LivingRoomIcon, BuildingOfficeIcon, StarIconSolid, FireIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { formatPrice } from '@/utils/currency';
import { BALKAN_COUNTRIES } from '@/constants/countries';

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
  const isSold = property?.status === 'sold';
  const isRented = property?.status === 'rented';
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
      className={`group bg-white rounded-2xl overflow-hidden shadow-lg border-2 transition-all duration-500 text-left w-full flex flex-col cursor-pointer isolate ${getCardStyles()} ${
        isHovered && !isSold && !isRented ? 'shadow-2xl -translate-y-2 scale-[1.02]' : 'hover:shadow-xl'
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
          <div className="w-full h-36 sm:h-40 md:h-44 bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 flex items-center justify-center">
            <BuildingOfficeIcon className="w-10 h-10 text-neutral-400" />
          </div>
        ) : (
          <div className="relative w-full h-36 sm:h-40 md:h-44 overflow-hidden">
            {/* Blurred background - same image fills empty space */}
            <img
              src={property.imageUrl}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125"
            />
            {/* Main image - contained to show full image */}
            <img
              src={property.imageUrl}
              alt={`${property.title || propertyTypeLabel} - ${property.beds} bed, ${property.baths} bath ${propertyTypeLabel} for ${isRental ? 'rent' : 'sale'} in ${property.city}, ${property.country}`}
              loading="lazy"
              decoding="async"
              className={`relative w-full h-full object-contain transition-transform duration-700 ${
                isHovered && !isSold && !isRented ? 'scale-110' : 'scale-100'
              } ${isSold || isRented ? 'grayscale' : ''}`}
              onError={() => setImageError(true)}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        )}

        {/* Top badges row */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
          <div className="flex flex-col gap-1.5">
            {/* Listing Type Badge */}
            {isRental ? (
              <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                {t('property:forRent', 'FOR RENT').toUpperCase()}
              </div>
            ) : (
              <div className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {t('property:forSale', 'FOR SALE').toUpperCase()}
              </div>
            )}

            {/* Sold Badge */}
            {isSold && (
              <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                {t('property:sold').toUpperCase()}
              </div>
            )}

            {/* Rented Badge */}
            {isRented && (
              <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                {property?.rentedUntil ? (
                  t('rental:status.availableBadge', { date: new Date(property.rentedUntil).toLocaleDateString(i18n.language === 'me' ? 'sr-Latn-ME' : i18n.language === 'sq' ? 'sq-AL' : i18n.language, { month: 'short', year: 'numeric' }).toUpperCase() })
                ) : (
                  t('property:rented', 'RENTED').toUpperCase()
                )}
              </div>
            )}

            {/* New Badge */}
            {!isSold && !isRented && isNew && !isActivelyPromoted && (
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                </span>
                {t('property:status.new').toUpperCase()}
              </div>
            )}

            {/* Promotion Badges - Premium = Gold, Highlight = Light Blue, Featured = Pink */}
            {!isSold && isActivelyPromoted && promotionTier && (
              <div className={`text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1 ${
                promotionTier === 'premium'
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400 animate-pulse'
                  : promotionTier === 'highlight'
                  ? 'bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400'
                  : promotionTier === 'featured'
                  ? 'bg-gradient-to-r from-violet-600 via-purple-500 to-violet-400'
                  : 'bg-gradient-to-r from-gray-600 to-gray-700'
              }`}>
                <StarIconSolid className="w-3 h-3" />
                {promotionTier === 'premium' && t('property:map.tiers.premium', 'PREMIUM').toUpperCase()}
                {promotionTier === 'highlight' && t('property:map.tiers.highlight', 'HIGHLIGHT').toUpperCase()}
                {promotionTier === 'featured' && t('property:map.tiers.featured', 'FEATURED').toUpperCase()}
                {promotionTier === 'standard' && 'PROMOTED'}
              </div>
            )}

            {/* Urgent Badge */}
            {!isSold && isActivelyPromoted && property.hasUrgentBadge && (
              <div
                className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded-md animate-pulse flex items-center gap-1"
                style={{ boxShadow: '0 0 12px 2px rgba(239, 68, 68, 0.6), 0 0 20px 4px rgba(239, 68, 68, 0.3)' }}
              >
                <FireIcon className="w-3 h-3" /> {t('property:status.urgent').toUpperCase()}
              </div>
            )}

            {/* 360° Tour Badge */}
            {property.virtualTour360Url && (
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1"
                title="360° Virtual Tour Available"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12h20" />
                </svg>
                <span>360°</span>
              </div>
            )}
          </div>

          {/* Favorite Button */}
          <button
            onClick={onFavoriteClick}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full shadow-lg transition-all duration-300 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500/50 ${
              isFavorited
                ? 'bg-red-500 text-white scale-110'
                : 'bg-white/95 backdrop-blur-sm text-neutral-600 hover:bg-red-500 hover:text-white hover:scale-110 active:scale-105'
            }`}
            aria-label={isFavorited ? t('property:actions.removeFromFavorites', 'Remove from favorites') : t('property:actions.addToFavorites', 'Add to favorites')}
            aria-pressed={isFavorited}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${isFavorited ? 'fill-current scale-110' : ''}`} fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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
        {/* Property Type & Price Row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Property Type Badge */}
          <span className="bg-neutral-100 text-neutral-800 text-[10px] font-semibold px-2 py-1 rounded-md border border-neutral-200">
            {propertyTypeLabel}
          </span>
          {/* Price Badge */}
          <span className="bg-gradient-to-r from-primary to-primary-dark text-white text-xs sm:text-sm font-bold px-2.5 py-1 rounded-md shadow-md">
            {formatPrice(property.price, property.country)}
            {isRental && <span className="text-[10px] font-normal opacity-80">/{property.rentPeriod === 'weekly' ? t('common:wk', 'wk') : property.rentPeriod === 'daily' ? t('common:day', 'day') : t('common:mo', 'mo')}</span>}
          </span>
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
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                safeProperty.seller.type === 'agent'
                  ? 'bg-blue-500 text-white'
                  : 'bg-neutral-200 text-neutral-600'
              }`}>
                {safeProperty.seller.type === 'agent' ? t('property:seller.agent') : t('property:seller.private')}
              </span>
            </div>

            {/* Agency Logo (if agent with agency) */}
            {safeProperty.seller.type === 'agent' && safeProperty.seller.agencyName && (
              <div className="flex items-center gap-1.5 flex-shrink-0 bg-neutral-50 px-2 py-1.5 rounded-lg border border-neutral-200">
                {safeProperty.seller.agencyLogo ? (
                  <img
                    src={safeProperty.seller.agencyLogo}
                    alt={`${safeProperty.seller.agencyName} - Real Estate Agency`}
                    loading="lazy"
                    decoding="async"
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

          {/* Compare Button (if enabled) */}
          {showCompareButton && (
            <button
              onClick={onCompareClick}
              className={`mt-2.5 flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 w-full touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 ${
                isInComparison
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-primary hover:text-white active:bg-primary-dark'
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
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: property.id });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'property-details' });
    window.history.pushState({ propertyId: property.id }, '', `/property/${property.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [dispatch, property.id]);

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
