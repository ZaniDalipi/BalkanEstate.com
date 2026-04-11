import { NominatimResult } from '../types';
import { API_URL } from '../src/shared/api/config';

/**
 * Returns an appropriate map zoom level based on the geographic size of a
 * Nominatim bounding box.  Larger areas (cities) get a lower zoom; smaller
 * areas (streets, hotels, buildings) get a higher zoom.
 */
export function getZoomFromBoundingBox(
  boundingbox: [string, string, string, string]
): number {
  const [south, north, west, east] = boundingbox.map(Number);
  const maxDiff = Math.max(Math.abs(north - south), Math.abs(east - west));
  if (maxDiff > 0.5)  return 10; // large city / region
  if (maxDiff > 0.2)  return 11; // city
  if (maxDiff > 0.05) return 12; // large town / district
  if (maxDiff > 0.015) return 13; // town / borough
  if (maxDiff > 0.005) return 15; // suburb / village
  if (maxDiff > 0.002) return 16; // neighbourhood
  if (maxDiff > 0.0005) return 17; // road / street
  return 18;                        // building / hotel / POI
}

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
  } catch {
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
  } catch {
    return null;
  }
};