import { NominatimResult } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const searchLocation = async (query: string, countryCode?: string): Promise<NominatimResult[]> => {
  if (query.trim().length < 3) {
    return [];
  }

  const params = new URLSearchParams({ query });

  // If country is specified, add it to the search to restrict results
  if (countryCode) {
    params.append('countryCode', countryCode);
  }

  try {
    const response = await fetch(`${API_URL}/geocoding/search?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data: NominatimResult[] = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch locations from backend:', error);
    return [];
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<NominatimResult | null> => {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
  });

  try {
    const response = await fetch(`${API_URL}/geocoding/reverse?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data: NominatimResult = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to reverse geocode location from backend:', error);
    return null;
  }
};