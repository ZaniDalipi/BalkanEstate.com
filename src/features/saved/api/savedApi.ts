// Saved API module
// Handles favorites and saved searches API calls

import { apiRequest } from '@/src/shared/api';
import type { Property, SavedSearch } from '@/src/shared/types';
import { transformBackendProperty } from '@/src/features/properties/api/propertyApi';

// --- Transformers ---

function transformBackendSavedSearch(backendSearch: any): SavedSearch {
  return {
    id: backendSearch._id,
    name: backendSearch.name,
    filters: backendSearch.filters,
    drawnBoundsJSON: backendSearch.drawnBoundsJSON,
    createdAt: new Date(backendSearch.createdAt).getTime(),
    lastAccessed: new Date(backendSearch.lastAccessed).getTime(),
    seenPropertyIds: backendSearch.seenPropertyIds || [],
    // Alert settings - default to enabled with instant frequency
    alertsEnabled: backendSearch.alertsEnabled ?? true,
    alertFrequency: backendSearch.alertFrequency || 'instant',
  };
}

// --- Favorites API ---

export const toggleSavedHome = async (
  propertyId: string,
  isSaved: boolean
): Promise<{ success: true }> => {
  await apiRequest('/favorites/toggle', {
    method: 'POST',
    body: { propertyId },
    requiresAuth: true,
  });

  return { success: true };
};

export const getFavorites = async (): Promise<Property[]> => {
  const response = await apiRequest<{ favorites: any[] }>('/favorites', {
    requiresAuth: true,
  });

  return response.favorites
    .filter((fav) => fav.propertyId)
    .map((fav) => transformBackendProperty(fav.propertyId));
};

// --- Agency Favorites API ---

export const toggleAgencyFavorite = async (
  agencyId: string
): Promise<{ isSaved: boolean }> => {
  const response = await apiRequest<{ isSaved: boolean }>('/agency-favorites/toggle', {
    method: 'POST',
    body: { agencyId },
    requiresAuth: true,
  });
  return response;
};

export const checkAgencyFavorite = async (
  agencyId: string
): Promise<boolean> => {
  const response = await apiRequest<{ isSaved: boolean }>(`/agency-favorites/check/${agencyId}`, {
    requiresAuth: true,
  });
  return response.isSaved;
};

// --- Saved Searches API ---

export const addSavedSearch = async (search: SavedSearch): Promise<SavedSearch> => {
  const response = await apiRequest<{ savedSearch: any }>('/saved-searches', {
    method: 'POST',
    body: {
      name: search.name,
      filters: search.filters,
      drawnBoundsJSON: search.drawnBoundsJSON,
    },
    requiresAuth: true,
  });

  return transformBackendSavedSearch(response.savedSearch);
};

export const getSavedSearches = async (): Promise<SavedSearch[]> => {
  const response = await apiRequest<{ savedSearches: any[] }>('/saved-searches', {
    requiresAuth: true,
  });

  return response.savedSearches.map(transformBackendSavedSearch);
};

export const updateSavedSearchAccessTime = async (
  searchId: string,
  seenPropertyIds?: string[]
): Promise<{ success: true }> => {
  await apiRequest(`/saved-searches/${searchId}/access`, {
    method: 'PATCH',
    requiresAuth: true,
    body: seenPropertyIds ? { seenPropertyIds } : undefined,
  });

  return { success: true };
};

export const updateSavedSearch = async (searchId: string, name: string): Promise<SavedSearch> => {
  const response = await apiRequest<{ savedSearch: any }>(`/saved-searches/${searchId}`, {
    method: 'PUT',
    requiresAuth: true,
    body: { name },
  });

  return transformBackendSavedSearch(response.savedSearch);
};

export const deleteSavedSearch = async (searchId: string): Promise<void> => {
  await apiRequest(`/saved-searches/${searchId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

// --- User Data API ---

export const getMyData = async (): Promise<{
  savedHomes: Property[];
  savedSearches: SavedSearch[];
  conversations: any[];
}> => {
  const [favorites, savedSearches, conversations] = await Promise.all([
    getFavorites(),
    getSavedSearches(),
    apiRequest<{ conversations: any[] }>('/conversations', { requiresAuth: true }).then(
      (res) => res.conversations || []
    ),
  ]);

  return {
    savedHomes: favorites,
    savedSearches,
    conversations,
  };
};
