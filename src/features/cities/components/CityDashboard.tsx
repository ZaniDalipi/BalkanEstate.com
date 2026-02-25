import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCityMarketData, useCitiesByCountry } from '../hooks/useCityQueries';
import { formatPrice } from '@/utils/currency';
import { parseLanguageFromPath, buildLocalizedPath } from '@/src/utils/languageRouting';
import { getCityImageUrl, getCityFallbackGradient } from '@/config/cloudinaryConfig';
import { useAppContext } from '@/context/AppContext';
import { searchLocation } from '@/services/osmService';
import Footer from '@/components/shared/Footer';
import { SEO } from '@/src/components/seo';
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
} from '@/constants';

/** Extract city & country from the current URL path */
function parseCityFromUrl(): { city: string; country: string } | null {
  const { path } = parseLanguageFromPath(window.location.pathname);
  const match = path.match(/^\/explore-cities\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return {
    city: decodeURIComponent(match[1]),
    country: decodeURIComponent(match[2]),
  };
}

const CityDashboard: React.FC = () => {
  const { t } = useTranslation(['exploreCities']);
  const { dispatch, updateSearchPageState } = useAppContext();

  const params = useMemo(parseCityFromUrl, []);
  const { data: city, isLoading, error } = useCityMarketData(params?.city, params?.country);
  const { data: countryCities } = useCitiesByCountry(params?.country);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  const imageUrl = getCityImageUrl(city.city, { country: city.country, width: 1200, height: 500, quality: 'auto:good' });
  const fallbackGradient = getCityFallbackGradient(city.city);
  const demandInfo = getDemandInfo(city.demandScore);
  const investmentInfo = getInvestmentInfo(city.investmentScore);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={t('dashboard.seoTitle', '{{city}}, {{country}} - Real Estate Market Dashboard', { city: city.city, country: city.country })}
        description={t('dashboard.seoDescription', 'Explore real estate market data for {{city}}, {{country}}. Average price €{{price}}/m², {{trend}} market with {{yield}}% rental yield.', { city: city.city, country: city.country, price: city.avgPricePerSqm.toLocaleString(), trend: city.marketTrend, yield: city.rentalYield })}
        canonical={`${typeof window !== 'undefined' ? window.location.origin : ''}/explore-cities/${encodeURIComponent(city.city)}/${encodeURIComponent(city.country)}`}
        type="website"
      />

      {/* Hero header with city image */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img
          src={imageUrl}
          alt={city.city}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.style.background = fallbackGradient;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />

        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={navigateBack}
            className="flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-md text-white rounded-xl border border-white/20 hover:bg-black/50 transition-colors text-sm font-medium"
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
                <h1 className="text-3xl sm:text-4xl font-black text-white">{city.city}</h1>
              </div>
              <p className="text-white/70 text-lg ml-8">{city.country}</p>
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

        {/* Primary metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {/* Avg Price/m² */}
          <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <HomeIcon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-neutral-500">{t('cityCard.avgPricePerSqm')}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-neutral-900">€{city.avgPricePerSqm.toLocaleString()}</span>
              <span className="text-sm text-neutral-400">/m²</span>
            </div>
          </div>

          {/* Median Price */}
          <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <ChartBarIcon className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-neutral-500">{t('cityCard.medianPrice')}</span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-primary">{formatPrice(city.medianPrice, city.countryCode)}</span>
          </div>

          {/* YoY Growth */}
          <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${city.priceGrowthYoY > 0 ? 'bg-green-100' : city.priceGrowthYoY < 0 ? 'bg-red-100' : 'bg-neutral-100'}`}>
                {city.priceGrowthYoY > 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                ) : city.priceGrowthYoY < 0 ? (
                  <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
                ) : (
                  <ChartBarIcon className="w-4 h-4 text-neutral-500" />
                )}
              </div>
              <span className="text-xs font-medium text-neutral-500">{t('cityCard.yoyGrowth')}</span>
            </div>
            <span className={`text-2xl sm:text-3xl font-black ${city.priceGrowthYoY > 0 ? 'text-green-600' : city.priceGrowthYoY < 0 ? 'text-red-600' : 'text-neutral-700'}`}>
              {city.priceGrowthYoY > 0 ? '+' : ''}{city.priceGrowthYoY}%
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
            <span className="text-2xl sm:text-3xl font-black text-blue-600">{city.rentalYield}%</span>
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
                <span className="text-lg font-bold text-neutral-900">{city.listingsCount}</span>
              </div>
              {/* Sold last month */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-neutral-700">{t('dashboard.soldLastMonth', 'Sold Last Month')}</span>
                </div>
                <span className="text-lg font-bold text-neutral-900">{city.soldLastMonth}</span>
              </div>
              {/* Average days on market */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-neutral-700">{t('cityCard.daysOnMarket')}</span>
                </div>
                <span className="text-lg font-bold text-neutral-900">{city.averageDaysOnMarket} {t('cityCard.daysUnit')}</span>
              </div>
              {/* MoM Growth */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {city.priceGrowthMoM > 0 ? (
                    <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
                  ) : city.priceGrowthMoM < 0 ? (
                    <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
                  ) : (
                    <ChartBarIcon className="w-5 h-5 text-neutral-400" />
                  )}
                  <span className="text-sm font-medium text-neutral-700">{t('dashboard.momGrowth', 'Monthly Price Change')}</span>
                </div>
                <span className={`text-lg font-bold ${city.priceGrowthMoM > 0 ? 'text-green-600' : city.priceGrowthMoM < 0 ? 'text-red-600' : 'text-neutral-700'}`}>
                  {city.priceGrowthMoM > 0 ? '+' : ''}{city.priceGrowthMoM}%
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
                    style={{ width: `${city.demandScore}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-neutral-400">0</span>
                  <span className="text-xs font-semibold text-neutral-600">{city.demandScore}/100</span>
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
                    style={{ width: `${city.investmentScore}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-neutral-400">0</span>
                  <span className="text-xs font-semibold text-neutral-600">{city.investmentScore}/100</span>
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
                    yield: city.rentalYield,
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

        {/* Price Estimator - What different apartment sizes cost */}
        <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6 mb-8">
          <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <CurrencyEuroIcon className="w-5 h-5 text-green-600" />
            {t('dashboard.priceEstimator', 'Price Estimator')}
          </h3>
          <p className="text-sm text-neutral-500 mb-5">{t('dashboard.priceEstimatorDesc', 'Estimated property prices based on average €{{price}}/m² in {{city}}', { price: city.avgPricePerSqm.toLocaleString(), city: city.city })}</p>
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
                  €{(city.avgPricePerSqm * size).toLocaleString()}
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
              const sqm = Math.round(budget / city.avgPricePerSqm);
              const maxBudgetSqm = Math.round(250000 / city.avgPricePerSqm);
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
          <p className="text-sm text-neutral-500 mb-5">{t('dashboard.rentalIncomeDesc', 'Estimated rental income based on {{yield}}% annual yield in {{city}}', { yield: city.rentalYield, city: city.city })}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { value: 50000, label: '€50K' },
              { value: 100000, label: '€100K' },
              { value: 200000, label: '€200K' },
            ].map(({ value, label }) => {
              const annualIncome = Math.round(value * (city.rentalYield / 100));
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
                    <div key={c.city} className={`flex items-center gap-3 p-3 rounded-lg ${isCurrentCity ? 'bg-primary/5 ring-2 ring-primary/20' : 'bg-neutral-50'}`}>
                      <span className={`text-sm font-semibold w-28 flex-shrink-0 truncate ${isCurrentCity ? 'text-primary' : 'text-neutral-700'}`}>
                        {c.city} {isCurrentCity && <span className="text-xs">*</span>}
                      </span>
                      <div className="flex-1 h-6 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${isCurrentCity ? 'bg-gradient-to-r from-primary to-primary/80' : 'bg-gradient-to-r from-neutral-300 to-neutral-400'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-24 text-right flex-shrink-0 ${isCurrentCity ? 'text-primary' : 'text-neutral-700'}`}>
                        €{c.avgPricePerSqm.toLocaleString()}/m²
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
                      className="group text-left bg-white rounded-xl shadow-md border border-neutral-100 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all"
                    >
                      <div className="relative h-28 overflow-hidden">
                        <img
                          src={otherImageUrl}
                          alt={otherCity.city}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                {t('aiInsights.lastUpdated', {
                  date: new Date(city.lastUpdated).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }),
                })} &bull; {t('aiInsights.dataSource')}
              </p>
            </div>
          </div>
        </div>

        {/* CTA: View Listings */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <button
            onClick={handleViewListings}
            className="w-full sm:w-auto px-8 py-3.5 bg-primary text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
          >
            <MapPinIcon className="w-5 h-5" />
            {t('dashboard.viewListingsInCity', 'View All Listings in {{city}}', { city: city.city })}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={navigateBack}
            className="w-full sm:w-auto px-8 py-3.5 bg-white text-neutral-700 rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors border border-neutral-200 shadow-sm"
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
