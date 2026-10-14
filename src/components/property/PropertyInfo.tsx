// PropertyInfo Component
// Displays property details, description, and amenities

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../../types';
import { validateCoordinates } from '../../shared/utils/validation';
import { resolveConstruction } from '../../shared/property/construction';
import { attributeEntries, statsForType, type TypeAttribute } from '../../shared/property/typeAttributes';
import { ATTRIBUTE_DISPLAY, PARKING_TYPE_FALLBACKS, isParkingTypeValue } from '../../shared/property/attributeDisplay';
import { openExternalUrl } from '../../shared/utils/pwa';
import { getFloorPlans } from '../../shared/utils/floorplans';
import { optimizeImageUrl } from '../../../config/mediaConfig';
import { formatPrice } from '../../../utils/currency';
import { getPriceReductionInfo } from '../../../utils/priceUtils';
import {
  CubeIcon,
  CubeTransparentIcon,
  CheckCircleIcon,
  LuxuryVillaIcon,
} from '../../../constants';
import { DetailItem } from './PropertyCommon';
import { SpecIllustration, SoftIcon, type SpecIllustrationName } from '../../shared/illustrations/Illustration';
import { useAppContext } from '../../../context/AppContext';
import { BALKAN_COUNTRIES } from '../../../constants/countries';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';

interface PropertyInfoProps {
  property: Property;
  onOpenFloorPlan: () => void;
}

/**
 * Property types the type card draws a branded scene for. Luxury villas keep
 * their gold villa mark; anything else — `other`, or a type added to the
 * backend before this card learns about it — falls through to the generic cube.
 */
const PROPERTY_TYPE_ILLUSTRATIONS: Readonly<Record<string, SpecIllustrationName>> = {
  apartment: 'apartment',
  house: 'house',
  villa: 'villa',
  land: 'plot',
};

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
 * The tint behind each headline stat.
 *
 * Which stats appear is the type table's decision; the scene drawn for each
 * comes from `ATTRIBUTE_DISPLAY`. A stat with no entry here falls back to a
 * neutral tone, so adding a stat to a type never leaves a blank tile — it
 * just looks plainer until someone gives it a colour.
 */
const HEADLINE_STAT_TONES: Record<string, string> = {
  beds: 'bg-blue-50 hover:bg-blue-100',
  baths: 'bg-cyan-50 hover:bg-cyan-100',
  livingRooms: 'bg-violet-50 hover:bg-violet-100',
  parking: 'bg-amber-50 hover:bg-amber-100',
  offices: 'bg-rose-50 hover:bg-rose-100',
  openPlanArea: 'bg-sky-50 hover:bg-sky-100',
};

/** A feature's scene, faded out when the listing does not have it. */
const FeatureScene: React.FC<{ name: SpecIllustrationName; available: boolean }> = ({ name, available }) => (
  <SpecIllustration
    name={name}
    className={`w-14 h-12 flex-shrink-0 ${available ? '' : 'grayscale opacity-40'}`}
  />
);

/**
 * PropertyInfo Component
 *
 * Comprehensive property information display including:
 * - Price and address
 * - Key stats, chosen by the listing's type (see `statsForType`)
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
  const { state, updateSearchPageState } = useAppContext();

  // --- state ---
  // Controls the "open in map app" chooser shown below the Directions button.
  const [mapMenuOpen, setMapMenuOpen] = useState(false);

  // --- derived values ---
  const floorPlans = useMemo(() => getFloorPlans(property), [property]);
  // lat/lng typed as number; guard 0,0 (null island) which passes range validation but is never a real Balkan listing
  const hasValidCoords = useMemo(
    () => (property.lat !== 0 || property.lng !== 0) && validateCoordinates(property.lat, property.lng).isValid,
    [property.lat, property.lng]
  );

  // Luxury villas are a market of their own (own nav tab, own map markers), so
  // the type card carries the villa mark and the gold accent rather than the
  // generic primary blue.
  const isLuxuryVilla = property.propertyType === 'luxury-villa';

  // A plot has no building, so it has no year built either.
  const isLand = property.propertyType === 'land';

  /**
   * What this listing is described by, from the one table that decides it.
   *
   * The stats row and the details grid used to hard-code "bedrooms, bathrooms
   * and living rooms unless it is land", which described a garage as having
   * none of the three and never mentioned a shop's open-plan area at all. Both
   * now read the type's own profile: `headlineStats` is the short row at the
   * top (the same stats the search card leads with), and `detailAttributes` is
   * everything else the type carries and the seller filled in.
   */
  const headlineStats = useMemo(
    () => attributeEntries(
      property as unknown as Record<string, unknown>,
      statsForType(property.propertyType).filter((stat) => stat !== 'sqft') as readonly TypeAttribute[],
    ),
    [property],
  );
  const detailAttributes = useMemo(
    () => {
      const shownAbove = new Set(headlineStats.map(({ attribute }) => attribute));
      return attributeEntries(property as unknown as Record<string, unknown>)
        .filter(({ attribute }) => !shownAbove.has(attribute));
    },
    [property, headlineStats],
  );

  /** Print an attribute's value: a translated term, a measurement, or a count. */
  const formatAttributeValue = useCallback((attribute: string, value: number | string) => {
    const display = ATTRIBUTE_DISPLAY[attribute as keyof typeof ATTRIBUTE_DISPLAY];
    if (display?.valueKey && isParkingTypeValue(value)) {
      return t(`${display.valueKey}.${value}`, PARKING_TYPE_FALLBACKS[value]);
    }
    return display?.unit ? `${value} ${display.unit}` : String(value);
  }, [t]);
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
      navigate(paths.search({ city: property.city, country: countryKey }));
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
      navigate(paths.search({ country: countryKey }));
    }
  }, [property.city, property.country, state.searchPageState.filters, updateSearchPageState]);

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
              <SoftIcon name="pin" className="flex-shrink-0 w-10 h-10" />

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
                {PROPERTY_TYPE_ILLUSTRATIONS[property.propertyType] ? (
                  <SpecIllustration
                    name={PROPERTY_TYPE_ILLUSTRATIONS[property.propertyType]}
                    className="relative w-14 h-12 -my-1 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br transition-colors ${
                    isLuxuryVilla
                      ? 'from-amber-400/30 to-amber-500/15 group-hover:from-amber-400/40 group-hover:to-amber-500/20'
                      : 'from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/15'
                  }`}>
                    {isLuxuryVilla
                      ? <LuxuryVillaIcon className="w-5 h-5 text-amber-600" />
                      : <CubeTransparentIcon className="w-5 h-5 text-primary" />}
                  </div>
                )}
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
                    {property.listingType === 'rent'
                      ? <SoftIcon name="key" className="w-7 h-7" />
                      : <SoftIcon name="cash" className="w-7 h-7" />}
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

          {/* The stats a listing of this type leads with — bedrooms and
              bathrooms on a home, offices and open-plan area on business
              premises, spaces on a garage — plus the area every listing has.
              Read from the type's profile so none of them is a zero standing
              in for a field this type was never asked about. */}
          <div className="mt-6 grid gap-3 border-t border-neutral-200 pt-5 grid-cols-2 sm:grid-cols-4">
            {headlineStats.map(({ attribute, value }) => {
              const display = ATTRIBUTE_DISPLAY[attribute];

              return (
                <div key={attribute} className={`flex items-center gap-2 p-2.5 pr-3 rounded-2xl transition-colors cursor-default group ${HEADLINE_STAT_TONES[attribute] ?? 'bg-slate-50 hover:bg-slate-100'}`}>
                  <SpecIllustration
                    name={display.illustration}
                    className="w-16 h-[3.25rem] flex-shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-neutral-900 leading-none truncate">{formatAttributeValue(attribute, value)}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">{t(display.key, display.fallback)}</p>
                  </div>
                </div>
              );
            })}

            {/* Area — the one measure every listing has, whatever its type.
                `property.sqft` is already backfilled from the type's own
                breakdown (gross/net, land/building, open-plan) wherever the
                total-area box was left blank — see `resolveTotalArea`. A
                listing with genuinely no area on file hides the tile rather
                than print a "0 m²" that looks like a real measurement. */}
            {property.sqft > 0 && (
              <div className="flex items-center gap-2 p-2.5 pr-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-default group">
                <SpecIllustration
                  name="area"
                  className="w-16 h-[3.25rem] flex-shrink-0 group-hover:scale-105 transition-transform"
                />
                <div>
                  <p className="text-xl font-bold text-neutral-900 leading-none">{property.sqft}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">m²</p>
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
            <SoftIcon name="home" className="w-7 h-7" />
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
            <SoftIcon name="building" className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900">{t('details.title')}</h3>
            <p className="text-xs text-neutral-400">{t('details.subtitle')}</p>
          </div>
        </div>

                <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {!isLand && (
            construction.status === 'under-construction' ? (
              // The building does not exist yet, so "Year built" would be a claim
              // about a year that has not happened. A promise whose year is
              // missing or already past shows the state without a date rather
              // than inventing one.
              <DetailItem illustration="construction" label={t('features.expectedCompletion', 'Expected completion')}>
                {construction.expectedYear ?? t('features.underConstruction', 'Under construction')}
              </DetailItem>
            ) : (
              <DetailItem illustration="yearBuilt" label={t('features.yearBuilt')}>
                {property.yearBuilt}
              </DetailItem>
            )
          )}
          {/* Everything else this type carries and the seller filled in —
              kitchens and WCs on a home, open-plan area on a shop, how a
              garage is arranged. One row per attribute the type actually has,
              so nothing appears as a zero for a question never asked. */}
          {detailAttributes.map(({ attribute, value }) => {
            const display = ATTRIBUTE_DISPLAY[attribute];
            return (
              <DetailItem
                key={attribute}
                illustration={display.illustration}
                label={t(display.key, display.fallback)}
              >
                {formatAttributeValue(attribute, value)}
              </DetailItem>
            );
          })}

          {property.furnishing && property.furnishing !== 'any' && (
            <DetailItem illustration="furnishing" label={t('details.furnishing')}>
              <span className="capitalize">{property.furnishing.replace('-', ' ')}</span>
            </DetailItem>
          )}

          {property.heatingType &&
            property.heatingType !== 'any' &&
            property.heatingType !== 'none' && (
              <DetailItem illustration="heating" label={t('details.heating')}>
                <span className="capitalize">{property.heatingType.replace('-', ' ')}</span>
              </DetailItem>
            )}

          {property.condition && property.condition !== 'any' && (
            <DetailItem illustration="condition" label={t('details.condition')}>
              <span className="capitalize">{property.condition.replace('-', ' ')}</span>
            </DetailItem>
          )}

          {property.viewType && property.viewType !== 'any' && (
            <DetailItem illustration="view" label={t('details.view')}>
              <span className="capitalize">{t('details.viewType', { type: property.viewType })}</span>
            </DetailItem>
          )}

          {property.energyRating && property.energyRating !== 'any' && (
            <DetailItem illustration="energy" label={t('details.energyRating')}>
              <span className="font-bold text-lg">{property.energyRating}</span>
            </DetailItem>
          )}

          {property.orientation && property.orientation !== 'any' && (
            <DetailItem illustration="orientation" label={t('details.orientation')}>
              <span className="capitalize">{t(`details.orientations.${property.orientation}`)}</span>
            </DetailItem>
          )}

          {floorPlans.length > 0 && (
            <div className="col-span-2 sm:col-span-3 lg:col-span-4 mt-2">
              <button
                onClick={onOpenFloorPlan}
                className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/15 hover:from-primary/10 hover:to-primary/15 hover:border-primary/25 hover:shadow-md transition-all duration-300 group"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-primary/20 flex-shrink-0 bg-white shadow-sm">
                  <img
                    src={optimizeImageUrl(floorPlans[0].url, { width: 96, quality: 'auto' }) || floorPlans[0].url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-semibold text-primary">{t('details.viewFloorPlan')}</span>
                  <span className="text-[11px] text-primary/50">
                    {floorPlans.length > 1
                      ? t('details.floorPlanFloorsHint', '{{count}} floors · photos marked on the plan', { count: floorPlans.length })
                      : t('details.floorPlanInteractiveHint', 'Interactive viewer with zoom, pan & labels')}
                  </span>
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
                    <SoftIcon name="star" className="w-6 h-6" />
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
              <SoftIcon name="sparkles" className="w-7 h-7" />
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
                    <FeatureScene name="balcony" available={property.hasBalcony} />
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
                    <FeatureScene name="garden" available={property.hasGarden} />
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
                    <FeatureScene name="elevator" available={property.hasElevator} />
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
                    <FeatureScene name="security" available={property.hasSecurity} />
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
                    <FeatureScene name="airConditioning" available={property.hasAirConditioning} />
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
                    <FeatureScene name="pool" available={property.hasPool} />
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
                    <FeatureScene name="pets" available={property.petsAllowed} />
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
                    <SpecIllustration name="city" className="w-14 h-12 flex-shrink-0" />
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
                    <SpecIllustration name="sea" className="w-14 h-12 flex-shrink-0" />
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
                    <SpecIllustration name="school" className="w-14 h-12 flex-shrink-0" />
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
                    <SpecIllustration name="hospital" className="w-14 h-12 flex-shrink-0" />
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
              <SoftIcon name="calendar" className="w-7 h-7" />
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
