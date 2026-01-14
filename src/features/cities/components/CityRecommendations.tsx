import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getFeaturedCities, CityMarketData } from '@/services/apiService';
import { formatPrice } from '@/utils/currency';
import { MapPinIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon, CalendarIcon, HomeIcon, SparklesIcon, FireIcon, StarIcon, BuildingOfficeIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import Footer from '@/components/shared/Footer';
import { SEO } from '@/src/components/seo';
import { getCityImageUrl, getCityFallbackGradient } from '@/config/cloudinaryConfig';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { RandomCityBubbles, FloatingSphere, Decorative3DStyles } from '@/components/shared/Decorative3D';

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
      console.error('Failed to load featured cities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCities = selectedCountry === 'all'
    ? cities
    : cities.filter(c => c.country === selectedCountry);

  const countries = Array.from(new Set(cities.map(c => c.country))).sort();

  const handleCityClick = (city: CityMarketData) => {
    // Get city coordinates for map zoom
    const coords = getCityCoordinates(city.city, city.country);

    // Set filters to search for properties in this city
    updateSearchPageState({
      filters: {
        country: city.countryCode,
        query: city.city, // Use query field to search by city name
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
        country: city.countryCode,
        query: city.city, // Use query field to search by city name
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
      // Set map focus to city coordinates
      focusMapOnProperty: coords ? {
        lat: coords.lat,
        lng: coords.lng,
        address: `${city.city}, ${city.country}`,
      } : null,
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
            <SparklesIcon className="w-8 h-8 text-primary" />
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

  return (
    <div className="min-h-screen bg-neutral-50 relative">
      {/* Include 3D animation styles */}
      <Decorative3DStyles />

      {/* 3D Decorative Background Elements with Random City Images */}
      <RandomCityBubbles count={8} />

      {/* SEO Meta Tags */}
      <SEO
        title={t('page.title')}
        description={t('hero.subtitle', { count: cities.length })}
        canonical={`${typeof window !== 'undefined' ? window.location.origin : ''}/explore-cities`}
        type="website"
      />

      <div className="p-4 sm:p-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header with Stats */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <SparklesIcon className="w-8 h-8 text-primary" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">{t('hero.title')}</h2>
                </div>
                <p className="text-neutral-600 text-sm sm:text-base">
                  {t('hero.subtitle', { count: cities.length })}
                </p>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-neutral-200">
                <div className="flex items-center gap-2 mb-1">
                  <MapPinIcon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-neutral-500 font-medium">{t('stats.totalCities')}</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{cities.length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-neutral-200">
                <div className="flex items-center gap-2 mb-1">
                  <BuildingOfficeIcon className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-neutral-500 font-medium">{t('stats.countries')}</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{countries.length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-neutral-200">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-neutral-500 font-medium">{t('stats.avgGrowth')}</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  +{(cities.reduce((sum, c) => sum + c.priceGrowthYoY, 0) / cities.length).toFixed(1)}%
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-neutral-200">
                <div className="flex items-center gap-2 mb-1">
                  <HomeIcon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-neutral-500 font-medium">{t('stats.totalListings')}</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">
                  {cities.reduce((sum, c) => sum + c.listingsCount, 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* AI-Powered Market Intelligence - Moved to top */}
            {cities.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-primary/5 to-blue-50 rounded-xl border border-primary/20">
                <div className="flex items-start gap-3">
                  <SparklesIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-1">{t('aiInsights.title')}</h4>
                    <p className="text-sm text-neutral-600 mb-1">
                      {t('aiInsights.description', { count: cities.length })}
                    </p>
                    <p className="text-xs text-neutral-500">
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
          </div>

        {/* Country Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCountry('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCountry === 'all'
                ? 'bg-primary text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {t('filters.allCountries')} ({cities.length})
          </button>
          {countries.map(country => {
            const count = cities.filter(c => c.country === country).length;
            return (
              <button
                key={country}
                onClick={() => setSelectedCountry(country)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCountry === country
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {country} ({count})
              </button>
            );
          })}
        </div>

        {/* City Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCities.map((city) => {
            const hasImage = !failedImages.has(city.city);
            const imageUrl = getCityImageUrl(city.city, { country: city.country, width: 800, height: 400, quality: 'auto:good' });
            const fallbackGradient = getCityFallbackGradient(city.city);

            return (
              <button
                key={city._id}
                onClick={() => handleCityClick(city)}
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-xl hover:border-primary transition-all duration-300 text-left group"
              >
                {/* City Image Header with Gradient Fade */}
                <div className="relative h-40 overflow-hidden">
                  {/* Background Image or Gradient Fallback */}
                  {hasImage ? (
                    <img
                      src={imageUrl}
                      alt={city.city}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={() => handleImageError(city.city)}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: fallbackGradient }}
                    />
                  )}

                  {/* Gradient Overlay - Fades to white at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />

                  {/* Dark overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-transparent" />

                  {/* City Name Overlay */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                    <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <MapPinIcon className="w-5 h-5 text-white" />
                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                          {city.city}
                        </h3>
                      </div>
                      <p className="text-xs text-white/90 ml-7">{city.country}</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg ${getTrendColor(city.marketTrend)}`}>
                      {getTrendIcon(city.marketTrend)}
                      {getTrendLabel(city.marketTrend)}
                    </div>
                  </div>

                  {/* Price Overlay at Bottom */}
                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                    <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md">
                      <p className="text-xs text-neutral-500">{t('cityCard.avgPricePerSqm')}</p>
                      <p className="text-lg font-bold text-neutral-900">€{city.avgPricePerSqm.toLocaleString()}/m²</p>
                    </div>
                    <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md text-right">
                      <p className="text-xs text-neutral-500">{t('cityCard.medianPrice')}</p>
                      <p className="text-base font-semibold text-primary">{formatPrice(city.medianPrice, city.countryCode)}</p>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5">
                  {/* Score Badges */}
                  <div className="flex gap-2 mb-4">
                    <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-semibold">
                      <FireIcon className="w-4 h-4" />
                      {t('cityCard.demand')}: {city.demandScore}/100
                    </div>
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold">
                      <StarIcon className="w-4 h-4" />
                      {t('cityCard.investment')}: {city.investmentScore}/100
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="space-y-2.5 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">{t('cityCard.yoyGrowth')}</span>
                      <span className={`text-base font-semibold ${
                        city.priceGrowthYoY > 0 ? 'text-green-600' : city.priceGrowthYoY < 0 ? 'text-red-600' : 'text-neutral-600'
                      }`}>
                        {city.priceGrowthYoY > 0 ? '+' : ''}{city.priceGrowthYoY}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">{t('cityCard.rentalYield')}</span>
                      <span className="text-base font-semibold text-primary">
                        {city.rentalYield}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">{t('cityCard.daysOnMarket')}</span>
                      <span className="text-base font-semibold text-neutral-700">
                        {city.averageDaysOnMarket} {t('cityCard.days')}
                      </span>
                    </div>
                  </div>

                  {/* Top Neighborhoods */}
                  {city.topNeighborhoods && city.topNeighborhoods.length > 0 && (
                    <div className="border-t border-neutral-100 pt-3 mb-3">
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2 flex items-center gap-1">
                        <BuildingOfficeIcon className="w-3.5 h-3.5" />
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
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2 flex items-center gap-1">
                        <SparklesIcon className="w-3.5 h-3.5" />
                        {t('sections.marketInsights')}
                      </h4>
                      <ul className="space-y-1.5">
                        {city.highlights.slice(0, 3).map((highlight, idx) => (
                          <li key={idx} className="text-xs text-neutral-700 flex items-start gap-2">
                            <span className="text-primary mt-0.5 font-bold">•</span>
                            <span className="flex-1">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Stats Footer */}
                  <div className="border-t border-neutral-100 pt-3 mt-3 flex items-center justify-between text-xs text-neutral-500">
                    <div className="flex items-center gap-1">
                      <HomeIcon className="w-4 h-4" />
                      <span>{city.listingsCount} {t('footer.listings')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{city.soldLastMonth} {t('footer.soldPerMonth')}</span>
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
