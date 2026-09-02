// Saved cities API module
// A saved city is a subscription: it drives the Explore-Cities market
// update email, so these calls always require an authenticated reader.

import { apiRequest } from '@/src/shared/api';

export interface SavedCity {
  city: string;
  country: string;
  countryCode: string;
  savedAt: string;
}

export interface SavedCitiesResponse {
  cities: SavedCity[];
  count: number;
  /** Server-enforced ceiling on follows, surfaced so the UI can explain a refusal. */
  limit: number;
}

export interface ToggleSavedCityResponse {
  saved: boolean;
  city: SavedCity | null;
}

/** Normalised identity, matching the server's `cityKey`. */
export const savedCityKey = (city: string, country: string): string =>
  `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;

export const getSavedCities = async (): Promise<SavedCitiesResponse> =>
  apiRequest<SavedCitiesResponse>('/saved-cities', { requiresAuth: true });

export const toggleSavedCity = async (
  city: string,
  country: string,
): Promise<ToggleSavedCityResponse> =>
  apiRequest<ToggleSavedCityResponse>('/saved-cities/toggle', {
    method: 'POST',
    body: { city, country },
    requiresAuth: true,
  });
