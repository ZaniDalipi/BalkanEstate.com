import { geocodeAddress } from './geocodingService';

/** Resolved geographic location with optional display metadata. */
export interface LocationResult {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  displayName?: string;
}

/**
 * Look up geographic coordinates for a full address string, delegating to geocodingService.
 * Returns null if the address cannot be resolved.
 */
export const lookupLocation = async (
  address: string,
  city?: string,
  country?: string
): Promise<LocationResult | null> => {
  const result = await geocodeAddress(address, city, country);
  if (!result) return null;
  return {
    lat: result.lat,
    lng: result.lng,
    city,
    country,
    displayName: result.display_name,
  };
};

/**
 * Look up geographic coordinates for a city and optional country, delegating to geocodingService.
 * Returns null if the city cannot be resolved.
 */
export const lookupCity = async (
  city: string,
  country?: string
): Promise<LocationResult | null> => {
  const result = await geocodeAddress(undefined, city, country);
  if (!result) return null;
  return {
    lat: result.lat,
    lng: result.lng,
    city,
    country,
    displayName: result.display_name,
  };
};
