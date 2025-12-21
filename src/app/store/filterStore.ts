// Filter Store - Client-side filter state with Zustand
// Manages property search filters

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { PropertyFilters } from '../../domain/entities/PropertyFilters';

interface FilterState {
  filters: PropertyFilters;
  activeFilters: PropertyFilters;

  // Map state
  mapBoundsJSON: string | null;
  drawnBoundsJSON: string | null;
  focusMapOnProperty: { lat: number; lng: number; address: string } | null;

  // UI state
  mobileView: 'map' | 'list';
  searchMode: 'manual' | 'ai';

  // Actions
  setFilters: (filters: PropertyFilters) => void;
  setActiveFilters: (filters: PropertyFilters) => void;
  resetFilters: () => void;
  setMapBounds: (bounds: string | null) => void;
  setDrawnBounds: (bounds: string | null) => void;
  setFocusMapOnProperty: (focus: { lat: number; lng: number; address: string } | null) => void;
  setMobileView: (view: 'map' | 'list') => void;
  setSearchMode: (mode: 'manual' | 'ai') => void;
}

export const useFilterStore = create<FilterState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        filters: PropertyFilters.getDefault(),
        activeFilters: PropertyFilters.getDefault(),
        mapBoundsJSON: null,
        drawnBoundsJSON: null,
        focusMapOnProperty: null,
        mobileView: 'map',
        searchMode: 'manual',

        // Actions
        setFilters: (filters) => set({ filters }),
        setActiveFilters: (filters) => set({ activeFilters: filters }),
        resetFilters: () => {
          const defaultFilters = PropertyFilters.getDefault();
          set({
            filters: defaultFilters,
            activeFilters: defaultFilters,
            drawnBoundsJSON: null
          });
        },
        setMapBounds: (bounds) => set({ mapBoundsJSON: bounds }),
        setDrawnBounds: (bounds) => set({ drawnBoundsJSON: bounds }),
        setFocusMapOnProperty: (focus) => set({ focusMapOnProperty: focus }),
        setMobileView: (view) => set({ mobileView: view }),
        setSearchMode: (mode) => set({ searchMode: mode }),
      }),
      {
        name: 'filter-store',
        // Only persist filters, not UI state
        partialize: (state) => ({
          filters: state.filters,
        }),
      }
    ),
    { name: 'filter-store' }
  )
);

// Selector hooks
export const usePropertyFilters = () => useFilterStore((state) => ({
  filters: state.filters,
  activeFilters: state.activeFilters,
  setFilters: state.setFilters,
  setActiveFilters: state.setActiveFilters,
  resetFilters: state.resetFilters,
}));

export const useMapState = () => useFilterStore((state) => ({
  mapBounds: state.mapBoundsJSON,
  drawnBounds: state.drawnBoundsJSON,
  focusProperty: state.focusMapOnProperty,
  setMapBounds: state.setMapBounds,
  setDrawnBounds: state.setDrawnBounds,
  setFocusProperty: state.setFocusMapOnProperty,
}));
