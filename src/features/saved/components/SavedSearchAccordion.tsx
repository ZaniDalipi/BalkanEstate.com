import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SavedSearch } from '@/types';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import { ChevronUpIcon, ChevronDownIcon, TrashIcon, PencilIcon, CheckCircleIcon, XMarkIcon, BellIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { filterProperties } from '@/utils/propertyUtils';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';
import L from 'leaflet';
import * as api from '@/services/apiService';
import MapComponent from '@/src/features/map/components/MapComponent';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { BellDotIcon } from 'lucide-react';

interface SavedSearchAccordionProps {
  search: SavedSearch;
  onOpen: () => void;
}

const SavedSearchAccordion: React.FC<SavedSearchAccordionProps> = ({ search, onOpen }) => {
  const { t } = useTranslation(['saved']);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(search.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [mapFlyTarget, setMapFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(search.alertsEnabled || false);
  const [alertFrequency, setAlertFrequency] = useState<'instant' | 'daily' | 'weekly'>(search.alertFrequency || 'instant');
  const [isUpdatingAlerts, setIsUpdatingAlerts] = useState(false);
  const alertDropdownRef = useRef<HTMLDivElement>(null);
  const { state, dispatch, updateSavedSearchAccessTime } = useAppContext();
  const { isLoadingProperties, allMunicipalities, properties, currentUser } = state;
  const { confirm } = useConfirmation();
  const { error, warning, success } = useNotification();

  // Check if user has buyer subscription for alerts
  const hasBuyerSubscription = useMemo(() => {
    if (!currentUser?.subscription) return false;
    const { tier, status } = currentUser.subscription;
    const eligibleTiers = ['buyer', 'pro', 'agency_owner', 'agency_agent'];
    const eligibleStatuses = ['active', 'trial', 'grace'];
    return eligibleTiers.includes(tier) && eligibleStatuses.includes(status);
  }, [currentUser]);

  // Close alert dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alertDropdownRef.current && !alertDropdownRef.current.contains(event.target as Node)) {
        setShowAlertSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update alert settings
  const handleUpdateAlerts = async (enabled: boolean, frequency: 'instant' | 'daily' | 'weekly') => {
    setIsUpdatingAlerts(true);
    try {
      await api.updateSavedSearchAlerts(search.id, enabled, frequency);
      setAlertsEnabled(enabled);
      setAlertFrequency(frequency);
      dispatch({
        type: 'UPDATE_SAVED_SEARCH',
        payload: { ...search, alertsEnabled: enabled, alertFrequency: frequency }
      });
      if (enabled) {
        await success(t('accordion.alertsEnabled', 'Alerts enabled'), t('accordion.alertsEnabledDesc', 'You will receive {{frequency}} notifications', { frequency }));
      }
    } catch (err) {
      console.error('Failed to update alert settings:', err);
      await error(t('accordion.errorTitle', 'Error'), t('accordion.alertUpdateFailed', 'Failed to update alert settings'));
    } finally {
      setIsUpdatingAlerts(false);
      setShowAlertSettings(false);
    }
  };

  // Helper function to decode HTML entities (backend encodes quotes as &quot;)
  const decodeHtmlEntities = (str: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  };

  // Helper function to safely parse drawnBoundsJSON
  const parsedBounds = useMemo(() => {
    try {
      console.log('[SavedSearchAccordion] Parsing drawnBoundsJSON:', {
        searchId: search.id,
        searchName: search.name,
        drawnBoundsJSON: search.drawnBoundsJSON,
        type: typeof search.drawnBoundsJSON,
      });

      if (!search.drawnBoundsJSON) {
        console.log('[SavedSearchAccordion] No drawnBoundsJSON - returning null');
        return null;
      }

      let parsed: any = search.drawnBoundsJSON;

      // If it's a string, parse it
      if (typeof parsed === 'string') {
        let trimmed = parsed.trim();
        if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
          return null;
        }

        // Decode HTML entities if present (backend may encode quotes as &quot;)
        if (trimmed.includes('&quot;') || trimmed.includes('&#')) {
          trimmed = decodeHtmlEntities(trimmed);
          console.log('[SavedSearchAccordion] Decoded HTML entities:', trimmed);
        }

        parsed = JSON.parse(trimmed);
      }

      // Validate structure
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed._southWest || !parsed._northEast) return null;

      const sw = parsed._southWest;
      const ne = parsed._northEast;

      // Check lat/lng exist and are numbers
      if (typeof sw.lat !== 'number' || typeof sw.lng !== 'number' ||
          typeof ne.lat !== 'number' || typeof ne.lng !== 'number') {
        return null;
      }

      console.log('[SavedSearchAccordion] Successfully parsed bounds:', parsed);
      return parsed;
    } catch (e) {
      console.error('[SavedSearchAccordion] Failed to parse drawnBoundsJSON:', e);
      return null;
    }
  }, [search.drawnBoundsJSON]);

  // Create memoized Leaflet bounds object for the map
  const leafletDrawnBounds = useMemo(() => {
    if (!parsedBounds) return null;
    try {
      return L.latLngBounds(parsedBounds._southWest, parsedBounds._northEast);
    } catch (e) {
      console.error('[SavedSearchAccordion] Failed to create Leaflet bounds:', e);
      return null;
    }
  }, [parsedBounds]);

  const matchingProperties = useMemo(() => {
      console.log('[SavedSearchAccordion] Computing matchingProperties:', {
          searchId: search.id,
          hasParsedBounds: !!parsedBounds,
          propertiesCount: properties.length,
      });

      // If there's a valid drawn area, prioritize geographic filtering
      if (parsedBounds) {
          try {
              const drawnBounds = L.latLngBounds(parsedBounds._southWest, parsedBounds._northEast);
              // Only filter by bounds for drawn area searches
              const filtered = properties.filter(p => p.lat && p.lng && drawnBounds.contains([p.lat, p.lng]));
              console.log('[SavedSearchAccordion] Filtered by bounds:', {
                  originalCount: properties.length,
                  filteredCount: filtered.length,
              });
              return filtered;
          } catch (e) {
              console.error("[SavedSearchAccordion] Failed to create bounds from parsed data:", e);
              return [];
          }
      }

      // Otherwise use filter-based search
      console.log('[SavedSearchAccordion] No parsed bounds, using filter-based search');
      return filterProperties(properties, search.filters);
  }, [properties, search.filters, parsedBounds, search.id]);

  // Calculate new properties (properties not in seenPropertyIds)
  const newProperties = useMemo(() => {
    const seenIds = search.seenPropertyIds || [];
    return matchingProperties.filter(p => !seenIds.includes(p.id));
  }, [matchingProperties, search.seenPropertyIds]);

  const propertyCount = matchingProperties.length;
  const newPropertyCount = newProperties.length;

  const handleToggle = async () => {
    const nextIsOpen = !isOpen;
    if (nextIsOpen) {
      // Scroll to top when opening accordion
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Mark all matching properties as seen when opening
      const allPropertyIds = matchingProperties.map(p => p.id);
      await updateSavedSearchAccessTime(search.id, allPropertyIds);
      onOpen(); // Call onOpen after updating (in case parent needs to do something)

      // Set fly target for map when opening - calculate appropriate zoom to fit bounds with padding
      if (parsedBounds) {
        try {
          const bounds = L.latLngBounds(parsedBounds._southWest, parsedBounds._northEast);
          const center = bounds.getCenter();

          // Calculate zoom level to fit the bounds
          // This is a rough estimate - Leaflet will adjust it based on map size
          const latDiff = Math.abs(bounds.getNorth() - bounds.getSouth());
          const lngDiff = Math.abs(bounds.getEast() - bounds.getWest());
          const maxDiff = Math.max(latDiff, lngDiff);

          // Approximate zoom level based on degree span
          let zoom = 13; // default
          if (maxDiff > 2) zoom = 7;
          else if (maxDiff > 1) zoom = 8;
          else if (maxDiff > 0.5) zoom = 9;
          else if (maxDiff > 0.2) zoom = 10;
          else if (maxDiff > 0.1) zoom = 11;
          else if (maxDiff > 0.05) zoom = 12;
          else if (maxDiff > 0.02) zoom = 13;
          else zoom = 14;

          // Subtract 1 from zoom for better padding around the search area
          const finalZoom = Math.max(5, zoom - 1);

          setMapFlyTarget({ center: [center.lat, center.lng], zoom: finalZoom });
        } catch (e) {
          console.error("Failed to create bounds for fly target", e);
        }
      }
    }
    setIsOpen(nextIsOpen);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion from toggling

    const confirmed = await confirm({
      title: t('accordion.deleteTitle', 'Delete Saved Search'),
      message: t('accordion.confirmDelete', { name: search.name }),
      confirmLabel: t('accordion.deleteButton', 'Delete'),
      cancelLabel: t('accordion.cancelButton', 'Cancel'),
      type: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteSavedSearch(search.id);
      dispatch({ type: 'REMOVE_SAVED_SEARCH', payload: search.id });
    } catch (err) {
      console.error('Failed to delete saved search:', err);
      await error(t('accordion.errorTitle', 'Error'), t('accordion.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
    setNewName(search.name);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(false);
    setNewName(search.name);
  };

  const handleSaveRename = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!newName.trim()) {
      await warning(t('accordion.warningTitle', 'Warning'), t('accordion.enterName'));
      return;
    }

    setIsUpdating(true);
    try {
      await api.updateSavedSearch(search.id, newName);
      dispatch({ type: 'UPDATE_SAVED_SEARCH', payload: { ...search, name: newName } });
      setIsRenaming(false);
    } catch (err) {
      console.error('Failed to rename saved search:', err);
      await error(t('accordion.errorTitle', 'Error'), t('accordion.renameFailed'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-neutral-200 overflow-hidden">
      {/* Header - Mobile Responsive */}
      <div className="w-full p-4">
        <div className="flex items-start sm:items-center gap-3">
          {/* Main clickable area */}
          <button
            onClick={handleToggle}
            className="flex-1 min-w-0"
          >
            {/* Mobile: Stack layout, Desktop: Row layout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              {/* Name */}
              {isRenaming ? (
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-lg font-bold"
                  placeholder={t('accordion.namePlaceholder')}
                />
              ) : (
                <h3 className="text-lg font-bold text-neutral-800 truncate text-left">{search.name}</h3>
              )}

              {/* Badges row - always horizontal */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {newPropertyCount > 0 && (
                  <div className="bg-red-500 text-white rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5">
                    <span className="text-xs sm:text-sm font-bold whitespace-nowrap">{newPropertyCount} {t('accordion.new')}</span>
                  </div>
                )}
                <div className="flex items-center bg-indigo-600 text-white rounded-full transition-colors hover:bg-indigo-700">
                  <span className="text-xs sm:text-sm font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 text-center min-w-[1.75rem] sm:min-w-[2rem]">
                    {isLoadingProperties || properties.length === 0 ? '...' : propertyCount}
                  </span>
                  <div className="border-l border-indigo-400 p-1 sm:p-1.5">
                    {isOpen ? <ChevronUpIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {isRenaming ? (
            <>
              <button
                onClick={handleSaveRename}
                disabled={isUpdating}
                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50"
                title={t('accordion.save')}
              >
                <CheckCircleIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleCancelRename}
                disabled={isUpdating}
                className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition-colors disabled:opacity-50"
                title={t('accordion.cancel')}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              {/* Alert Settings Button */}
              <div className="relative" ref={alertDropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasBuyerSubscription) {
                      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
                      const currentLang = window.location.pathname.split('/')[1] || 'en';
                      const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
                      const lang = validLangs.includes(currentLang) ? currentLang : 'en';
                      window.history.pushState({}, '', `/${lang}/subscribe`);
                      return;
                    }
                    setShowAlertSettings(!showAlertSettings);
                  }}
                  className={`p-2 rounded-full transition-colors ${
                    alertsEnabled
                      ? 'text-green-600 bg-green-50 hover:bg-green-100'
                      : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600'
                  }`}
                  title={hasBuyerSubscription ? t('accordion.alertSettings', 'Alert settings') : t('accordion.upgradeForAlerts', 'Upgrade to enable alerts')}
                >
                  {alertsEnabled ? <BellIcon className="w-5 h-5" /> : <BellDotIcon className="w-5 h-5" />}
                </button>

                {/* Alert Settings Dropdown */}
                {showAlertSettings && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 z-50 p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-neutral-700">
                        {t('accordion.emailAlerts', 'Email alerts')}
                      </span>
                      <button
                        onClick={() => handleUpdateAlerts(!alertsEnabled, alertFrequency)}
                        disabled={isUpdatingAlerts}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          alertsEnabled ? 'bg-green-500' : 'bg-neutral-300'
                        } ${isUpdatingAlerts ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            alertsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {alertsEnabled && (
                      <div className="space-y-1">
                        <p className="text-xs text-neutral-500 mb-2">{t('accordion.frequency', 'Frequency')}</p>
                        {(['instant', 'daily', 'weekly'] as const).map((freq) => (
                          <button
                            key={freq}
                            onClick={() => handleUpdateAlerts(true, freq)}
                            disabled={isUpdatingAlerts}
                            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                              alertFrequency === freq
                                ? 'bg-primary text-white'
                                : 'hover:bg-neutral-100 text-neutral-700'
                            } ${isUpdatingAlerts ? 'opacity-50' : ''}`}
                          >
                            {t(`accordion.${freq}`, freq.charAt(0).toUpperCase() + freq.slice(1))}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleStartRename}
                className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                title={t('accordion.rename')}
              >
                <PencilIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                title={t('accordion.delete')}
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-4 bg-neutral-50/70 border-t border-neutral-200 animate-fade-in">
          {/* Map display for saved search area */}
          {leafletDrawnBounds && (
            <div className="mb-4 rounded-lg overflow-hidden border border-neutral-300 shadow-sm" style={{ height: '400px' }}>
              <MapComponent
                properties={matchingProperties}
                onMapMove={() => {}}
                userLocation={null}
                onSaveSearch={() => {}}
                isSaving={false}
                isAuthenticated={false}
                mapBounds={null}
                drawnBounds={leafletDrawnBounds}
                onDrawComplete={() => {}}
                isDrawing={false}
                onDrawStart={() => {}}
                flyToTarget={mapFlyTarget}
                onFlyComplete={() => setMapFlyTarget(null)}
                onRecenter={() => {}}
                isMobile={false}
                searchMode="manual"
                hideControls={true}
              />
            </div>
          )}

          {/* Property List */}
          {isLoadingProperties ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                   <PropertyCardSkeleton key={index} />
               ))}
           </div>
          ) : propertyCount > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {matchingProperties.map((prop) => (
                <PropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          ) : (
            <p className="text-center text-neutral-500 py-4">{t('accordion.noProperties')}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedSearchAccordion;