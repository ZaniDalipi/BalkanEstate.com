import React, { useState, useMemo } from 'react';
import { SavedSearch } from '../../../types';
import PropertyCard from '../PropertyDisplay/PropertyCard';
import { ChevronUpIcon, ChevronDownIcon, TrashIcon, PencilIcon, CheckCircleIcon, XMarkIcon } from '../../../constants';
import { useAppContext } from '../../../context/AppContext';
import { filterProperties } from '../../../utils/propertyUtils';
import PropertyCardSkeleton from '../PropertyDisplay/PropertyCardSkeleton';
import L from 'leaflet';
import * as api from '../../../services/apiService';
import MapComponent from '../Maps/MapComponent';

interface SavedSearchAccordionProps {
  search: SavedSearch;
  onOpen: () => void;
}

const SavedSearchAccordion: React.FC<SavedSearchAccordionProps> = ({ search, onOpen }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(search.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [mapFlyTarget, setMapFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const { state, dispatch, updateSavedSearchAccessTime } = useAppContext();
  const { isLoadingProperties, allMunicipalities, properties } = state;

  const matchingProperties = useMemo(() => {
      // If there's a drawn area, prioritize geographic filtering
      if (search.drawnBoundsJSON) {
          try {
              const parsed = JSON.parse(search.drawnBoundsJSON);
              const drawnBounds = L.latLngBounds(parsed._southWest, parsed._northEast);
              // Only filter by bounds for drawn area searches
              return properties.filter(p => p.lat && p.lng && drawnBounds.contains([p.lat, p.lng]));
          } catch (e) {
              console.error("Failed to parse drawnBoundsJSON in SavedSearchAccordion", e);
              return [];
          }
      }

      // Otherwise use filter-based search
      return filterProperties(properties, search.filters);
  }, [properties, search.filters, search.drawnBoundsJSON]);

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

      // Set fly target for map when opening - calculate appropriate zoom to fit bounds
      if (search.drawnBoundsJSON) {
        try {
          const parsed = JSON.parse(search.drawnBoundsJSON);
          const bounds = L.latLngBounds(parsed._southWest, parsed._northEast);
          const center = bounds.getCenter();

          // Calculate zoom level to fit the bounds
          // This is a rough estimate - Leaflet will adjust it based on map size
          const latDiff = Math.abs(bounds.getNorth() - bounds.getSouth());
          const lngDiff = Math.abs(bounds.getEast() - bounds.getWest());
          const maxDiff = Math.max(latDiff, lngDiff);

          // Approximate zoom level based on degree span
          let zoom = 13; // default
          if (maxDiff > 1) zoom = 9;
          else if (maxDiff > 0.5) zoom = 10;
          else if (maxDiff > 0.2) zoom = 11;
          else if (maxDiff > 0.1) zoom = 12;
          else if (maxDiff > 0.05) zoom = 13;
          else if (maxDiff > 0.02) zoom = 14;
          else zoom = 15;

          setMapFlyTarget({ center: [center.lat, center.lng], zoom });
        } catch (e) {
          console.error("Failed to parse bounds for fly target", e);
        }
      }
    }
    setIsOpen(nextIsOpen);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion from toggling

    if (!confirm(`Are you sure you want to delete "${search.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteSavedSearch(search.id);
      dispatch({ type: 'REMOVE_SAVED_SEARCH', payload: search.id });
    } catch (error) {
      console.error('Failed to delete saved search:', error);
      alert('Failed to delete saved search. Please try again.');
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
      alert('Please enter a name');
      return;
    }

    setIsUpdating(true);
    try {
      await api.updateSavedSearch(search.id, newName);
      dispatch({ type: 'UPDATE_SAVED_SEARCH', payload: { ...search, name: newName } });
      setIsRenaming(false);
    } catch (error) {
      console.error('Failed to rename saved search:', error);
      alert('Failed to rename saved search. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="w-full p-4 flex justify-between items-center gap-3">
        <button
          onClick={handleToggle}
          className="flex-1 flex justify-between items-center text-left"
        >
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-lg font-bold"
              placeholder="Search name"
            />
          ) : (
            <h3 className="text-lg font-bold text-neutral-800">{search.name}</h3>
          )}
          <div className="flex items-center gap-2">
            {newPropertyCount > 0 && (
              <div className="bg-red-500 text-white rounded-full px-3 py-1.5">
                <span className="text-sm font-bold">{newPropertyCount} new</span>
              </div>
            )}
            <div className="flex items-center bg-indigo-600 text-white rounded-full transition-colors hover:bg-indigo-700">
              <span className="text-sm font-bold px-3 py-1.5 text-center">
                {propertyCount}
              </span>
              <div className="border-l border-indigo-400 p-1.5">
                {isOpen ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
              </div>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {isRenaming ? (
            <>
              <button
                onClick={handleSaveRename}
                disabled={isUpdating}
                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50"
                title="Save"
              >
                <CheckCircleIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleCancelRename}
                disabled={isUpdating}
                className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition-colors disabled:opacity-50"
                title="Cancel"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStartRename}
                className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                title="Rename search"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                title="Delete search"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-4 bg-neutral-50/70 border-t border-neutral-200 animate-fade-in">
          {/* Map display for saved search area */}
          {search.drawnBoundsJSON && (() => {
            try {
              const parsed = JSON.parse(search.drawnBoundsJSON);
              const bounds = L.latLngBounds(parsed._southWest, parsed._northEast);

              return (
                <div className="mb-4 rounded-lg overflow-hidden border border-neutral-300 shadow-sm" style={{ height: '400px' }}>
                  <MapComponent
                    properties={matchingProperties}
                    onMapMove={() => {}}
                    userLocation={null}
                    onSaveSearch={() => {}}
                    isSaving={false}
                    isAuthenticated={false}
                    mapBounds={null}
                    drawnBounds={bounds}
                    onDrawComplete={() => {}}
                    isDrawing={false}
                    onDrawStart={() => {}}
                    flyToTarget={mapFlyTarget}
                    onFlyComplete={() => setMapFlyTarget(null)}
                    onRecenter={() => {}}
                    isMobile={false}
                    searchMode="manual"
                  />
                </div>
              );
            } catch (e) {
              console.error("Failed to render map for saved search", e);
              return null;
            }
          })()}

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
            <p className="text-center text-neutral-500 py-4">No properties currently match this search.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedSearchAccordion;