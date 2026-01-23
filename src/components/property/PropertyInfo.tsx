// PropertyInfo Component
// Displays property details, description, and amenities

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../../types';
import { formatPrice } from '../../../utils/currency';
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
    <>
      {/* Price, Address, and Key Stats */}
      <div className="bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
        <div className="p-6">
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

          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">
            {formatPrice(property.price, property.country)}
          </p>

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
      <div className="bg-gradient-to-br from-white to-neutral-50/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-neutral-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900">{t('details.about')}</h3>
        </div>
        <div className="prose prose-neutral max-w-none text-neutral-600 leading-relaxed whitespace-pre-wrap">
          {property.description}
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-gradient-to-br from-white to-neutral-50/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-neutral-100">
        {/* Modern section header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/25">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            {/* Decorative ring */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent -z-10 blur-sm" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-neutral-900">{t('details.title')}</h3>
            <p className="text-sm text-neutral-500 mt-0.5">{t('details.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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

          {property.floorplanUrl && (
            <div className="col-span-2 sm:col-span-3 lg:col-span-4">
              <button
                onClick={onOpenFloorPlan}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 hover:border-primary/40 hover:shadow-md transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CubeTransparentIcon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold text-primary">{t('details.viewFloorPlan')}</span>
                <svg className="w-4 h-4 text-primary ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="bg-gradient-to-br from-white to-neutral-50/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-neutral-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-neutral-900">
              {t('details.amenitiesFeatures')}
            </h3>
          </div>

          {/* Hashtag-style Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="mb-6">
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
            <div className="mb-6">
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
                        {property.hasBalcony ? t('available') : t('pending')}
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
                        {property.hasGarden ? t('available') : t('pending')}
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
                        {property.hasElevator ? t('available') : t('pending')}
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
                        {property.hasSecurity ? t('available') : t('pending')}
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
                        {property.hasAirConditioning ? t('available') : t('pending')}
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
                        {property.hasPool ? t('available') : t('pending')}
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
            <div>
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
    </>
  );
};
