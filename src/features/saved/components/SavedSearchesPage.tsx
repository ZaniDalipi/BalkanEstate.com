import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import SavedSearchAccordion from './SavedSearchAccordion';
import { MagnifyingGlassPlusIcon, TrashIcon } from '@/constants';
import { SavedSearch, Filters, SellerType } from '@/types';
import AdvertisementBanner from '@/src/features/seller/components/AdvertisementBanner';
import Footer from '@/components/shared/Footer';
import FeaturedAgencies from '@/components/FeaturedAgencies';
import { SEO } from '@/src/components/seo';
import * as api from '@/services/apiService';

const initialFilters: Filters = {
    query: '',
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
    country: '',
    minYearBuilt: 0,
    maxYearBuilt: 0,
    minParking: 0,
    furnishing: 'any',
    heatingType: 'any',
    condition: 'any',
    viewType: 'any',
    energyRating: 'any',
    hasBalcony: false,
    hasGarden: false,
    hasElevator: false,
    hasSecurity: false,
    hasAirConditioning: false,
    hasPool: false,
    petsAllowed: false,
    minFloorNumber: 0,
    maxFloorNumber: 0,
    maxDistanceToCenter: 0,
    maxDistanceToSea: 0,
    maxDistanceToSchool: 0,
    maxDistanceToHospital: 0,
    amenities: []
};

// Helper to validate a saved search is not corrupted
const isValidSavedSearch = (search: SavedSearch): boolean => {
    try {
        // Must have id and name
        if (!search || !search.id || !search.name) return false;

        // If drawnBoundsJSON exists, validate it's parseable
        if (search.drawnBoundsJSON) {
            let bounds = search.drawnBoundsJSON;
            if (typeof bounds === 'string') {
                const trimmed = bounds.trim();
                // Quick sanity checks before any parsing
                if (trimmed.length < 20 || !trimmed.startsWith('{') || !trimmed.endsWith('}')) {
                    return false;
                }
                if (!trimmed.includes('_southWest') || !trimmed.includes('_northEast')) {
                    return false;
                }
                // Try parsing to verify it's valid JSON
                const parsed = JSON.parse(trimmed);
                if (!parsed || typeof parsed !== 'object') return false;
            }
        }

        return true;
    } catch {
        return false;
    }
};

const SortButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex-grow text-center ${
            isActive
                ? 'bg-white text-primary shadow'
                : 'text-neutral-600 hover:bg-neutral-200'
        }`}
    >
        {label}
    </button>
);


const SavedSearchesPage: React.FC = () => {
  const { t } = useTranslation(['saved']);
  const { state, dispatch, fetchProperties } = useAppContext();
  const { savedSearches, isAuthenticated, properties } = state;
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'lastAccessed'>('createdAt');
  const [isClearing, setIsClearing] = useState(false);

  // Fetch properties if not already loaded
  useEffect(() => {
    if (properties.length === 0) {
      fetchProperties();
    }
  }, [properties.length, fetchProperties]);

  // Scroll to top on mount and when sort changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [sortBy]);

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all saved searches? This cannot be undone.')) {
      return;
    }
    setIsClearing(true);
    try {
      await api.deleteAllSavedSearches();
      dispatch({ type: 'CLEAR_ALL_SAVED_SEARCHES' });
    } catch (error) {
      console.error('Failed to clear saved searches:', error);
      alert('Failed to clear saved searches');
    } finally {
      setIsClearing(false);
    }
  };

  const sortedSearches = useMemo(() => {
    // Filter out invalid/corrupted entries before sorting
    const valid = savedSearches.filter(isValidSavedSearch);
    valid.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'lastAccessed':
          return (b.lastAccessed || 0) - (a.lastAccessed || 0);
        case 'createdAt':
        default:
          return (b.createdAt || 0) - (a.createdAt || 0);
      }
    });
    return valid;
  }, [savedSearches, sortBy]);


  const renderContent = () => {
    if (!isAuthenticated) {
        return (
            <div className="text-center py-16 px-4 bg-white rounded-lg shadow-md border">
                <MagnifyingGlassPlusIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-800">{t('loginRequired.title')}</h3>
                <p className="text-neutral-500 mt-2">{t('loginRequired.description')}</p>
                <button
                    onClick={() => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } })}
                    className="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors"
                >
                    {t('loginRequired.button')}
                </button>
            </div>
        );
    }
    
    if (sortedSearches.length === 0) {
        const handleSaveExample = () => {
            const now = Date.now();
            const exampleSearch: SavedSearch = {
                id: 'ss-example',
                name: t('example.name'),
                filters: { ...initialFilters, query: 'Belgrade', maxPrice: 400000 },
                drawnBoundsJSON: null,
                createdAt: now,
                lastAccessed: now,
                seenPropertyIds: [],
            };
            dispatch({ type: 'ADD_SAVED_SEARCH', payload: exampleSearch });
        };

        return (
             <div className="text-center py-16 px-4 bg-white rounded-lg shadow-md border">
                <MagnifyingGlassPlusIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-800">{t('empty.title')}</h3>
                <p className="text-neutral-500 mt-2">{t('empty.description')}</p>

                <div className="mt-6 bg-neutral-50 p-4 rounded-lg border max-w-md mx-auto flex items-center justify-between">
                    <p className="font-semibold text-neutral-700">{t('example.label')}: {t('example.name')}</p>
                    <button
                        onClick={handleSaveExample}
                        className="px-4 py-2 bg-secondary text-white font-bold rounded-lg shadow-sm hover:bg-opacity-90 transition-colors text-sm"
                    >
                        + {t('example.save')}
                    </button>
                </div>

                 <button
                    onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' })}
                    className="mt-8 px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors"
                >
                    {t('empty.startSearch')}
                </button>
            </div>
        );
    }
    
    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-1 bg-neutral-100 p-1 rounded-full border border-neutral-200">
                    <SortButton label={t('sort.newest')} isActive={sortBy === 'createdAt'} onClick={() => setSortBy('createdAt')} />
                    <SortButton label={t('sort.name')} isActive={sortBy === 'name'} onClick={() => setSortBy('name')} />
                    <SortButton label={t('sort.lastActive')} isActive={sortBy === 'lastAccessed'} onClick={() => setSortBy('lastAccessed')} />
                </div>
                <button
                    onClick={handleClearAll}
                    disabled={isClearing}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                    <TrashIcon className="w-4 h-4" />
                    {isClearing ? 'Clearing...' : 'Clear All'}
                </button>
            </div>
            <div className="space-y-4">
              {sortedSearches.map((search) => (
                <SavedSearchAccordion
                    key={search.id}
                    search={search}
                    onOpen={() => {}} // SavedSearchAccordion handles updating access time itself
                />
              ))}
            </div>
        </>
    );
  };

  return (
    <div className="bg-neutral-50 min-h-screen flex flex-col">
      {/* SEO - noindex for private page */}
      <SEO
        title={t('page.title')}
        description={t('page.description')}
        noindex={true}
      />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary via-primary-dark to-primary text-white py-12 px-4 sm:px-6 lg:px-8 shadow-lg">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4">
            <MagnifyingGlassPlusIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">{t('hero.title')}</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
          {sortedSearches.length > 0 && (
            <div className="mt-6 inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full border border-white/30">
              <span className="text-2xl font-bold text-white">{sortedSearches.length}</span>
              <div className="h-6 w-px bg-white/30"></div>
              <span className="text-sm font-semibold text-white/90">
                {sortedSearches.length === 1 ? t('hero.searchCount.singular') : t('hero.searchCount.plural')}
              </span>
            </div>
          )}
        </div>
      </div>

      <main className="py-8 flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {renderContent()}
        </div>
      </main>

      {/* Featured Agencies Banner - Add this section */}
      <div className="mt-12">
        <FeaturedAgencies />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default SavedSearchesPage;