// PropertyInfo Component
// Displays property details, description, and amenities

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../../types';
import { validateCoordinates } from '../../shared/utils/validation';
import { resolveConstruction } from '../../shared/property/construction';
import { openExternalUrl } from '../../shared/utils/pwa';
import { formatPrice } from '../../../utils/currency';
import { getPriceReductionInfo } from '../../../utils/priceUtils';
import {
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
  LuxuryVillaIcon,
} from '../../../constants';
import { DetailItem } from './PropertyCommon';
import { useAppContext } from '../../../context/AppContext';
import { BALKAN_COUNTRIES } from '../../../constants/countries';

interface PropertyInfoProps {
  property: Property;
  onOpenFloorPlan: () => void;
}

/**
 * Property types the type card draws a dedicated icon for. Anything else —
 * `other`, or a type added to the backend before this card learns about it —
 * falls through to the generic cube.
 */
const PROPERTY_TYPES_WITH_ICON: ReadonlySet<string> = new Set([
  'apartment',
  'house',
  'villa',
  'luxury-villa',
  'land',
]);

/**
 * Last-resort label for a type with no translation in the active locale:
 * "luxury-villa" → "luxury villa" (the card's `capitalize` does the rest).
 * Never shown for a known type — all six live in `map.propertyTypes`. Takes
 * `unknown` because the value is whatever the API sent, not necessarily one
 * of the `PropertyType` literals.
 */
const humanisePropertyType = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/[-_]+/g, ' ').trim() : '';

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
  const { t } = useTranslation(['property', 'agents']);
  const { state, dispatch, updateSearchPageState } = useAppContext();

  // --- state ---
  // Controls the "open in map app" chooser shown below the Directions button.
  const [mapMenuOpen, setMapMenuOpen] = useState(false);

  // --- derived values ---
  // lat/lng typed as number; guard 0,0 (null island) which passes range validation but is never a real Balkan listing
  const hasValidCoords = useMemo(
    () => (property.lat !== 0 || property.lng !== 0) && validateCoordinates(property.lat, property.lng).isValid,
    [property.lat, property.lng]
  );

  // Luxury villas are a market of their own (own nav tab, own map markers), so
  // the type card carries the villa mark and the gold accent rather than the
  // generic primary blue.
  const isLuxuryVilla = property.propertyType === 'luxury-villa';

  // Land has no rooms — bedrooms/bathrooms/living rooms are meaningless for a
  // plot, so the stats row shows only area (and parking, if any) for it.
  const isLand = property.propertyType === 'land';
  // Whether this listing is finished or still going up decides which year the
  // details grid may state. Resolved once, from the record, so the badge and
  // the details row cannot disagree.
  const construction = useMemo(() => resolveConstruction(property), [property]);

  // Property-type name. `map.propertyTypes` is the app's one translated list of
  // type names — reused here so the card can never fall back to the raw
  // "Luxury-Villa" slug the way a card-only key set did.
  const propertyTypeLabel = useMemo(
    () => t(`map.propertyTypes.${property.propertyType}`, humanisePropertyType(property.propertyType)),
    [t, property.propertyType]
  );

  // Single destination string used by both the map link and the directions handler
  const mapsDestination = useMemo(
    () => hasValidCoords
      ? `${property.lat},${property.lng}`
      : encodeURIComponent([property.address, property.city, property.country].filter(Boolean).join(', ')),
    [hasValidCoords, property.lat, property.lng, property.address, property.city, property.country]
  );

  // --- callbacks ---
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

  // Each provider gets a deep link that all major map apps support. We do NOT
  // pre-fetch geolocation for the origin: every app below falls back to the
  // user's current location when no origin is given, and an async geolocation
  // callback would lose the user-gesture and get the open blocked on mobile /
  // installed PWAs (the original bug).
  const mapProviders = useMemo(
    () => [
      {
        name: 'Google Maps',
        emoji: '🗺️',
        url: `https://www.google.com/maps/dir/?api=1&destination=${mapsDestination}`,
      },
      {
        name: 'Apple Maps',
        emoji: '🧭',
        url: `https://maps.apple.com/?daddr=${mapsDestination}&dirflg=d`,
      },
      {
        name: 'Waze',
        emoji: '🚗',
        url: hasValidCoords
          ? `https://waze.com/ul?ll=${mapsDestination}&navigate=yes`
          : `https://waze.com/ul?q=${mapsDestination}&navigate=yes`,
      },
    ],
    [mapsDestination, hasValidCoords]
  );

  const handleSelectMapProvider = useCallback((url: string) => {
    // openExternalUrl runs synchronously inside this click handler, so the
    // open stays inside the user gesture and works in mobile browsers / PWAs.
    openExternalUrl(url);
    setMapMenuOpen(false);
  }, []);

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

          {property.propertyId && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-neutral-100 text-neutral-600 mb-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              ID: {property.propertyId}
            </span>
          )}

          {(() => {
            if (property.isNegotiable) {
              return (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-lg sm:text-xl lg:text-2xl font-bold px-4 py-2 rounded-xl border border-amber-200">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {t('property:byNegotiation', 'By Negotiation')}
                  </span>
                </div>
              );
            }
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

          {/* Address Card */}
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent border border-primary/20 hover:border-primary/30 transition-colors">
            <div className="flex items-start gap-3">
              {/* Filled location pin */}
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.083 3.218-4.374 3.218-6.991a6.5 6.5 0 10-13 0c0 2.617 1.274 4.908 3.218 6.99a19.58 19.58 0 002.682 2.283 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapsDestination}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-semibold text-neutral-900 hover:text-primary transition-colors text-sm sm:text-base leading-snug"
                  title={t('actions.openInMaps', 'Open in Google Maps')}
                >
                  {property.address}
                </a>
                <div className="flex flex-wrap items-center gap-x-1.5 mt-1 text-xs sm:text-sm text-neutral-500">
                  <button
                    onClick={(e) => handleLocationClick(e, 'city')}
                    className="hover:text-primary transition-colors"
                    title={`View all properties in ${property.city}`}
                  >
                    {property.city}
                  </button>
                  <span aria-hidden>·</span>
                  <button
                    onClick={(e) => handleLocationClick(e, 'country')}
                    className="hover:text-primary transition-colors"
                    title={`View all properties in ${property.country}`}
                  >
                    {property.country}
                  </button>
                </div>
              </div>

              {/* Directions button + map-app chooser */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setMapMenuOpen((open) => !open)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs sm:text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20"
                  aria-label={t('actions.getDirections', 'Get Directions')}
                  aria-haspopup="menu"
                  aria-expanded={mapMenuOpen}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  <span className="hidden sm:inline">{t('actions.getDirections', 'Directions')}</span>
                </button>

                {mapMenuOpen && (
                  <>
                    {/* Backdrop closes the menu on outside tap */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMapMenuOpen(false)}
                      aria-hidden
                    />
                    <div
                      role="menu"
                      aria-label={t('actions.getDirections', 'Get Directions')}
                      className="absolute right-0 top-full mt-2 z-50 w-44 rounded-xl bg-white shadow-xl ring-1 ring-black/5 border border-neutral-100 overflow-hidden py-1"
                    >
                      {mapProviders.map((p) => (
                        <button
                          key={p.name}
                          role="menuitem"
                          onClick={() => handleSelectMapProvider(p.url)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left"
                        >
                          <span className="text-base leading-none" aria-hidden>{p.emoji}</span>
                          <span className="font-medium">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Property Type & Listing Badge */}
          {property.propertyType && (
            <div className="mt-4 flex flex-wrap items-stretch gap-3">
              {/* Property Type Card */}
              <div className={`group relative flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-br transition-all duration-300 cursor-default overflow-hidden ${
                isLuxuryVilla
                  ? 'from-amber-500/[0.10] via-amber-500/[0.05] to-transparent border border-amber-400/30 hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/10'
                  : 'from-primary/[0.07] via-primary/[0.04] to-transparent border border-primary/15 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5'
              }`}>
                {/* Subtle animated shimmer */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br transition-colors ${
                  isLuxuryVilla
                    ? 'from-amber-400/30 to-amber-500/15 group-hover:from-amber-400/40 group-hover:to-amber-500/20'
                    : 'from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/15'
                }`}>
                  {property.propertyType === 'apartment' && (
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                  )}
                  {property.propertyType === 'house' && (
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  )}
                  {property.propertyType === 'villa' && (
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3L2 12h3v8h6v-5h2v5h6v-8h3L12 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8" />
                    </svg>
                  )}
                  {property.propertyType === 'land' && (
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                    </svg>
                  )}
                  {isLuxuryVilla && (
                    <LuxuryVillaIcon className="w-5 h-5 text-amber-600" />
                  )}
                  {!PROPERTY_TYPES_WITH_ICON.has(property.propertyType) && (
                    <CubeTransparentIcon className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="relative">
                  <span className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider leading-none ${
                    isLuxuryVilla ? 'text-amber-700/70' : 'text-primary/60'
                  }`}>
                    {t('details.propertyType', 'Property Type')}
                  </span>
                  <span className="block text-sm sm:text-base font-bold text-neutral-900 capitalize mt-0.5">
                    {propertyTypeLabel}
                  </span>
                </div>
              </div>

              {/* Listing Type Card */}
              {property.listingType && (
                <div className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300 cursor-default overflow-hidden ${
                  property.listingType === 'rent'
                    ? 'bg-gradient-to-br from-blue-50/80 via-blue-50/40 to-transparent border-blue-200/50 hover:border-blue-300/70 hover:shadow-lg hover:shadow-blue-500/5'
                    : 'bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-transparent border-emerald-200/50 hover:border-emerald-300/70 hover:shadow-lg hover:shadow-emerald-500/5'
                }`}>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                    property.listingType === 'rent'
                      ? 'bg-blue-100/80'
                      : 'bg-emerald-100/80'
                  }`}>
                    {property.listingType === 'rent' ? (
                      <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider leading-none ${
                      property.listingType === 'rent' ? 'text-blue-500/70' : 'text-emerald-500/70'
                    }`}>
                      {t('details.listingType', 'Listing')}
                    </span>
                    <span className={`block text-sm sm:text-base font-bold mt-0.5 ${
                      property.listingType === 'rent' ? 'text-blue-700' : 'text-emerald-700'
                    }`}>
                      {property.listingType === 'rent' ? t('details.forRent', 'For Rent') : t('details.forSale', 'For Sale')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={`mt-6 grid gap-3 border-t border-neutral-200 pt-5 ${
            isLand ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
          }`}>
            {!isLand && (
              <>
                {/* Beds */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors cursor-default group">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <BedIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-neutral-900 leading-none">{property.beds}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{t('features.bedrooms')}</p>
                  </div>
                </div>

                {/* Baths */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-cyan-50 hover:bg-cyan-100 transition-colors cursor-default group">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <BathIcon className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-neutral-900 leading-none">{property.baths}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{t('features.bathrooms')}</p>
                  </div>
                </div>

                {/* Living rooms */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-violet-50 hover:bg-violet-100 transition-colors cursor-default group">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <LivingRoomIcon className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-neutral-900 leading-none">{property.livingRooms}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{property.livingRooms === 1 ? t('details.livingRoom') : t('details.livingRoomPlural')}</p>
                  </div>
                </div>
              </>
            )}

            {/* Area */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-default group">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <SqftIcon className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900 leading-none">{property.sqft}</p>
                <p className="text-xs text-neutral-500 mt-0.5">m²</p>
              </div>
            </div>

            {/* Parking (land only up here; otherwise it lives in the Property Details section below) */}
            {isLand && property.parking > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 transition-colors cursor-default group">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <ParkingIcon className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-neutral-900 leading-none">{property.parking}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{t('features.parking')}</p>
                </div>
              </div>
            )}
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
          {!isLand && (
          {construction.status === 'under-construction' ? (
            // The building does not exist yet, so "Year built" would be a claim
            // about a year that has not happened. A promise whose year is
            // missing or already past shows the state without a date rather
            // than inventing one.
            <DetailItem icon={<CalendarIcon />} label={t('features.expectedCompletion', 'Expected completion')}>
              {construction.expectedYear ?? t('features.underConstruction', 'Under construction')}
            </DetailItem>
          ) : (
            <DetailItem icon={<CalendarIcon />} label={t('features.yearBuilt')}>
              {property.yearBuilt}
            </DetailItem>
          )}
          {!isLand && (
            <DetailItem icon={<ParkingIcon />} label={t('features.parking')}>
              {property.parking > 0
                ? `${property.parking} ${property.parking === 1 ? t('details.spot') : t('details.spots')}`
                : t('details.none')}
            </DetailItem>
          )}
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

          {!!property.kitchens && property.kitchens > 0 && (
            <DetailItem icon={<span className="text-2xl">🍳</span>} label={t('details.kitchens', 'Kitchens')}>
              {property.kitchens}
            </DetailItem>
          )}

          {!!property.diningRooms && property.diningRooms > 0 && (
            <DetailItem icon={<span className="text-2xl">🍽️</span>} label={t('details.diningRooms', 'Dining rooms')}>
              {property.diningRooms}
            </DetailItem>
          )}

          {!!property.toilets && property.toilets > 0 && (
            <DetailItem icon={<span className="text-2xl">🚻</span>} label={t('details.toilets', 'Toilets (WC)')}>
              {property.toilets}
            </DetailItem>
          )}

          {!!property.storageRooms && property.storageRooms > 0 && (
            <DetailItem icon={<span className="text-2xl">📦</span>} label={t('details.storageRooms', 'Storage rooms')}>
              {property.storageRooms}
            </DetailItem>
          )}

          {!!property.offices && property.offices > 0 && (
            <DetailItem icon={<span className="text-2xl">💼</span>} label={t('details.offices', 'Office / study')}>
              {property.offices}
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
                className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/15 hover:from-primary/10 hover:to-primary/15 hover:border-primary/25 hover:shadow-md transition-all duration-300 group"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-primary/20 flex-shrink-0 bg-white shadow-sm">
                  <img
                    src={property.floorplanUrl}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-semibold text-primary">{t('details.viewFloorPlan')}</span>
                  <span className="text-[11px] text-primary/50">{t('details.floorPlanInteractiveHint', 'Interactive viewer with zoom, pan & labels')}</span>
                </div>
                <svg className="w-5 h-5 text-primary/40 ml-auto group-hover:text-primary/70 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
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
