import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getFeaturedCities, CityMarketData } from '@/services/apiService';
import { formatPrice } from '@/utils/currency';
import { MapPinIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon, CalendarIcon, HomeIcon, FireIcon, StarIcon, BuildingOfficeIcon, GlobeAltIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import Footer from '@/components/shared/Footer';
import { SEO } from '@/src/components/seo';
import { getCityImageUrl, getCityFallbackGradient } from '@/config/cloudinaryConfig';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import ExploreCitiesHeroBanner from '@/components/shared/ExploreCitiesHeroBanner';
import { RandomCityBubbles, FloatingSphere, Decorative3DStyles } from '@/components/shared/Decorative3D';
import { searchLocation } from '@/services/osmService';

const CityRecommendations: React.FC = () => {
  const { t } = useTranslation(['exploreCities']);
  const [cities, setCities] = useState<CityMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const { dispatch, updateSearchPageState } = useAppContext();

  // Handle image load error - fallback to gradient
  const handleImageError = (cityName: string) => {
    setFailedImages(prev => new Set(prev).add(cityName));
  };

  // Find city coordinates from BALKAN_LOCATIONS
  const getCityCoordinates = (cityName: string, countryName: string): { lat: number; lng: number } | null => {
    const country = BALKAN_LOCATIONS.find(c => c.name === countryName);
    if (country) {
      const city = country.cities.find(c => c.name.toLowerCase() === cityName.toLowerCase());
      if (city) {
        return { lat: city.lat, lng: city.lng };
      }
    }
    return null;
  };

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      setLoading(true);
      const data = await getFeaturedCities(36); // Load 36 cities (3-4 per country)
      setCities(data);
    } catch (error) {
      // Error removed
    } finally {
      setLoading(false);
    }
  };

  const filteredCities = selectedCountry === 'all'
    ? cities
    : cities.filter(c => c.country === selectedCountry);

  const countries = Array.from(new Set(cities.map(c => c.country))).sort();

  const handleCityClick = async (city: CityMarketData) => {
    // Get fallback coordinates from BALKAN_LOCATIONS
    const fallbackCoords = getCityCoordinates(city.city, city.country);

    // Search OSM for the city to get proper coordinates and bounding box
    const searchQuery = `${city.city}, ${city.country}`;
    const results = await searchLocation(searchQuery);

    // Use the first result from OSM - it's typically the best match for the whole city
    const bestResult = results[0];

    // Get coordinates from OSM result or fallback
    const lat = bestResult ? Number(bestResult.lat) : fallbackCoords?.lat ?? 0;
    const lng = bestResult ? Number(bestResult.lon) : fallbackCoords?.lng ?? 0;

    // Get the bounding box from OSM to define the city area
    // This ensures we show ALL properties within the city boundaries
    let drawnBoundsJSON: string | null = null;
    if (bestResult?.boundingbox) {
      const [south, north, west, east] = bestResult.boundingbox.map(Number);
      drawnBoundsJSON = JSON.stringify({
        _southWest: { lat: south, lng: west },
        _northEast: { lat: north, lng: east }
      });
    }

    // Get the display name for the search field
    const displayName = `${city.city}, ${city.country}`;

    // Set filters - use geographic bounds for filtering properties
    // But show the city name in the search field for user context
    updateSearchPageState({
      filters: {
        country: 'any',
        query: displayName, // Show city name in search field for context
        minPrice: null,
        maxPrice: null,
        beds: null,
        baths: null,
        livingRooms: null,
        minSqft: null,
        maxSqft: null,
        sortBy: 'newest',
        sellerType: 'any',
        propertyType: 'any',
        minYearBuilt: null,
        maxYearBuilt: null,
        minParking: null,
        furnishing: 'any',
        heatingType: 'any',
        condition: 'any',
        viewType: 'any',
        energyRating: 'any',
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
        amenities: [],
      },
      activeFilters: {
        country: 'any',
        query: '', // Empty for filtering - use geographic bounds instead
        minPrice: null,
        maxPrice: null,
        beds: null,
        baths: null,
        livingRooms: null,
        minSqft: null,
        maxSqft: null,
        sortBy: 'newest',
        sellerType: 'any',
        propertyType: 'any',
        minYearBuilt: null,
        maxYearBuilt: null,
        minParking: null,
        furnishing: 'any',
        heatingType: 'any',
        condition: 'any',
        viewType: 'any',
        energyRating: 'any',
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
        amenities: [],
      },
      // Set city bounding box as the search area
      drawnBoundsJSON: drawnBoundsJSON,
      // Set map focus to city coordinates
      focusMapOnProperty: {
        lat,
        lng,
        address: `${city.city}, ${city.country}`,
        zoom: 12, // City-level zoom to show all listings
      },
      // Switch to map view on mobile
      mobileView: 'map',
    });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'rising') {
      return <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />;
    } else if (trend === 'declining') {
      return <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />;
    }
    return <ChartBarIcon className="w-4 h-4 text-neutral-500" />;
  };

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

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center gap-3">
            <GlobeAltIcon className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold text-neutral-900">{t('hero.title')}</h2>
          </div>
          <p className="text-neutral-600 mb-8">{t('hero.discoverSubtitle')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl border border-neutral-200 p-6 animate-pulse">
                <div className="h-6 bg-neutral-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-neutral-200 rounded w-full"></div>
                  <div className="h-4 bg-neutral-200 rounded w-full"></div>
                  <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (cities.length === 0) {
    return (
      <div className="p-8">
        <Decorative3DStyles />
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-md border p-12 relative overflow-hidden">
            {/* 3D Decorative background */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <div className="absolute top-4 right-8">
                <FloatingSphere size="lg" color="cyan" />
              </div>
              <div className="absolute bottom-8 left-8">
                <FloatingSphere size="md" color="pink" animate={false} />
              </div>
            </div>
            <div className="relative z-10">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
                <HomeIcon className="w-12 h-12 text-cyan-500" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-700 mb-2">{t('empty.title')}</h3>
              <p className="text-neutral-500">{t('empty.message')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats for hero banner
  const totalListings = cities.reduce((sum, c) => sum + c.listingsCount, 0);
  const avgGrowth = cities.length > 0 ? cities.reduce((sum, c) => sum + c.priceGrowthYoY, 0) / cities.length : 0;

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* SEO Meta Tags */}
      <SEO
        title={t('page.title')}
        description={t('hero.subtitle', { count: cities.length })}
        canonical={`${typeof window !== 'undefined' ? window.location.origin : ''}/explore-cities`}
        type="website"
      />

      {/* New Hero Banner */}
      <ExploreCitiesHeroBanner
        totalCities={cities.length}
        totalCountries={countries.length}
        totalListings={totalListings}
        avgGrowth={avgGrowth}
        selectedCountry={selectedCountry}
        countries={countries}
        onCountryChange={setSelectedCountry}
      />

      <div className="p-4 sm:p-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Market Intelligence Card */}
          {cities.length > 0 && (
            <div className="mb-8 p-5 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-2xl border border-violet-200 shadow-sm backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
                  <ChartBarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1 text-lg">{t('aiInsights.title')}</h4>
                  <p className="text-sm text-slate-600 mb-2">
                    {t('aiInsights.description', { count: cities.length })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t('aiInsights.lastUpdated', {
                      date: new Date(cities[0].lastUpdated).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    })} • {t('aiInsights.dataSource')}
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Section Header for City Cards */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {selectedCountry === 'all'
              ? t('cards.allCitiesTitle', 'All Cities')
              : t('cards.countryTitle', { country: selectedCountry })}
          </h2>
          <p className="text-slate-600">
            {t('cards.subtitle', { count: filteredCities.length })}
          </p>
        </div>

        {/* City Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCities.map((city) => {
            const hasImage = !failedImages.has(city.city);
            const imageUrl = getCityImageUrl(city.city, { country: city.country, width: 800, height: 400, quality: 'auto:good' });
            const fallbackGradient = getCityFallbackGradient(city.city);

            return (
              <button
                key={city._id}
                onClick={() => handleCityClick(city)}
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-2xl hover:border-primary hover:scale-[1.02] transition-all duration-300 text-left group shadow-md"
              >
                {/* City Image Header */}
                <div className="relative h-36 overflow-hidden">
                  {/* Background Image or Gradient Fallback */}
                  {hasImage ? (
                    <img
                      src={imageUrl}
                      alt={city.city}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={() => handleImageError(city.city)}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: fallbackGradient }}
                    />
                  )}

                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />

                  {/* City Name & Trend */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="w-4 h-4 text-white/90" />
                        <h3 className="text-lg font-bold text-white group-hover:text-primary-light transition-colors">
                          {city.city}
                        </h3>
                      </div>
                      <p className="text-xs text-white/80 ml-5.5">{city.country}</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg ${getTrendColor(city.marketTrend)}`}>
                      {getTrendIcon(city.marketTrend)}
                      {getTrendLabel(city.marketTrend)}
                    </div>
                  </div>

                  {/* Listings & Sold count on image */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <HomeIcon className="w-3.5 h-3.5 text-white/80" />
                      <span className="text-xs font-medium text-white/90">{city.listingsCount} {t('footer.listings')}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-white/80" />
                      <span className="text-xs font-medium text-white/90">{city.soldLastMonth} {t('footer.soldPerMonth')}</span>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  {/* Price Headline Section - Most important info front and center */}
                  <div className="flex items-stretch gap-3 mb-4">
                    {/* Avg Price per sqm - Primary metric */}
                    <div className="flex-1 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 border border-primary/10">
                      <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide mb-1">{t('cityCard.avgPricePerSqm')}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-neutral-900">€{city.avgPricePerSqm.toLocaleString()}</span>
                        <span className="text-xs font-medium text-neutral-500">/m²</span>
                      </div>
                    </div>
                    {/* Median Property Price */}
                    <div className="flex-1 bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                      <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide mb-1">{t('cityCard.medianPrice')}</p>
                      <p className="text-lg font-bold text-primary">{formatPrice(city.medianPrice, city.countryCode)}</p>
                    </div>
                  </div>

                  {/* Market Performance Grid - 3 key metrics in a clean grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {/* YoY Growth */}
                    <div className="text-center p-2 rounded-lg bg-neutral-50">
                      <span className={`text-base font-bold block ${
                        city.priceGrowthYoY > 0 ? 'text-green-600' : city.priceGrowthYoY < 0 ? 'text-red-600' : 'text-neutral-600'
                      }`}>
                        {city.priceGrowthYoY > 0 ? '+' : ''}{city.priceGrowthYoY}%
                      </span>
                      <span className="text-[10px] text-neutral-500 font-medium leading-tight block mt-0.5">{t('cityCard.yoyGrowth')}</span>
                    </div>
                    {/* Rental Yield */}
                    <div className="text-center p-2 rounded-lg bg-neutral-50">
                      <span className="text-base font-bold text-primary block">{city.rentalYield}%</span>
                      <span className="text-[10px] text-neutral-500 font-medium leading-tight block mt-0.5">{t('cityCard.rentalYield')}</span>
                    </div>
                    {/* Days on Market */}
                    <div className="text-center p-2 rounded-lg bg-neutral-50">
                      <span className="text-base font-bold text-neutral-700 block">{city.averageDaysOnMarket}</span>
                      <span className="text-[10px] text-neutral-500 font-medium leading-tight block mt-0.5">{t('cityCard.daysOnMarket')}</span>
                    </div>
                  </div>

                  {/* Demand & Investment Scores - Visual bars instead of text */}
                  <div className="space-y-2.5 mb-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-neutral-600 flex items-center gap-1">
                          <FireIcon className="w-3.5 h-3.5 text-amber-500" />
                          {t('cityCard.demand')}
                        </span>
                        <span className="text-xs font-bold text-amber-700">{city.demandScore}/100</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                          style={{ width: `${city.demandScore}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-neutral-600 flex items-center gap-1">
                          <StarIcon className="w-3.5 h-3.5 text-blue-500" />
                          {t('cityCard.investment')}
                        </span>
                        <span className="text-xs font-bold text-blue-700">{city.investmentScore}/100</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500"
                          style={{ width: `${city.investmentScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Top Neighborhoods */}
                  {city.topNeighborhoods && city.topNeighborhoods.length > 0 && (
                    <div className="border-t border-neutral-100 pt-3 mb-3">
                      <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <BuildingOfficeIcon className="w-3 h-3" />
                        {t('sections.topNeighborhoods')}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {city.topNeighborhoods.slice(0, 3).map((neighborhood, idx) => (
                          <span key={idx} className="inline-block bg-primary/5 text-primary text-xs px-2 py-1 rounded-md font-medium">
                            {neighborhood}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Highlights */}
                  {city.highlights && city.highlights.length > 0 && (
                    <div className="border-t border-neutral-100 pt-3">
                      <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <ChartBarIcon className="w-3 h-3" />
                        {t('sections.marketInsights')}
                      </h4>
                      <ul className="space-y-1.5">
                        {city.highlights.slice(0, 3).map((highlight, idx) => (
                          <li key={idx} className="text-xs text-neutral-600 flex items-start gap-2">
                            <span className="text-primary mt-0.5 font-bold text-[10px]">●</span>
                            <span className="flex-1 leading-relaxed">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* View Listings Button */}
                  <div className="mt-4 pt-3 border-t border-neutral-100">
                    <div className="w-full py-2.5 px-4 bg-primary text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 group-hover:bg-primary-dark transition-colors shadow-md">
                      <MapPinIcon className="w-4 h-4" />
                      <span>{t('footer.viewListings', 'View Listings on Map')}</span>
                      <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CityRecommendations;
