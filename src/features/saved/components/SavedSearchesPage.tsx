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
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { FloatingSphere, GlossyPill, Decorative3DStyles } from '@/components/shared/Decorative3D';
import SavedSearchesHeroBanner from '@/components/shared/SavedSearchesHeroBanner';

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

// Helper to validate a saved search has basic required fields
// Note: drawnBoundsJSON validation happens in SavedSearchAccordion - corrupted bounds just won't show map area
const isValidSavedSearch = (search: SavedSearch): boolean => {
    return !!(search && search.id && search.name);
};



const SavedSearchesPage: React.FC = () => {
  const { t } = useTranslation(['saved']);
  const { state, dispatch, fetchProperties } = useAppContext();
  const { savedSearches, isAuthenticated, properties, currentUser } = state;
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'lastAccessed'>('createdAt');
  const [isClearing, setIsClearing] = useState(false);
  const [isTogglingAlerts, setIsTogglingAlerts] = useState(false);
  const { confirm } = useConfirmation();
  const { success, error: showError } = useNotification();

  // Check if user has Pro subscription (buyer tier or higher)
  const isPro = useMemo(() => {
    if (!currentUser?.subscription) return false;
    const { tier, status } = currentUser.subscription;
    const eligibleTiers = ['buyer', 'pro', 'agency_owner', 'agency_agent'];
    const eligibleStatuses = ['active', 'trial', 'grace'];
    return eligibleTiers.includes(tier) && eligibleStatuses.includes(status);
  }, [currentUser]);

  // Check if any saved search has alerts enabled
  const emailAlertsEnabled = useMemo(() => {
    return savedSearches.some(search => search.alertsEnabled);
  }, [savedSearches]);

  // Handle global toggle of email alerts
  const handleToggleEmailAlerts = async () => {
    // If not Pro, show subscription modal
    if (!isPro) {
      dispatch({ type: 'TOGGLE_SUBSCRIPTION_MODAL', payload: { isOpen: true } });
      return;
    }

    // Toggle all saved searches alerts
    const newAlertsState = !emailAlertsEnabled;
    setIsTogglingAlerts(true);

    try {
      // Update all saved searches
      await Promise.all(
        savedSearches.map(search =>
          api.updateSavedSearchAlerts(search.id, newAlertsState, search.alertFrequency || 'instant')
        )
      );

      // Update local state for all saved searches
      savedSearches.forEach(search => {
        dispatch({
          type: 'UPDATE_SAVED_SEARCH',
          payload: { ...search, alertsEnabled: newAlertsState }
        });
      });

      if (newAlertsState) {
        await success(
          t('alerts.enabledTitle', 'Alerts Enabled'),
          t('alerts.enabledMessage', 'You will receive email notifications for all saved searches')
        );
      } else {
        await success(
          t('alerts.disabledTitle', 'Alerts Disabled'),
          t('alerts.disabledMessage', 'Email notifications have been turned off')
        );
      }
    } catch (err) {
      console.error('Failed to toggle alerts:', err);
      await showError(
        t('common:error', 'Error'),
        t('alerts.toggleFailed', 'Failed to update alert settings')
      );
    } finally {
      setIsTogglingAlerts(false);
    }
  };

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
    const confirmed = await confirm({
      title: t('clearAll.confirmTitle', 'Delete All Saved Searches'),
      message: t('clearAll.confirmMessage', 'Are you sure you want to delete all saved searches? This cannot be undone.'),
      confirmLabel: t('clearAll.confirmButton', 'Delete All'),
      cancelLabel: t('clearAll.cancelButton', 'Cancel'),
      type: 'danger',
    });

    if (!confirmed) {
      return;
    }
    setIsClearing(true);
    try {
      await api.deleteAllSavedSearches();
      dispatch({ type: 'CLEAR_ALL_SAVED_SEARCHES' });
    } catch (error) {
      console.error('Failed to clear saved searches:', error);
      dispatch({
        type: 'SHOW_ALERT',
        payload: {
          type: 'error',
          title: t('common:error', 'Error'),
          message: t('saved:searches.clearFailed', 'Failed to clear saved searches'),
        },
      });
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
            <div className="text-center py-16 px-4 bg-white rounded-2xl shadow-md border relative overflow-hidden">
                {/* 3D Decorative background */}
                <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute top-4 right-8">
                    <FloatingSphere size="md" color="blue" />
                  </div>
                  <div className="absolute bottom-8 left-8">
                    <FloatingSphere size="sm" color="cyan" animate={false} />
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <MagnifyingGlassPlusIcon className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-800">{t('loginRequired.title')}</h3>
                  <p className="text-neutral-500 mt-2">{t('loginRequired.description')}</p>
                  <button
                      onClick={() => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } })}
                      className="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors"
                  >
                      {t('loginRequired.button')}
                  </button>
                </div>
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
             <div className="text-center py-16 px-4 bg-white rounded-2xl shadow-md border relative overflow-hidden">
                {/* 3D Decorative background */}
                <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute top-4 left-8">
                    <FloatingSphere size="md" color="cyan" />
                  </div>
                  <div className="absolute bottom-8 right-8">
                    <FloatingSphere size="sm" color="blue" animate={false} />
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
                    <MagnifyingGlassPlusIcon className="w-10 h-10 text-cyan-500" />
                  </div>
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
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
          {sortedSearches.map((search) => (
            <SavedSearchAccordion
                key={search.id}
                search={search}
                onOpen={() => {}} // SavedSearchAccordion handles updating access time itself
            />
          ))}
        </div>
    );
  };

  return (
    <div className="bg-neutral-50 flex flex-col">
      {/* SEO - noindex for private page */}
      <SEO
        title={t('page.title')}
        description={t('page.description')}
        noindex={true}
      />

      {/* Modern Hero Banner */}
      <SavedSearchesHeroBanner
        totalSearches={sortedSearches.length}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onClearAll={handleClearAll}
        isClearing={isClearing}
        emailAlertsEnabled={emailAlertsEnabled}
        onToggleEmailAlerts={handleToggleEmailAlerts}
        isPro={isPro}
        isTogglingAlerts={isTogglingAlerts}
      />

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