import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import SavedSearchAccordion from './SavedSearchAccordion';
import { MagnifyingGlassPlusIcon } from '../../../constants';
import { SavedSearch, Filters, SellerType } from '../../../types';
import AdvertisementBanner from '../../AdvertisementBanner';
import Footer from '../../shared/Footer';
import FeaturedAgencies from '../../FeaturedAgencies'; // Add this import

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
  const { state, dispatch } = useAppContext();
  const { savedSearches, isAuthenticated } = state;
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'lastAccessed'>('createdAt');

  // Scroll to top on mount and when sort changes
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [sortBy]);

  const sortedSearches = useMemo(() => {
    const sorted = [...savedSearches];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'lastAccessed':
          return b.lastAccessed - a.lastAccessed;
        case 'createdAt':
        default:
          return b.createdAt - a.createdAt;
      }
    });
    return sorted;
  }, [savedSearches, sortBy]);


  const renderContent = () => {
    if (!isAuthenticated) {
        return (
            <div className="text-center py-16 px-4 bg-white rounded-lg shadow-md border">
                <MagnifyingGlassPlusIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-800">Log in to view your saved searches</h3>
                <p className="text-neutral-500 mt-2">Save your favorite search criteria and get notified about new listings.</p>
                <button 
                    onClick={() => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } })}
                    className="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors"
                >
                    Login / Register
                </button>
            </div>
        );
    }
    
    if (savedSearches.length === 0) {
        const handleSaveExample = () => {
            const now = Date.now();
            const exampleSearch: SavedSearch = {
                id: 'ss-example',
                name: 'Belgrade, under €400k',
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
                <h3 className="text-xl font-semibold text-neutral-800">You haven't saved any searches yet.</h3>
                <p className="text-neutral-500 mt-2">Perform a search and click "Save Search" to get started, or save this example:</p>
                
                <div className="mt-6 bg-neutral-50 p-4 rounded-lg border max-w-md mx-auto flex items-center justify-between">
                    <p className="font-semibold text-neutral-700">Example: Belgrade, under €400k</p>
                    <button 
                        onClick={handleSaveExample}
                        className="px-4 py-2 bg-secondary text-white font-bold rounded-lg shadow-sm hover:bg-opacity-90 transition-colors text-sm"
                    >
                        + Save
                    </button>
                </div>
    
                 <button 
                    onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' })}
                    className="mt-8 px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors"
                >
                    Or, Start a New Search
                </button>
            </div>
        );
    }
    
    return (
        <>
            <div className="flex justify-center mb-8">
                <div className="flex items-center space-x-1 bg-neutral-100 p-1 rounded-full border border-neutral-200">
                    <SortButton label="Newest" isActive={sortBy === 'createdAt'} onClick={() => setSortBy('createdAt')} />
                    <SortButton label="Name" isActive={sortBy === 'name'} onClick={() => setSortBy('name')} />
                    <SortButton label="Last Active" isActive={sortBy === 'lastAccessed'} onClick={() => setSortBy('lastAccessed')} />
                </div>
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
     
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary via-primary-dark to-primary text-white py-12 px-4 sm:px-6 lg:px-8 shadow-lg">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4">
            <MagnifyingGlassPlusIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Saved Searches</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Track your favorite search criteria and get updates
          </p>
          {savedSearches.length > 0 && (
            <div className="mt-6 inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full border border-white/30">
              <span className="text-2xl font-bold text-white">{savedSearches.length}</span>
              <div className="h-6 w-px bg-white/30"></div>
              <span className="text-sm font-semibold text-white/90">
                {savedSearches.length === 1 ? 'Saved Search' : 'Saved Searches'}
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