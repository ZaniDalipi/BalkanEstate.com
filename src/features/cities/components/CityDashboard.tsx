import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useCityMarketData, useCitiesByCountry } from '../hooks/useCityQueries';
import { useSuburbData, useCityImages } from '../hooks/useSuburbQueries';
import { useCityPriceHistory, useEconomicIndicators } from '../hooks/useCityInsights';
import PriceHistoryChart from './PriceHistoryChart';
import EconomicIndicatorsPanel from './EconomicIndicatorsPanel';
import { formatPrice } from '@/utils/currency';
import { parseLanguageFromPath, buildLocalizedPath } from '@/src/utils/languageRouting';
import { getCityImageUrl, getCityFallbackGradient } from '@/config/cloudinaryConfig';
import { useAppContext } from '@/context/AppContext';
import { searchLocation } from '@/services/osmService';
import Footer from '@/components/shared/Footer';
import { SEO } from '@/src/components/seo';
import SuburbDetailPanel from './SuburbDetailPanel';
import type { SuburbEntry } from '@/src/shared/types/suburb.types';

// Lazy-load the map to avoid SSR issues with Leaflet
const CitySuburbMap = lazy(() => import('./CitySuburbMap'));
import {
  MapPinIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  CalendarIcon,
  HomeIcon,
  FireIcon,
  StarIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  CurrencyEuroIcon,
  HomeModernIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from '@/constants';

const isDev = import.meta.env?.DEV ?? false;

/** Safely returns a finite number, falling back to `fallback` (default 0) for NaN/Infinity/undefined/null */
function safeNum(val: unknown, fallback = 0): number {
  if (val == null) return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/** Clamp a number between min and max */
function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/** Safely format a date string, returning fallback on invalid dates */
function safeFormatDate(dateStr: string | undefined | null, locale = 'en-US'): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Extract city & country from the current URL path */
function parseCityFromUrl(): { city: string; country: string } | null {
  const { path } = parseLanguageFromPath(window.location.pathname);
  const match = path.match(/^\/explore-cities\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  try {
    return {
      city: decodeURIComponent(match[1]),
      country: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

const CityDashboard: React.FC = () => {
  const { t } = useTranslation(['exploreCities']);
  const { dispatch, updateSearchPageState } = useAppContext();

  const [params, setParams] = useState(parseCityFromUrl);
  const [showListingPrice, setShowListingPrice] = useState(false);
  const [suburbView, setSuburbView] = useState<'map' | 'list'>('map');
  const [selectedSuburb, setSelectedSuburb] = useState<SuburbEntry | null>(null);

  // Re-parse URL when navigating between cities (popstate or pushState)
  useEffect(() => {
    const handleUrlChange = () => {
      setParams(parseCityFromUrl());
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const { data: city, isLoading, error } = useCityMarketData(params?.city, params?.country);
  const { data: countryCities } = useCitiesByCountry(params?.country);
  const { data: suburbData, isLoading: suburbLoading, error: suburbError } = useSuburbData(params?.city, params?.country);
  const { data: cityImagesData } = useCityImages(params?.city, params?.country);
  const { data: priceHistory, isLoading: historyLoading } = useCityPriceHistory(params?.city, params?.country);
  const { data: economicData } = useEconomicIndicators(params?.country);

  // Scroll to top when city changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params?.city, params?.country]);

  const navigateBack = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'explore-cities' });
    window.history.pushState({}, '', buildLocalizedPath('/explore-cities'));
  };

  const handleViewListings = async () => {
    if (!city) return;
    const searchQuery = `${city.city}, ${city.country}`;
    const results = await searchLocation(searchQuery);
    const bestResult = results[0];
    const lat = bestResult ? Number(bestResult.lat) : 0;
    const lng = bestResult ? Number(bestResult.lon) : 0;

    let drawnBoundsJSON: string | null = null;
    if (bestResult?.boundingbox) {
      const [south, north, west, east] = bestResult.boundingbox.map(Number);
      drawnBoundsJSON = JSON.stringify({
        _southWest: { lat: south, lng: west },
        _northEast: { lat: north, lng: east },
      });
    }

    const displayName = `${city.city}, ${city.country}`;
    const emptyFilters = {
      country: 'any' as const,
      query: '',
      listingType: 'sale' as const,
      minPrice: null,
      maxPrice: null,
      beds: null,
      baths: null,
      livingRooms: null,
      minSqft: null,
      maxSqft: null,
      sortBy: 'newest' as const,
      sellerType: 'any' as const,
      propertyType: 'any' as const,
      minYearBuilt: null,
      maxYearBuilt: null,
      minParking: null,
      furnishing: 'any' as const,
      heatingType: 'any' as const,
      condition: 'any' as const,
      viewType: 'any' as const,
      energyRating: 'any' as const,
      hasBalcony: null,
      hasGarden: null,
      hasElevator: null,
      hasSecurity: null,
      hasAirConditioning: null,
      hasPool: null,
      petsAllowed: null,
      minFloorNumber: null,
      maxFloorNumber: null,
      maxDistanceToCenter: null,
      maxDistanceToSea: null,
      maxDistanceToSchool: null,
      maxDistanceToHospital: null,
      amenities: [] as string[],
      has360Tour: null,
      hasDiscount: null,
      hasPriceIncrease: null,
      minPricePerSqm: null,
      maxPricePerSqm: null,
      maxDaysListed: null,
    };

    updateSearchPageState({
      filters: { ...emptyFilters, query: displayName },
      activeFilters: { ...emptyFilters },
      drawnBoundsJSON,
      focusMapOnProperty: { lat, lng, address: displayName, zoom: 12 },
      mobileView: 'map',
    });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
  };

  // Trend helpers
  const getTrendColor = (trend: string) => {
    if (trend === 'rising') return 'text-green-600 bg-green-50';
    if (trend === 'declining') return 'text-red-600 bg-red-50';
    return 'text-neutral-600 bg-neutral-50';
  };
  const getTrendLabel = (trend: string) => {
    if (trend === 'rising') return t('trends.rising');
    if (trend === 'declining') return t('trends.declining');
    return t('trends.stable');
  };
  const getTrendIcon = (trend: string) => {
    if (trend === 'rising') return <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />;
    if (trend === 'declining') return <ArrowTrendingDownIcon className="w-5 h-5 text-red-600" />;
    return <ChartBarIcon className="w-5 h-5 text-neutral-500" />;
  };
  const getDemandInfo = (score: number) => {
    if (score >= 70) return { label: t('cityCard.demandHigh', 'High'), color: 'text-green-600', barColor: 'from-green-400 to-green-500' };
    if (score >= 40) return { label: t('cityCard.demandMedium', 'Moderate'), color: 'text-amber-600', barColor: 'from-amber-400 to-amber-500' };
    return { label: t('cityCard.demandLow', 'Low'), color: 'text-red-500', barColor: 'from-red-400 to-red-500' };
  };
  const getInvestmentInfo = (score: number) => {
    if (score >= 70) return { label: t('cityCard.investmentExcellent', 'Excellent'), color: 'text-green-600', barColor: 'from-green-400 to-green-500' };
    if (score >= 40) return { label: t('cityCard.investmentGood', 'Good'), color: 'text-blue-600', barColor: 'from-blue-400 to-blue-500' };
    return { label: t('cityCard.investmentFair', 'Fair'), color: 'text-neutral-500', barColor: 'from-neutral-400 to-neutral-500' };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto p-4 sm:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-64 bg-neutral-200 rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-neutral-200 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => <div key={i} className="h-48 bg-neutral-200 rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !city) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <GlobeAltIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-700 mb-2">
            {t('dashboard.notFound', 'City not found')}
          </h2>
          <p className="text-neutral-500 mb-6">
            {t('dashboard.notFoundMessage', 'We couldn\'t find market data for this city.')}
          </p>
          <button onClick={navigateBack} className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors">
            {t('dashboard.backToExplore', 'Back to Explore Cities')}
          </button>
        </div>
      </div>
    );
  }

  // Safe numeric accessors — protects against NaN / undefined / 0 division
  const avgPrice = safeNum(city.avgPricePerSqm, 1); // min 1 to avoid division by zero
  const medianPrice = safeNum(city.medianPrice);
  const yoyGrowth = safeNum(city.priceGrowthYoY);
  const momGrowth = safeNum(city.priceGrowthMoM);
  const rentalYield = safeNum(city.rentalYield);
  const demandScore = clamp(safeNum(city.demandScore), 0, 100);
  const investmentScore = clamp(safeNum(city.investmentScore), 0, 100);
  const listingsCount = safeNum(city.listingsCount);
  const soldLastMonth = safeNum(city.soldLastMonth);
  const daysOnMarket = safeNum(city.averageDaysOnMarket);

  // Market Health Score: composite 0–100 from demand, investment, rental yield, growth
  const marketHealthScore = clamp(
    Math.round(
      demandScore * 0.3 +
      investmentScore * 0.3 +
      clamp(rentalYield * 10, 0, 100) * 0.2 +
      clamp(50 + yoyGrowth * 5, 0, 100) * 0.2
    ),
    0,
    100
  );
  const getHealthLabel = (score: number) => {
    if (score >= 75) return { label: t('dashboard.healthExcellent', 'Excellent'), color: 'text-green-600', ring: 'stroke-green-500' };
    if (score >= 50) return { label: t('dashboard.healthGood', 'Good'), color: 'text-blue-600', ring: 'stroke-blue-500' };
    if (score >= 25) return { label: t('dashboard.healthFair', 'Fair'), color: 'text-amber-600', ring: 'stroke-amber-500' };
    return { label: t('dashboard.healthPoor', 'Poor'), color: 'text-red-600', ring: 'stroke-red-500' };
  };
  const healthInfo = getHealthLabel(marketHealthScore);

  const imageUrl = getCityImageUrl(city.city, { country: city.country, width: 1200, height: 500, quality: 'auto:good' });
  const fallbackGradient = getCityFallbackGradient(city.city);
  const demandInfo = getDemandInfo(demandScore);
  const investmentInfo = getInvestmentInfo(investmentScore);

  // Wikimedia images: use first one as hero fallback, rest for gallery
  const wikiImages = cityImagesData?.images ?? [];
  const heroWikiUrl = wikiImages[0]?.thumbUrl ?? cityImagesData?.fallbackUrl;
  const galleryImages = wikiImages.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={t('dashboard.seoTitle', '{{city}}, {{country}} - Real Estate Market Dashboard', { city: city.city, country: city.country })}
        description={t('dashboard.seoDescription', 'Explore real estate market data for {{city}}, {{country}}. Average price €{{price}}/m², {{trend}} market with {{yield}}% rental yield.', { city: city.city, country: city.country, price: avgPrice.toLocaleString(), trend: city.marketTrend, yield: rentalYield })}
        canonical={`${typeof window !== 'undefined' ? window.location.origin : ''}/explore-cities/${encodeURIComponent(city.city)}/${encodeURIComponent(city.country)}`}
        type="website"
      />

      {/* Hero header with city image */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img
          src={imageUrl}
          alt={city.city}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          decoding="async"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            if (heroWikiUrl) {
              el.src = heroWikiUrl;
              el.onerror = () => {
                el.style.display = 'none';
                el.parentElement!.style.background = fallbackGradient;
              };
            } else {
              el.style.display = 'none';
              el.parentElement!.style.background = fallbackGradient;
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />

        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={navigateBack}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-black/30 backdrop-blur-md text-white rounded-xl border border-white/20 hover:bg-black/50 active:bg-black/60 transition-colors text-xs sm:text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('dashboard.backToExplore', 'Back to Explore Cities')}
          </button>
        </div>

        {/* City name and trend */}
        <div className="absolute bottom-6 left-4 sm:left-8 right-4 sm:right-8 z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPinIcon className="w-6 h-6 text-white/90" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">{city.city}</h1>
              </div>
              <p className="text-white/70 text-base sm:text-lg ml-8">{city.country}</p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-lg ${getTrendColor(city.marketTrend)}`}>
              {getTrendIcon(city.marketTrend)}
              {t('dashboard.marketIs', 'Market is')} {getTrendLabel(city.marketTrend)}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-6 relative z-10 pb-12">

        {/* Photo gallery — Wikimedia Commons images */}
        {galleryImages.length > 1 && (
          <div className="mb-6 grid grid-cols-4 gap-2 rounded-xl overflow-hidden h-36 sm:h-48">
            {/* Large primary image */}
            <div className="col-span-2 row-span-2 relative overflow-hidden">
              <img
                src={galleryImages[0].thumbUrl}
                alt={`${city.city} photo 1`}
                className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            {/* Secondary images */}
            {galleryImages.slice(1, 5).map((img, i) => (
              <div key={i} className="relative overflow-hidden">
                <img
                  src={img.thumbUrl}
                  alt={`${city.city} photo ${i + 2}`}
                  className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            ))}
            {/* Attribution overlay */}
            <div className="col-span-4 flex items-center justify-end px-2 py-1 bg-black/20 absolute bottom-0 right-0 rounded-bl-lg">
              <span className="text-[9px] text-white/70">Photos © Wikimedia Commons</span>
            </div>
          </div>
        )}

        {/* Official data source badge */}
        {city.dataSource && (
          <div className="mb-5 flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs">
            <ShieldCheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-blue-700 font-medium">
              Data verified by official sources:{' '}
              <span className="font-bold">BIS · National Statistics Institute · {city.country} Cadastre</span>
            </span>
            <span className="ml-auto text-blue-500 text-[10px]">Updated {safeFormatDate(city.lastUpdated)}</span>
          </div>
        )}

        {/* Market Health Score - composite visual */}
        <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Circular score */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  className={healthInfo.ring}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(marketHealthScore / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-neutral-900">{marketHealthScore}</span>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">/100</span>
              </div>
            </div>
            {/* Breakdown */}
            <div className="flex-1 w-full">
              <h3 className="text-lg font-bold text-neutral-900 mb-1 flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-primary" />
                {t('dashboard.marketHealth', 'Market Health Score')}
              </h3>
              <p className={`text-sm font-bold mb-4 ${healthInfo.color}`}>{healthInfo.label}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  { label: t('cityCard.demand'), val: demandScore, max: 100 },
                  { label: t('cityCard.investment'), val: investmentScore, max: 100 },
                  { label: t('cityCard.rentalYield'), val: rentalYield, max: 10, suffix: '%' },
                  { label: t('cityCard.yoyGrowth'), val: yoyGrowth, max: 20, suffix: '%', signed: true },
                ].map(({ label, val, max, suffix, signed }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-neutral-500 truncate">{label}</span>
                        <span className="text-xs font-bold text-neutral-700">
                          {signed && val > 0 ? '+' : ''}{val}{suffix}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                          style={{ width: `${clamp((Math.abs(val) / max) * 100, 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Primary metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {/* Avg Price/m² */}
          <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <HomeIcon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-neutral-500">Avg. Price /m²</span>
              </div>
              {city.listingAvgPricePerSqm && (
                <div className="flex gap-0.5 bg-neutral-100 rounded-full p-0.5">
                  <button
                    onClick={() => setShowListingPrice(false)}
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full transition-colors ${!showListingPrice ? 'bg-white text-primary shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                  >
                    Market
                  </button>
                  <button
                    onClick={() => setShowListingPrice(true)}
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full transition-colors ${showListingPrice ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                  >
                    Listings
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-neutral-900">
                €{(showListingPrice && city.listingAvgPricePerSqm ? city.listingAvgPricePerSqm : avgPrice).toLocaleString()}
              </span>
              <span className="text-sm text-neutral-400">/m²</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              {showListingPrice ? `${city.listingsCount} active listings` : 'Market research'}
            </p>
          </div>

          {/* Median Price */}
          <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <ChartBarIcon className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-neutral-500">{t('cityCard.medianPrice')}</span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-primary">{formatPrice(medianPrice, city.countryCode)}</span>
          </div>

          {/* YoY Growth */}
          <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${yoyGrowth > 0 ? 'bg-green-100' : yoyGrowth < 0 ? 'bg-red-100' : 'bg-neutral-100'}`}>
                {yoyGrowth > 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                ) : yoyGrowth < 0 ? (
                  <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
                ) : (
                  <ChartBarIcon className="w-4 h-4 text-neutral-500" />
                )}
              </div>
              <span className="text-xs font-medium text-neutral-500">{t('cityCard.yoyGrowth')}</span>
            </div>
            <span className={`text-2xl sm:text-3xl font-black ${yoyGrowth > 0 ? 'text-green-600' : yoyGrowth < 0 ? 'text-red-600' : 'text-neutral-700'}`}>
              {yoyGrowth > 0 ? '+' : ''}{yoyGrowth}%
            </span>
          </div>

          {/* Rental Yield */}
          <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <StarIcon className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-neutral-500">{t('cityCard.rentalYield')}</span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-blue-600">{rentalYield}%</span>
          </div>
        </div>

        {/* Secondary stats + scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* Market Activity */}
          <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-violet-500" />
              {t('dashboard.marketActivity', 'Market Activity')}
            </h3>
            <div className="space-y-4">
              {/* Active listings */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <HomeIcon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-neutral-700">{t('dashboard.activeListings', 'Active Listings')}</span>
                </div>
                <span className="text-lg font-bold text-neutral-900">{listingsCount.toLocaleString()}</span>
              </div>
              {/* Sold last month */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-neutral-700">{t('dashboard.soldLastMonth', 'Sold Last Month')}</span>
                </div>
                <span className="text-lg font-bold text-neutral-900">{soldLastMonth.toLocaleString()}</span>
              </div>
              {/* Average days on market */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-neutral-700">{t('cityCard.daysOnMarket')}</span>
                </div>
                <span className="text-lg font-bold text-neutral-900">{daysOnMarket} {t('cityCard.daysUnit')}</span>
              </div>
              {/* MoM Growth */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {momGrowth > 0 ? (
                    <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
                  ) : momGrowth < 0 ? (
                    <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
                  ) : (
                    <ChartBarIcon className="w-5 h-5 text-neutral-400" />
                  )}
                  <span className="text-sm font-medium text-neutral-700">{t('dashboard.momGrowth', 'Monthly Price Change')}</span>
                </div>
                <span className={`text-lg font-bold ${momGrowth > 0 ? 'text-green-600' : momGrowth < 0 ? 'text-red-600' : 'text-neutral-700'}`}>
                  {momGrowth > 0 ? '+' : ''}{momGrowth}%
                </span>
              </div>
            </div>
          </div>

          {/* Demand & Investment Scores */}
          <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <StarIcon className="w-5 h-5 text-amber-500" />
              {t('dashboard.investmentOverview', 'Investment Overview')}
            </h3>
            <div className="space-y-6">
              {/* Demand Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                    <FireIcon className="w-4 h-4 text-amber-500" />
                    {t('cityCard.demand')}
                  </span>
                  <span className={`text-sm font-bold ${demandInfo.color} px-3 py-1 rounded-full bg-white border border-current/15`}>
                    {demandInfo.label}
                  </span>
                </div>
                <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${demandInfo.barColor} transition-all duration-700`}
                    style={{ width: `${demandScore}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-neutral-400">0</span>
                  <span className="text-xs font-semibold text-neutral-600">{demandScore}/100</span>
                  <span className="text-xs text-neutral-400">100</span>
                </div>
              </div>

              {/* Investment Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                    <StarIcon className="w-4 h-4 text-blue-500" />
                    {t('cityCard.investment')}
                  </span>
                  <span className={`text-sm font-bold ${investmentInfo.color} px-3 py-1 rounded-full bg-white border border-current/15`}>
                    {investmentInfo.label}
                  </span>
                </div>
                <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${investmentInfo.barColor} transition-all duration-700`}
                    style={{ width: `${investmentScore}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-neutral-400">0</span>
                  <span className="text-xs font-semibold text-neutral-600">{investmentScore}/100</span>
                  <span className="text-xs text-neutral-400">100</span>
                </div>
              </div>

              {/* Quick summary */}
              <div className="p-4 bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl border border-violet-100">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">{city.city}</span>{' '}
                  {t('dashboard.investmentSummary', 'has a {{demand}} demand market with {{investment}} investment potential and {{yield}}% rental yield.', {
                    demand: demandInfo.label.toLowerCase(),
                    investment: investmentInfo.label.toLowerCase(),
                    yield: rentalYield,
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Neighborhoods & Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Top Neighborhoods */}
          {city.topNeighborhoods && city.topNeighborhoods.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5 text-primary" />
                {t('sections.topNeighborhoods')}
              </h3>
              <div className="space-y-3">
                {city.topNeighborhoods.map((neighborhood, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg hover:bg-primary/5 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-neutral-800">{neighborhood}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Insights */}
          {city.highlights && city.highlights.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-violet-500" />
                {t('sections.marketInsights')}
              </h3>
              <div className="space-y-3">
                {city.highlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-neutral-700 leading-relaxed">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 8-Year Price History Chart ──────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6 mb-6">
          {historyLoading ? (
            <div className="animate-pulse">
              <div className="h-6 w-48 bg-neutral-100 rounded mb-2" />
              <div className="h-3 w-72 bg-neutral-100 rounded mb-5" />
              <div className="h-64 bg-neutral-50 rounded-xl" />
            </div>
          ) : priceHistory && priceHistory.history.length > 0 ? (
            <PriceHistoryChart
              history={priceHistory.history}
              dataSource={priceHistory.dataSource}
              fredUrl={priceHistory.fredUrl}
              city={city.city}
            />
          ) : (
            <div className="text-center py-10 text-neutral-400 text-sm">
              <ChartBarIcon className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              Price history is being prepared for {city.city}.
            </div>
          )}
        </div>

        {/* ── Macroeconomic Indicators (World Bank) ───────────────────────── */}
        {economicData && (
          <div className="mb-8">
            <EconomicIndicatorsPanel data={economicData} />
          </div>
        )}

        {/* ── Explore Neighborhoods ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6 mb-8">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-primary" />
              Explore Neighborhoods
            </h3>
            {/* Tab switcher */}
            <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 w-fit">
              {(['map', 'list'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setSuburbView(view)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    suburbView === view
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {view === 'map' ? 'Interactive Map' : 'List View'}
                </button>
              ))}
            </div>
          </div>

          {/* Loading skeleton */}
          {suburbLoading && (
            <div className="animate-pulse space-y-3">
              <div className="h-[450px] bg-neutral-100 rounded-xl" />
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-neutral-100 rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {!suburbLoading && suburbError && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <GlobeAltIcon className="w-12 h-12 text-neutral-300 mb-3" />
              <p className="text-neutral-500 text-sm">
                Neighborhood data is being prepared. Check back soon.
              </p>
            </div>
          )}

          {/* Content */}
          {!suburbLoading && !suburbError && suburbData && suburbData.suburbs.length > 0 && (
            <>
              {suburbView === 'map' ? (
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Map */}
                  <div className="flex-1 min-w-0">
                    <Suspense
                      fallback={
                        <div className="h-[450px] bg-neutral-100 rounded-xl animate-pulse" />
                      }
                    >
                      <CitySuburbMap
                        suburbs={suburbData.suburbs}
                        cityAvgPricePerSqm={suburbData.cityAvgPricePerSqm}
                        selectedSuburb={selectedSuburb}
                        onSuburbSelect={setSelectedSuburb}
                      />
                    </Suspense>
                  </div>

                  {/* Detail panel */}
                  <div className="w-full lg:w-72 flex-shrink-0">
                    {selectedSuburb ? (
                      <SuburbDetailPanel
                        suburb={selectedSuburb}
                        cityAvgPricePerSqm={suburbData.cityAvgPricePerSqm}
                        onClose={() => setSelectedSuburb(null)}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-neutral-200 rounded-xl">
                        <MapPinIcon className="w-10 h-10 text-neutral-300 mb-2" />
                        <p className="text-sm font-medium text-neutral-500">Click a neighborhood</p>
                        <p className="text-xs text-neutral-400 mt-1">to see detailed stats</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* List view grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {suburbData.suburbs.map((suburb) => {
                    const vsAvg = suburb.stats.priceVsCityAvg;
                    const isSelected = selectedSuburb?.name === suburb.name;
                    return (
                      <button
                        key={suburb.name}
                        onClick={() => {
                          setSelectedSuburb(isSelected ? null : suburb);
                          setSuburbView('map');
                        }}
                        className={`text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-primary/40 bg-primary/5 shadow-sm'
                            : 'border-neutral-100 bg-neutral-50 hover:border-primary/20 hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-neutral-900 truncate">{suburb.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-200 text-neutral-600 flex-shrink-0">
                            #{suburb.rank}
                          </span>
                        </div>
                        <div className="text-base font-black text-neutral-900 mb-1">
                          €{suburb.stats.avgPricePerSqm.toLocaleString()}/m²
                        </div>
                        <div className={`text-[11px] font-semibold mb-2 ${vsAvg > 0 ? 'text-red-500' : vsAvg < 0 ? 'text-green-600' : 'text-neutral-500'}`}>
                          {vsAvg > 0 ? `+${vsAvg}%` : `${vsAvg}%`} vs city avg
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <span>+{suburb.stats.priceGrowthYoY}% YoY</span>
                          <span>{suburb.stats.demandScore}/100 demand</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Empty state (no suburbs for this city) */}
          {!suburbLoading && !suburbError && (!suburbData || suburbData.suburbs.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPinIcon className="w-12 h-12 text-neutral-300 mb-3" />
              <p className="text-neutral-500 text-sm">No neighborhood data available for {city.city} yet.</p>
            </div>
          )}
        </div>

        {/* Price Estimator - What different apartment sizes cost */}
        <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6 mb-8">
          <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <CurrencyEuroIcon className="w-5 h-5 text-green-600" />
            {t('dashboard.priceEstimator', 'Price Estimator')}
          </h3>
          <p className="text-sm text-neutral-500 mb-5">{t('dashboard.priceEstimatorDesc', 'Estimated property prices based on average €{{price}}/m² in {{city}}', { price: avgPrice.toLocaleString(), city: city.city })}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { size: 40, label: t('dashboard.studio', 'Studio'), desc: '~40 m²' },
              { size: 60, label: t('dashboard.oneBed', '1-Bedroom'), desc: '~60 m²' },
              { size: 85, label: t('dashboard.twoBed', '2-Bedroom'), desc: '~85 m²' },
              { size: 120, label: t('dashboard.threeBed', '3-Bedroom'), desc: '~120 m²' },
            ].map(({ size, label, desc }) => (
              <div key={size} className="p-4 bg-gradient-to-b from-neutral-50 to-white rounded-xl border border-neutral-100 text-center">
                <span className="text-xs font-medium text-neutral-500 block mb-1">{label}</span>
                <span className="text-lg sm:text-xl font-black text-neutral-900 block">
                  €{Math.round(avgPrice * size).toLocaleString()}
                </span>
                <span className="text-xs text-neutral-400">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What You Can Buy - Budget tiers */}
        <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6 mb-8">
          <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <HomeModernIcon className="w-5 h-5 text-primary" />
            {t('dashboard.whatYouCanBuy', 'What Your Budget Gets You')}
          </h3>
          <p className="text-sm text-neutral-500 mb-5">{t('dashboard.whatYouCanBuyDesc', 'Approximate property sizes for different budgets in {{city}}', { city: city.city })}</p>
          <div className="space-y-3">
            {[
              { budget: 50000, color: 'from-emerald-400 to-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
              { budget: 100000, color: 'from-blue-400 to-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
              { budget: 150000, color: 'from-violet-400 to-violet-500', bg: 'bg-violet-50', text: 'text-violet-700' },
              { budget: 250000, color: 'from-amber-400 to-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
            ].map(({ budget, color, bg, text }) => {
              const sqm = Math.round(budget / avgPrice);
              const maxBudgetSqm = Math.round(250000 / avgPrice);
              const barWidth = Math.min(100, (sqm / maxBudgetSqm) * 100);
              return (
                <div key={budget} className={`p-4 ${bg} rounded-xl`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${text}`}>€{budget.toLocaleString()}</span>
                    <span className="text-sm font-bold text-neutral-800">{sqm} m²</span>
                  </div>
                  <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${barWidth}%` }} />
                  </div>
                  <p className="text-xs text-neutral-500 mt-1.5">
                    {sqm < 35
                      ? t('dashboard.budgetStudio', 'Compact studio or small flat')
                      : sqm < 55
                      ? t('dashboard.budgetOneBed', 'Comfortable 1-bedroom apartment')
                      : sqm < 80
                      ? t('dashboard.budgetTwoBed', 'Spacious 2-bedroom apartment')
                      : sqm < 110
                      ? t('dashboard.budgetThreeBed', 'Large 3-bedroom family apartment')
                      : t('dashboard.budgetHouse', 'Premium property or small house')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rental Income Calculator */}
        <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6 mb-8">
          <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-amber-500" />
            {t('dashboard.rentalIncome', 'Rental Income Projections')}
          </h3>
          <p className="text-sm text-neutral-500 mb-5">{t('dashboard.rentalIncomeDesc', 'Estimated rental income based on {{yield}}% annual yield in {{city}}', { yield: rentalYield, city: city.city })}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { value: 50000, label: '€50K' },
              { value: 100000, label: '€100K' },
              { value: 200000, label: '€200K' },
            ].map(({ value, label }) => {
              const annualIncome = Math.round(value * (rentalYield / 100));
              const monthlyIncome = Math.round(annualIncome / 12);
              return (
                <div key={value} className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                  <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide block mb-3">
                    {t('dashboard.investmentOf', '{{label}} Investment', { label })}
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">{t('dashboard.annualIncome', 'Annual')}</span>
                      <span className="text-base font-black text-neutral-900">€{annualIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">{t('dashboard.monthlyIncome', 'Monthly')}</span>
                      <span className="text-base font-black text-green-600">€{monthlyIncome.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Country Comparison - Bar chart */}
        {countryCities && countryCities.length > 1 && (
          <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6 mb-8">
            <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-blue-500" />
              {t('dashboard.countryComparison', 'Price Comparison in {{country}}', { country: city.country })}
            </h3>
            <p className="text-sm text-neutral-500 mb-5">{t('dashboard.countryComparisonDesc', 'Average price per m² compared to other cities in {{country}}', { country: city.country })}</p>
            <div className="space-y-3">
              {[...countryCities]
                .sort((a, b) => b.avgPricePerSqm - a.avgPricePerSqm)
                .map((c) => {
                  const maxPrice = Math.max(...countryCities.map(cc => cc.avgPricePerSqm));
                  const barWidth = Math.max(8, (c.avgPricePerSqm / maxPrice) * 100);
                  const isCurrentCity = c.city === city.city;
                  return (
                    <div key={c.city} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg ${isCurrentCity ? 'bg-primary/5 ring-2 ring-primary/20' : 'bg-neutral-50'}`}>
                      <span className={`text-xs sm:text-sm font-semibold w-20 sm:w-28 flex-shrink-0 truncate ${isCurrentCity ? 'text-primary' : 'text-neutral-700'}`}>
                        {c.city} {isCurrentCity && <span className="text-xs">*</span>}
                      </span>
                      <div className="flex-1 h-5 sm:h-6 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${isCurrentCity ? 'bg-gradient-to-r from-primary to-primary/80' : 'bg-gradient-to-r from-neutral-300 to-neutral-400'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className={`text-xs sm:text-sm font-bold w-20 sm:w-24 text-right flex-shrink-0 ${isCurrentCity ? 'text-primary' : 'text-neutral-700'}`}>
                        €{safeNum(c.avgPricePerSqm).toLocaleString()}/m²
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Similar Cities in the same country */}
        {countryCities && countryCities.filter(c => c.city !== city.city).length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <GlobeAltIcon className="w-5 h-5 text-fuchsia-500" />
              {t('dashboard.otherCitiesIn', 'Other Cities in {{country}}', { country: city.country })}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {countryCities
                .filter(c => c.city !== city.city)
                .map((otherCity) => {
                  const otherImageUrl = getCityImageUrl(otherCity.city, { country: otherCity.country, width: 400, height: 200, quality: 'auto:good' });
                  const otherFallback = getCityFallbackGradient(otherCity.city);
                  const handleNavigate = () => {
                    const path = `/explore-cities/${encodeURIComponent(otherCity.city)}/${encodeURIComponent(otherCity.country)}`;
                    window.history.pushState({}, '', buildLocalizedPath(path));
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  };
                  return (
                    <button
                      key={otherCity.city}
                      onClick={handleNavigate}
                      className="group text-left bg-white rounded-xl shadow-md border border-neutral-100 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer"
                    >
                      <div className="relative h-28 overflow-hidden">
                        <img
                          src={otherImageUrl}
                          alt={otherCity.city}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.style.background = otherFallback;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <span className="absolute bottom-2 left-3 text-white font-bold text-base">{otherCity.city}</span>
                        <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                          otherCity.marketTrend === 'rising' ? 'bg-green-500/90 text-white'
                          : otherCity.marketTrend === 'declining' ? 'bg-red-500/90 text-white'
                          : 'bg-neutral-500/90 text-white'
                        }`}>
                          {otherCity.marketTrend === 'rising' ? '+' : ''}{otherCity.priceGrowthYoY}% YoY
                        </span>
                      </div>
                      <div className="p-3">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <span className="text-xs text-neutral-500 block">{t('dashboard.priceLabel', 'Price/m²')}</span>
                            <span className="text-sm font-bold text-neutral-900">€{otherCity.avgPricePerSqm.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-xs text-neutral-500 block">{t('cityCard.rentalYield')}</span>
                            <span className="text-sm font-bold text-blue-600">{otherCity.rentalYield}%</span>
                          </div>
                          <div>
                            <span className="text-xs text-neutral-500 block">{t('cityCard.demand')}</span>
                            <span className={`text-sm font-bold ${otherCity.demandScore >= 70 ? 'text-green-600' : otherCity.demandScore >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                              {otherCity.demandScore}/100
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Data freshness info */}
        <div className="mb-8 p-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
              <GlobeAltIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{t('aiInsights.title')}</h4>
              <p className="text-xs text-slate-500 mt-1">
                {t('aiInsights.lastUpdated', { date: safeFormatDate(city.lastUpdated) })} &bull; {t('aiInsights.dataSource')}
              </p>
            </div>
          </div>
        </div>

        {/* Debug panel - only visible in development mode */}
        {isDev && (
          <div className="mb-8 p-4 bg-neutral-900 rounded-xl border border-neutral-700 text-neutral-300 text-xs font-mono">
            <div className="flex items-center gap-2 mb-3">
              <InformationCircleIcon className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">{t('dashboard.debugTitle', 'Debug Info (dev only)')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div><span className="text-neutral-500">_id:</span> {city._id}</div>
              <div><span className="text-neutral-500">dataSource:</span> {city.dataSource}</div>
              <div><span className="text-neutral-500">displayOrder:</span> {city.displayOrder}</div>
              <div><span className="text-neutral-500">featured:</span> {String(city.featured)}</div>
              <div><span className="text-neutral-500">countryCode:</span> {city.countryCode}</div>
              <div><span className="text-neutral-500">marketTrend:</span> {city.marketTrend}</div>
              <div><span className="text-neutral-500">lastUpdated:</span> {city.lastUpdated}</div>
              <div><span className="text-neutral-500">healthScore:</span> {marketHealthScore}</div>
            </div>
          </div>
        )}

        {/* CTA: View Listings */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <button
            onClick={handleViewListings}
            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 min-h-[48px] bg-primary text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-primary-dark active:bg-primary-dark/90 transition-colors shadow-lg shadow-primary/25"
          >
            <MapPinIcon className="w-5 h-5" />
            {t('dashboard.viewListingsInCity', 'View All Listings in {{city}}', { city: city.city })}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={navigateBack}
            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 min-h-[48px] bg-white text-neutral-700 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-neutral-50 active:bg-neutral-100 transition-colors border border-neutral-200 shadow-sm"
          >
            <GlobeAltIcon className="w-5 h-5" />
            {t('dashboard.exploreMoreCities', 'Explore More Cities')}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CityDashboard;
