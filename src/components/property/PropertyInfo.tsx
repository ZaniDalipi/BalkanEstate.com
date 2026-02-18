// PropertyInfo Component
// Displays property details, description, and amenities

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../../types';
import { formatPrice } from '../../../utils/currency';
import { getPriceReductionInfo } from '../../../utils/priceUtils';
import {
  MapPinIcon,
  BedIcon,
  BathIcon,
  SqftIcon,
  CalendarIcon,
  ParkingIcon,
  StarIcon,
  CubeIcon,
  BuildingOfficeIcon,
  CubeTransparentIcon,
  LivingRoomIcon,
  CheckCircleIcon,
} from '../../../constants';
import { DetailItem } from './PropertyCommon';
import { useAppContext } from '../../../context/AppContext';
import { BALKAN_COUNTRIES } from '../../../constants/countries';

interface PropertyInfoProps {
  property: Property;
  onOpenFloorPlan: () => void;
}

/**
 * PropertyInfo Component
 *
 * Comprehensive property information display including:
 * - Price and address
 * - Key stats (beds, baths, sqft)
 * - Description
 * - Detailed property information
 * - Amenities and features
 * - Distance information
 *
 * Usage:
 * ```tsx
 * <PropertyInfo
 *   property={property}
 *   onOpenFloorPlan={() => setFloorPlanOpen(true)}
 * />
 * ```
 */
export const PropertyInfo: React.FC<PropertyInfoProps> = ({ property, onOpenFloorPlan }) => {
  const { t } = useTranslation(['property']);
  const { state, dispatch, updateSearchPageState } = useAppContext();

  // Handle location click to navigate to search with city/country filter
  const handleLocationClick = useCallback((e: React.MouseEvent, type: 'city' | 'country') => {
    e.preventDefault();
    e.stopPropagation();

    // Find the country key from BALKAN_COUNTRIES
    const countryKey = Object.keys(BALKAN_COUNTRIES).find(
      key => BALKAN_COUNTRIES[key].name.toLowerCase() === property.country.toLowerCase()
    ) || '';

    if (type === 'city') {
      // Navigate to search with city filter
      const newFilters = {
        ...state.searchPageState.filters,
        query: property.city,
        country: countryKey,
      };
      updateSearchPageState({
        filters: newFilters,
        activeFilters: newFilters,
      });
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
      window.history.pushState({}, '', `/search?city=${encodeURIComponent(property.city)}&country=${encodeURIComponent(countryKey)}`);
    } else {
      // Navigate to search with country filter only
      const newFilters = {
        ...state.searchPageState.filters,
        query: '',
        country: countryKey,
      };
      updateSearchPageState({
        filters: newFilters,
        activeFilters: newFilters,
      });
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
      window.history.pushState({}, '', `/search?country=${encodeURIComponent(countryKey)}`);
    }
  }, [property.city, property.country, state.searchPageState.filters, updateSearchPageState, dispatch]);

  return (
    <div className="space-y-6">
      {/* Price, Address, and Key Stats */}
      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 overflow-hidden">
        {/* Glass highlight */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="relative p-6">
          {property.status === 'sold' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-neutral-100 to-neutral-200 border-l-4 border-neutral-600 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-6 h-6 text-neutral-700" />
                <span className="font-bold text-lg text-neutral-800">{t('actions.propertySold')}</span>
              </div>
              <p className="text-sm text-neutral-600 mt-1">
                {t('details.soldMessage')}
              </p>
            </div>
          )}

          {property.title && (
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">
              {property.title}
            </h1>
          )}

          {(() => {
            const priceInfo = getPriceReductionInfo(property);
            return (
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">
                  {formatPrice(property.price, property.country)}
                  {property.listingType === 'rent' && (
                    <span className="text-base sm:text-lg font-normal text-neutral-400">
                      /{property.rentPeriod === 'weekly' ? 'wk' : property.rentPeriod === 'daily' ? 'day' : 'mo'}
                    </span>
                  )}
                </p>
                {priceInfo.hasReduction && (
                  <>
                    <span className="text-base sm:text-lg text-neutral-400 line-through">
                      {formatPrice(priceInfo.originalPrice, property.country)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs sm:text-sm font-semibold">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      -{priceInfo.discountPercentage}%
                    </span>
                  </>
                )}
                {priceInfo.hasIncrease && (
                  <>
                    <span className="text-base sm:text-lg text-neutral-400 line-through">
                      {formatPrice(priceInfo.originalPrice, property.country)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs sm:text-sm font-semibold">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      +{priceInfo.increasePercentage}%
                    </span>
                  </>
                )}
              </div>
            );
          })()}

          <div className="inline-flex items-center text-neutral-600 mt-2 flex-wrap">
            <MapPinIcon className="w-5 h-5 mr-2 text-neutral-400 flex-shrink-0" />
            <span className="text-sm sm:text-base lg:text-lg">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${property.lat},${property.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline hover:text-primary transition-colors"
                title="Open in Google Maps"
              >
                {property.address}
              </a>
              <span>, </span>
              <button
                onClick={(e) => handleLocationClick(e, 'city')}
                className="hover:underline hover:text-primary transition-colors cursor-pointer"
                title={`View all properties in ${property.city}`}
              >
                {property.city}
              </button>
              <span>, </span>
              <button
                onClick={(e) => handleLocationClick(e, 'country')}
                className="hover:underline hover:text-primary transition-colors cursor-pointer"
                title={`View all properties in ${property.country}`}
              >
                {property.country}
              </button>
            </span>
          </div>

          <div className="mt-6 flex flex-wrap justify-around text-base sm:text-lg text-neutral-800 border-t border-neutral-200 pt-4 gap-4">
            {property.propertyType !== 'land' && (
              <>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary-light/50 transition-all duration-200 cursor-default group">
                  <BedIcon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                  <span>
                    <span className="font-bold">{property.beds}</span> {t('features.beds').toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary-light/50 transition-all duration-200 cursor-default group">
                  <BathIcon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                  <span>
                    <span className="font-bold">{property.baths}</span> {t('features.baths').toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary-light/50 transition-all duration-200 cursor-default group">
                  <LivingRoomIcon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                  <span>
                    <span className="font-bold">{property.livingRooms}</span>{' '}
                    {property.livingRooms === 1 ? t('details.livingRoom') : t('details.livingRoomPlural')}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary-light/50 transition-all duration-200 cursor-default group">
              <SqftIcon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <span>
                <span className="font-bold">{property.sqft}</span> m²
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* About This Home */}
      <div className="relative bg-white/70 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 overflow-hidden">
        {/* Glass effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="relative flex items-center gap-3 mb-5">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/80 to-emerald-50/60 backdrop-blur-sm border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-neutral-900">{t('details.about')}</h3>
        </div>
        <div className="relative prose prose-neutral max-w-none text-neutral-600 leading-relaxed whitespace-pre-wrap">
          {property.description}
        </div>
      </div>

      {/* Property Details */}
      <div className="relative bg-white/70 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-50/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

        <div className="relative flex items-center gap-3 mb-5">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/80 to-primary/5 backdrop-blur-sm border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center">
            <svg className="w-5 h-5 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900">{t('details.title')}</h3>
            <p className="text-xs text-neutral-400">{t('details.subtitle')}</p>
          </div>
        </div>

        <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          <DetailItem icon={<CalendarIcon />} label={t('features.yearBuilt')}>
            {property.yearBuilt}
          </DetailItem>
          <DetailItem icon={<ParkingIcon />} label={t('features.parking')}>
            {property.parking > 0
              ? `${property.parking} ${property.parking === 1 ? t('details.spot') : t('details.spots')}`
              : t('details.none')}
          </DetailItem>

          {property.propertyType === 'apartment' && property.floorNumber && (
            <DetailItem icon={<BuildingOfficeIcon />} label={t('features.floor')}>
              {property.floorNumber}
            </DetailItem>
          )}
          {(property.propertyType === 'house' || property.propertyType === 'villa') &&
            property.totalFloors && (
              <DetailItem icon={<BuildingOfficeIcon />} label={t('features.floors')}>
                {property.totalFloors}
              </DetailItem>
            )}

          {property.furnishing && property.furnishing !== 'any' && (
            <DetailItem icon={<span className="text-2xl">🛋️</span>} label={t('details.furnishing')}>
              <span className="capitalize">{property.furnishing.replace('-', ' ')}</span>
            </DetailItem>
          )}

          {property.heatingType &&
            property.heatingType !== 'any' &&
            property.heatingType !== 'none' && (
              <DetailItem icon={<span className="text-2xl">🔥</span>} label={t('details.heating')}>
                <span className="capitalize">{property.heatingType.replace('-', ' ')}</span>
              </DetailItem>
            )}

          {property.condition && property.condition !== 'any' && (
            <DetailItem icon={<span className="text-2xl">⭐</span>} label={t('details.condition')}>
              <span className="capitalize">{property.condition.replace('-', ' ')}</span>
            </DetailItem>
          )}

          {property.viewType && property.viewType !== 'any' && (
            <DetailItem icon={<span className="text-2xl">👁️</span>} label={t('details.view')}>
              <span className="capitalize">{t('details.viewType', { type: property.viewType })}</span>
            </DetailItem>
          )}

          {property.energyRating && property.energyRating !== 'any' && (
            <DetailItem icon={<span className="text-2xl">⚡</span>} label={t('details.energyRating')}>
              <span className="font-bold text-lg">{property.energyRating}</span>
            </DetailItem>
          )}

          {property.orientation && property.orientation !== 'any' && (
            <DetailItem icon={<span className="text-2xl">🧭</span>} label={t('details.orientation')}>
              <span className="capitalize">{t(`details.orientations.${property.orientation}`)}</span>
            </DetailItem>
          )}

          {property.floorplanUrl && (
            <div className="col-span-2 sm:col-span-3 lg:col-span-4 mt-2">
              <button
                onClick={onOpenFloorPlan}
                className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-primary/5 border border-primary/15 hover:bg-primary/10 hover:border-primary/25 transition-all duration-200 group"
              >
                <CubeTransparentIcon className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-primary">{t('details.viewFloorPlan')}</span>
                <svg className="w-4 h-4 text-primary/60 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Special Features & Materials */}
        {((Array.isArray(property.specialFeatures) && property.specialFeatures.length > 0) ||
          (Array.isArray(property.materials) && property.materials.length > 0)) && (
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.isArray(property.specialFeatures) && property.specialFeatures.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/50">
                  <div className="flex items-center gap-2 mb-3">
                    <StarIcon className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold text-neutral-800">{t('details.specialFeatures')}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {property.specialFeatures.map((feature) => (
                      <span key={feature} className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(property.materials) && property.materials.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/50">
                  <div className="flex items-center gap-2 mb-3">
                    <CubeIcon className="w-5 h-5 text-slate-500" />
                    <span className="font-semibold text-neutral-800">{t('details.materials')}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {property.materials.map((material) => (
                      <span key={material} className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                        {material}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Amenities & Features Section */}
      {((property.amenities && property.amenities.length > 0) ||
        property.hasBalcony !== undefined ||
        property.hasGarden !== undefined ||
        property.hasElevator !== undefined ||
        property.hasSecurity !== undefined ||
        property.hasAirConditioning !== undefined ||
        property.hasPool !== undefined ||
        property.petsAllowed !== undefined ||
        property.distanceToCenter !== undefined ||
        property.distanceToSea !== undefined ||
        property.distanceToSchool !== undefined ||
        property.distanceToHospital !== undefined) && (
        <div className="relative bg-white/70 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 overflow-hidden">
          {/* Glass effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50/30 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

          <div className="relative flex items-center gap-3 mb-5">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/80 to-violet-50/60 backdrop-blur-sm border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900">
              {t('details.amenitiesFeatures')}
            </h3>
          </div>

          {/* Hashtag-style Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="relative mb-6">
              <h4 className="text-md font-semibold text-neutral-700 mb-3">{t('details.propertyAmenities')}</h4>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-4 py-2 bg-primary-light text-primary-dark font-semibold rounded-full text-sm border border-primary/20 hover:bg-primary/20 hover:scale-105 hover:shadow-md transition-all duration-200 cursor-default"
                  >
                    {amenity.startsWith('#') ? amenity : `#${amenity}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Boolean Property Features */}
          {(property.hasBalcony !== undefined ||
            property.hasGarden !== undefined ||
            property.hasElevator !== undefined ||
            property.hasSecurity !== undefined ||
            property.hasAirConditioning !== undefined ||
            property.hasPool !== undefined ||
            property.petsAllowed !== undefined) && (
            <div className="relative mb-6">
              <h4 className="text-md font-semibold text-neutral-700 mb-3">{t('details.propertyFeatures')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {property.hasBalcony !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.hasBalcony
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.hasBalcony ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">{t('details.balconyTerrace')}</span>
                      <span
                        className={`block text-xs ${
                          property.hasBalcony ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.hasBalcony ? t('available') : t('details.no')}
                      </span>
                    </div>
                  </div>
                )}
                {property.hasGarden !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.hasGarden
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.hasGarden ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">{t('details.gardenYard')}</span>
                      <span
                        className={`block text-xs ${
                          property.hasGarden ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.hasGarden ? t('available') : t('details.no')}
                      </span>
                    </div>
                  </div>
                )}
                {property.hasElevator !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.hasElevator
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.hasElevator ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">{t('amenities.elevator')}</span>
                      <span
                        className={`block text-xs ${
                          property.hasElevator ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.hasElevator ? t('available') : t('details.no')}
                      </span>
                    </div>
                  </div>
                )}
                {property.hasSecurity !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.hasSecurity
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.hasSecurity ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">{t('amenities.security')}</span>
                      <span
                        className={`block text-xs ${
                          property.hasSecurity ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.hasSecurity ? t('available') : t('details.no')}
                      </span>
                    </div>
                  </div>
                )}
                {property.hasAirConditioning !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.hasAirConditioning
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.hasAirConditioning ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">{t('amenities.airConditioning')}</span>
                      <span
                        className={`block text-xs ${
                          property.hasAirConditioning ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.hasAirConditioning ? t('available') : t('details.no')}
                      </span>
                    </div>
                  </div>
                )}
                {property.hasPool !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.hasPool ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.hasPool ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">{t('amenities.pool')}</span>
                      <span
                        className={`block text-xs ${
                          property.hasPool ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.hasPool ? t('available') : t('details.no')}
                      </span>
                    </div>
                  </div>
                )}
                {property.petsAllowed !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.petsAllowed
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.petsAllowed ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">{t('details.petsAllowed')}</span>
                      <span
                        className={`block text-xs ${
                          property.petsAllowed ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.petsAllowed ? t('details.yes') : t('details.no')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Distance Information */}
          {(property.distanceToCenter !== undefined ||
            property.distanceToSea !== undefined ||
            property.distanceToSchool !== undefined ||
            property.distanceToHospital !== undefined) && (
            <div className="relative">
              <h4 className="text-md font-semibold text-neutral-700 mb-3">
                {t('details.distanceInfo')}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {property.distanceToCenter !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:bg-blue-100 cursor-default">
                    <span className="text-2xl">🏙️</span>
                    <div>
                      <span className="font-medium text-neutral-800">{t('distances.cityCenter')}</span>
                      <span className="block text-sm text-blue-700 font-semibold">
                        {property.distanceToCenter.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                )}
                {property.distanceToSea !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:bg-blue-100 cursor-default">
                    <span className="text-2xl">🌊</span>
                    <div>
                      <span className="font-medium text-neutral-800">{t('distances.sea')}</span>
                      <span className="block text-sm text-blue-700 font-semibold">
                        {property.distanceToSea.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                )}
                {property.distanceToSchool !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:bg-blue-100 cursor-default">
                    <span className="text-2xl">🏫</span>
                    <div>
                      <span className="font-medium text-neutral-800">{t('distances.school')}</span>
                      <span className="block text-sm text-blue-700 font-semibold">
                        {property.distanceToSchool.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                )}
                {property.distanceToHospital !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:bg-blue-100 cursor-default">
                    <span className="text-2xl">🏥</span>
                    <div>
                      <span className="font-medium text-neutral-800">{t('distances.hospital')}</span>
                      <span className="block text-sm text-blue-700 font-semibold">
                        {property.distanceToHospital.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visit Availability Section */}
      {property.visitAvailability && property.visitAvailability.enabled && (
        <div className="relative bg-white/70 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 overflow-hidden">
          {/* Glass effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

          <div className="relative flex items-center gap-3 mb-5">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/80 to-blue-50/60 backdrop-blur-sm border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-neutral-900">{t('details.visitAvailability.title')}</h3>
              <p className="text-xs text-neutral-400">{t('details.visitAvailability.subtitle')}</p>
            </div>
          </div>

          <div className="relative space-y-4">
            {/* Available Days */}
            <div>
              <span className="text-sm font-semibold text-neutral-700">{t('details.visitAvailability.availableDays')}</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const dayNames = [
                    t('details.visitAvailability.days.sun'),
                    t('details.visitAvailability.days.mon'),
                    t('details.visitAvailability.days.tue'),
                    t('details.visitAvailability.days.wed'),
                    t('details.visitAvailability.days.thu'),
                    t('details.visitAvailability.days.fri'),
                    t('details.visitAvailability.days.sat'),
                  ];
                  const isAvailable = property.visitAvailability!.days.includes(day);
                  return (
                    <span
                      key={day}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                        isAvailable
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-neutral-100 text-neutral-400 border border-neutral-200 line-through'
                      }`}
                    >
                      {dayNames[day]}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Time Range */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-blue-700">
                  {property.visitAvailability.startTime} - {property.visitAvailability.endTime}
                </span>
              </div>
              <span className="text-xs text-neutral-500">
                {t('details.visitAvailability.slotDuration', { minutes: property.visitAvailability.slotDurationMinutes })}
              </span>
            </div>

            {/* Notes */}
            {property.visitAvailability.notes && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-amber-800">{property.visitAvailability.notes}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
