import React, { useState, useCallback, memo } from 'react';
import { Property } from '../../../types';
import { MapPinIcon, BedIcon, BathIcon, SqftIcon, UserCircleIcon, ScaleIcon, LivingRoomIcon, BuildingOfficeIcon } from '../../../constants';
import { useAppContext } from '../../../context/AppContext';
import { formatPrice } from '../../../utils/currency';

interface PropertyCardProps {
  property: Property;
  showToast?: (message: string, type: 'success' | 'error') => void;
  showCompareButton?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, showToast, showCompareButton }) => {
  const { state, dispatch, toggleSavedHome } = useAppContext();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isFavorited = state.savedHomes.some(p => p.id === property.id);
  const isInComparison = state.comparisonList.includes(property.id);
  const isNew = property.createdAt && (Date.now() - property.createdAt < 3 * 24 * 60 * 60 * 1000);
  const isSold = property.status === 'sold';

  // Check if property has an active promotion
  const isActivelyPromoted = property.isPromoted &&
    property.promotionEndDate &&
    property.promotionEndDate > Date.now();
  const promotionTier = isActivelyPromoted ? property.promotionTier : null;

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleCompareClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      if (isInComparison) {
          dispatch({ type: 'REMOVE_FROM_COMPARISON', payload: property.id });
      } else {
          if (state.comparisonList.length < 5) {
              dispatch({ type: 'ADD_TO_COMPARISON', payload: property.id });
          } else {
              showToast?.("You can compare a maximum of 5 properties.", 'error');
          }
      }
  }, [isInComparison, dispatch, property.id, state.comparisonList.length, showToast]);

  // Property type labels (short versions for mobile)
  const propertyTypeLabel = {
    apartment: 'Apt',
    house: 'House',
    villa: 'Villa',
    land: 'Land',
    commercial: 'Comm',
  }[property.propertyType] || 'Property';

  // Determine card styles based on promotion tier
  const getCardStyles = () => {
    if (isSold) return 'border-neutral-300 opacity-80';
    if (isActivelyPromoted) {
      if (promotionTier === 'premium') return 'ring-2 ring-purple-400 border-purple-200 shadow-purple-100';
      if (promotionTier === 'highlight') return 'ring-2 ring-amber-400 border-amber-200 shadow-amber-100';
      if (promotionTier === 'featured') return 'ring-2 ring-blue-400 border-blue-200 shadow-blue-100';
      return 'ring-1 ring-gray-400 border-gray-200';
    }
    return 'border-neutral-200 hover:border-primary/30';
  };

  return (
    <div
      className={`group bg-white rounded-2xl overflow-hidden shadow-lg border-2 transition-all duration-500 text-left w-full flex flex-col cursor-pointer ${getCardStyles()} ${
        isHovered && !isSold ? 'shadow-2xl -translate-y-2 scale-[1.02]' : 'hover:shadow-xl'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image Section */}
      <div className="relative overflow-hidden">
        {imageError ? (
          <div className="w-full h-40 sm:h-44 md:h-48 bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 flex items-center justify-center">
            <BuildingOfficeIcon className="w-12 h-12 text-neutral-400" />
          </div>
        ) : (
          <div className="relative w-full h-40 sm:h-44 md:h-48 overflow-hidden">
            <img
              src={property.imageUrl}
              alt={property.address}
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isHovered && !isSold ? 'scale-110' : 'scale-100'
              } ${isSold ? 'grayscale' : ''}`}
              onError={() => setImageError(true)}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        )}

        {/* Top badges row */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10">
          <div className="flex flex-col gap-1.5">
            {/* Sold Badge */}
            {isSold && (
              <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                SOLD
              </div>
            )}

            {/* New Badge */}
            {!isSold && isNew && !isActivelyPromoted && (
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                </span>
                NEW
              </div>
            )}

            {/* Promotion Badges */}
            {!isSold && isActivelyPromoted && promotionTier && (
              <div className={`text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1 ${
                promotionTier === 'premium'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600'
                  : promotionTier === 'highlight'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500'
                  : promotionTier === 'featured'
                  ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500'
                  : 'bg-gradient-to-r from-gray-600 to-gray-700'
              }`}>
                <span className="text-xs">✨</span>
                {promotionTier === 'premium' && 'PREMIUM'}
                {promotionTier === 'highlight' && 'HIGHLIGHT'}
                {promotionTier === 'featured' && 'FEATURED'}
                {promotionTier === 'standard' && 'PROMOTED'}
              </div>
            )}

            {/* Urgent Badge */}
            {!isSold && isActivelyPromoted && property.hasUrgentBadge && (
              <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg animate-pulse flex items-center gap-1">
                🔥 URGENT
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
            onClick={handleFavoriteClick}
            className={`p-2 rounded-full shadow-lg transition-all duration-300 ${
              isFavorited
                ? 'bg-red-500 text-white scale-110'
                : 'bg-white/95 backdrop-blur-sm text-neutral-600 hover:bg-red-500 hover:text-white hover:scale-110'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-300 ${isFavorited ? 'fill-current scale-110' : ''}`} fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Bottom info bar on image */}
        <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
          <div className="flex items-center justify-between gap-2">
            {/* Property Type Badge */}
            <span className="bg-white/95 backdrop-blur-sm text-neutral-800 text-[10px] font-semibold px-2 py-1 rounded-md shadow-md">
              {propertyTypeLabel}
            </span>
            {/* Price Badge */}
            <span className="bg-gradient-to-r from-primary to-primary-dark text-white text-xs sm:text-sm font-bold px-2.5 py-1 rounded-md shadow-lg">
              {formatPrice(property.price, property.country)}
            </span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        {/* Title */}
        {property.title && (
          <h3 className="text-sm sm:text-base font-bold text-neutral-900 mb-1.5 line-clamp-1 group-hover:text-primary transition-colors duration-300">
            {property.title}
          </h3>
        )}

        {/* Location */}
        <div className="flex items-center gap-1.5 mb-3">
          <MapPinIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-xs sm:text-sm text-neutral-600 truncate">
            {property.city}, {property.country}
          </span>
        </div>

        {/* Property Stats - Grid layout for better fit */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <div className="flex flex-col items-center bg-neutral-100 py-1.5 px-1 rounded-lg" title={`${property.beds} bedrooms`}>
            <BedIcon className="w-3.5 h-3.5 text-primary mb-0.5" />
            <span className="font-bold text-xs text-neutral-800">{property.beds}</span>
          </div>
          <div className="flex flex-col items-center bg-neutral-100 py-1.5 px-1 rounded-lg" title={`${property.baths} bathrooms`}>
            <BathIcon className="w-3.5 h-3.5 text-primary mb-0.5" />
            <span className="font-bold text-xs text-neutral-800">{property.baths}</span>
          </div>
          <div className="flex flex-col items-center bg-neutral-100 py-1.5 px-1 rounded-lg" title={`${property.livingRooms} living rooms`}>
            <LivingRoomIcon className="w-3.5 h-3.5 text-primary mb-0.5" />
            <span className="font-bold text-xs text-neutral-800">{property.livingRooms}</span>
          </div>
          <div className="flex flex-col items-center bg-primary/10 py-1.5 px-1 rounded-lg border border-primary/20" title={`${property.sqft} m²`}>
            <SqftIcon className="w-3.5 h-3.5 text-primary mb-0.5" />
            <span className="font-bold text-xs text-primary">{property.sqft}</span>
          </div>
        </div>

        <div className="flex-grow"></div>

        {/* Seller/Agent Info Section */}
        <div className="pt-3 border-t border-neutral-100">
          <div className="flex items-center gap-2">
            {/* Seller Avatar */}
            <div className="relative flex-shrink-0">
              {property.seller.avatarUrl ? (
                <img
                  src={property.seller.avatarUrl}
                  alt={property.seller.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-white shadow"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow border-2 border-white">
                  <UserCircleIcon className="w-5 h-5 text-primary" />
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
            </div>

            {/* Seller Info */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-neutral-800 truncate">{property.seller.name}</p>
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                property.seller.type === 'agent'
                  ? 'bg-blue-500 text-white'
                  : 'bg-neutral-200 text-neutral-600'
              }`}>
                {property.seller.type === 'agent' ? 'Agent' : 'Private'}
              </span>
            </div>

            {/* Agency Logo (if agent with agency) */}
            {property.seller.type === 'agent' && property.seller.agencyName && (
              <div className="flex items-center gap-1.5 flex-shrink-0 bg-neutral-50 px-2 py-1.5 rounded-lg border border-neutral-200">
                {property.seller.agencyLogo ? (
                  <img
                    src={property.seller.agencyLogo}
                    alt={property.seller.agencyName}
                    className="w-6 h-6 rounded object-contain bg-white"
                  />
                ) : (
                  <BuildingOfficeIcon className="w-5 h-5 text-primary" />
                )}
                <div className="hidden sm:block">
                  <p className="text-[9px] text-neutral-500 leading-none">Agency</p>
                  <p className="text-[10px] font-medium text-neutral-700 truncate max-w-[60px]">{property.seller.agencyName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Compare Button (if enabled) */}
          {showCompareButton && (
            <button
              onClick={handleCompareClick}
              className={`mt-2.5 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 w-full ${
                isInComparison
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-primary hover:text-white'
              }`}
            >
              <ScaleIcon className="w-4 h-4" />
              <span>{isInComparison ? 'In Compare' : 'Add to Compare'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(PropertyCard);
