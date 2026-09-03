import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getFeaturedCities, CityMarketData } from '@/services/apiService';
import { mergeWithStaticFallback } from '../data/staticCities';
import { ChartBarIcon, HomeIcon, GlobeAltIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import Footer from '@/components/shared/Footer';
import { SEO } from '@/src/components/seo';
import { Helmet } from 'react-helmet-async';
import ExploreCitiesHeroBanner from '@/components/shared/ExploreCitiesHeroBanner';
import { FloatingSphere, Decorative3DStyles } from '@/components/shared/Decorative3D';
import { navigateWithLanguage } from '@/src/utils/languageRouting';
import { searchLocation } from '@/services/osmService';
import { findPlace } from '@/src/features/search/universal/places';
import { useSavedCities } from '../hooks/useSavedCities';
import { savedCityKey } from '../api/savedCitiesApi';
import CityMarketCard from './CityMarketCard';
import ExploreCitiesTabs, { type ExploreCitiesTab } from './ExploreCitiesTabs';
import SavedCitiesPanel from './SavedCitiesPanel';
import DataFreshness from './DataFreshness';

const CityRecommendations: React.FC = () => {
  const { t } = useTranslation(['exploreCities']);
  const [cities, setCities] = useState<CityMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ExploreCitiesTab>('all');
  // Read ?country= URL param to pre-select a country on mount
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('country') || 'all';
  });
  const { state, dispatch, updateSearchPageState } = useAppContext();

  const isSignedIn = Boolean(state.isAuthenticated && state.currentUser);
  const saved = useSavedCities(isSignedIn);

  const handleToggleSave = useCallback((city: CityMarketData) => {
    saved.toggle(city.city, city.country);
  }, [saved]);

  const openEmailSettings = useCallback(() => {
    navigateWithLanguage('/account/notifications');
  }, []);

  // Listen for country filter changes from footer (when component is already mounted)
  useEffect(() => {
    const handleCountryFilter = (e: Event) => {
      const country = (e as CustomEvent).detail;
      if (country) setSelectedCountry(country);
    };
    window.addEventListener('country-filter-change', handleCountryFilter);
    return () => window.removeEventListener('country-filter-change', handleCountryFilter);
  }, []);

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      setLoading(true);
      const data = await getFeaturedCities(100);
      setCities(mergeWithStaticFallback(data));
    } catch (error) {
      // Error removed
    } finally {
      setLoading(false);
    }
  };

  const filteredCities = selectedCountry === 'all'
    ? cities
    : cities.filter(c => c.country === selectedCountry);

  const lastFetchedAt = useMemo(() => {
    const timestamps = cities
      .map(c => new Date(c.lastUpdated).getTime())
      .filter(Number.isFinite);
    return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
  }, [cities]);

  const countries = Array.from(new Set(cities.map(c => c.country))).sort();

  const handleCityClick = (city: CityMarketData) => {
    const path = `/explore-cities/${encodeURIComponent(city.city)}/${encodeURIComponent(city.country)}`;
    navigateWithLanguage(path);
  };

  const handleViewListingsOnMap = async (e: React.MouseEvent, city: CityMarketData) => {
    e.stopPropagation();
    const searchQuery = `${city.city}, ${city.country}`;

    // The app already holds the coordinates of every city it lists, so the
    // map opens on the tap rather than after a geocoder round trip. The
    // geocoder is only for a city the catalogue somehow does not carry.
    const known = findPlace(city.city, city.country);
    const results = known?.lat === undefined ? await searchLocation(searchQuery) : [];
    const bestResult = results[0];
    const lat = known?.lat ?? (bestResult ? Number(bestResult.lat) : 0);
    const lng = known?.lng ?? (bestResult ? Number(bestResult.lon) : 0);

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
        title={t('exploreCities:seo.title')}
        description={t('exploreCities:seo.description', { cityCount: cities.length, countryCount: countries.length })}
        canonical={`${typeof window !== 'undefined' ? window.location.origin : ''}/explore-cities`}
        type="website"
      />

      {/* ItemList schema for city guides */}
      {filteredCities.length > 0 && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: t('exploreCities:seo.schemaName'),
              description: t('exploreCities:seo.schemaDescription', { count: filteredCities.length }),
              numberOfItems: filteredCities.length,
              itemListElement: filteredCities.slice(0, 15).map((city: CityMarketData, i: number) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${typeof window !== 'undefined' ? window.location.origin : ''}/search?city=${encodeURIComponent(city.city)}&country=${encodeURIComponent(city.country)}`,
                name: `${city.city}, ${city.country} - Property Market`,
              })),
            })}
          </script>
        </Helmet>
      )}

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
                  {/* Freshest row in the set: the age a reader should judge
                      these figures by. Sourced from the data, not from "now". */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <DataFreshness fetchedAt={lastFetchedAt} />
                    <span className="text-xs text-slate-500">{t('aiInsights.dataSource')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        <ExploreCitiesTabs
          active={activeTab}
          savedCount={saved.savedCities.length}
          onChange={setActiveTab}
        />

        {activeTab === 'all' ? (
          <div id="explore-cities-panel-all" role="tabpanel" aria-labelledby="explore-cities-tab-all">
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
              {filteredCities.map(city => (
                <CityMarketCard
                  key={city._id}
                  city={city}
                  isSaved={saved.isSaved(city.city, city.country)}
                  canSave={isSignedIn}
                  isSavePending={saved.pendingKey === savedCityKey(city.city, city.country)}
                  onToggleSave={handleToggleSave}
                  onOpen={handleCityClick}
                  onViewListings={handleViewListingsOnMap}
                />
              ))}
            </div>
          </div>
        ) : (
          <div id="explore-cities-panel-saved" role="tabpanel" aria-labelledby="explore-cities-tab-saved">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {t('saved.title', 'Saved places')}
              </h2>
              <p className="text-slate-600">
                {t('saved.subtitle', 'The cities you follow. We email you when their market moves.')}
              </p>
            </div>

            <SavedCitiesPanel
              savedCities={saved.savedCities}
              allCities={cities}
              isSignedIn={isSignedIn}
              isLoading={saved.isLoading}
              hasError={saved.error === 'load'}
              pendingKey={saved.pendingKey}
              onToggleSave={handleToggleSave}
              onOpen={handleCityClick}
              onViewListings={handleViewListingsOnMap}
              onOpenEmailSettings={openEmailSettings}
            />
          </div>
        )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CityRecommendations;
