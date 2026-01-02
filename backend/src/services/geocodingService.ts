import axios from 'axios';

interface GeocodeResult {
  lat: number;
  lng: number;
  display_name?: string;
}

/**
 * Geocode an address using OpenStreetMap Nominatim API (free, no API key required)
 * Waits for full address before geocoding for precision
 *
 * @param address - Street address (e.g., "Knez Mihailova 42")
 * @param city - City name (e.g., "Belgrade")
 * @param country - Country name (e.g., "Serbia")
 * @returns Latitude and longitude coordinates
 */
export async function geocodeAddress(
  address?: string,
  city?: string,
  country?: string
): Promise<GeocodeResult | null> {
  try {
    // Require at least city and country for meaningful geocoding
    if (!city || !country) {
      console.log('⚠️ Geocoding skipped: city and country are required');
      return null;
    }

    // Build full address string - prefer full address if available
    const addressParts: string[] = [];

    if (address) {
      addressParts.push(address);
    }
    if (city) {
      addressParts.push(city);
    }
    if (country) {
      addressParts.push(country);
    }

    const fullAddress = addressParts.join(', ');

    // If we only have city and country (no street address), still geocode but less precise
    if (!address) {
      console.log(`ℹ️ Geocoding city-level: ${fullAddress}`);
    } else {
      console.log(`📍 Geocoding full address: ${fullAddress}`);
    }

    // OpenStreetMap Nominatim API (free, no key required)
    // Rate limit: 1 request per second
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: fullAddress,
        format: 'json',
        limit: 1,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'BalkanEstateApp/1.0', // Required by Nominatim
      },
      timeout: 5000, // 5 second timeout
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];

      const geocodeResult: GeocodeResult = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name,
      };

      console.log(`✅ Geocoded: ${geocodeResult.lat}, ${geocodeResult.lng}`);
      console.log(`   Location: ${result.display_name}`);

      return geocodeResult;
    } else {
      console.log(`⚠️ No geocoding results found for: ${fullAddress}`);
      return null;
    }
  } catch (error: any) {
    console.error('❌ Geocoding error:', error.message);
    // Don't fail the entire request if geocoding fails
    return null;
  }
}

/**
 * Rate-limited geocoding function to respect Nominatim's 1 req/sec limit
 * Use this when geocoding multiple addresses in sequence
 */
let lastGeocodingTime = 0;
const GEOCODING_DELAY = 1000; 

export async function geocodeAddressWithRateLimit(
  address?: string,
  city?: string,
  country?: string
): Promise<GeocodeResult | null> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastGeocodingTime;

  if (timeSinceLastRequest < GEOCODING_DELAY) {
    const waitTime = GEOCODING_DELAY - timeSinceLastRequest;
    console.log(`⏳ Waiting ${waitTime}ms for rate limiting...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastGeocodingTime = Date.now();
  return geocodeAddress(address, city, country);
}

/**
 * Geocode agency address
 */
export async function geocodeAgency(agencyData: {
  address?: string;
  city?: string;
  country?: string;
}): Promise<{ lat?: number; lng?: number }> {
  const result = await geocodeAddressWithRateLimit(
    agencyData.address,
    agencyData.city,
    agencyData.country
  );

  if (result) {
    return { lat: result.lat, lng: result.lng };
  }

  return {};
}

/**
 * Geocode property address
 */
export async function geocodeProperty(propertyData: {
  address?: string;
  city?: string;
  country?: string;
}): Promise<{ lat?: number; lng?: number }> {
  const result = await geocodeAddressWithRateLimit(
    propertyData.address,
    propertyData.city,
    propertyData.country
  );

  if (result) {
    return { lat: result.lat, lng: result.lng };
  }

  return {};
}

/**
 * Geocode a free-form location string (e.g., "Belgrade, Serbia" or "Novi Sad")
 */
export async function geocodeFreeformLocation(location: string): Promise<GeocodeResult | null> {
  try {
    if (!location || location.trim().length < 2) {
      console.log('⚠️ Geocoding skipped: location string too short');
      return null;
    }

    console.log(`📍 Geocoding freeform location: ${location}`);

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: location.trim(),
        format: 'json',
        limit: 1,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'BalkanEstateApp/1.0',
      },
      timeout: 5000,
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];

      const geocodeResult: GeocodeResult = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name,
      };

      console.log(`✅ Geocoded freeform: ${geocodeResult.lat}, ${geocodeResult.lng}`);
      return geocodeResult;
    } else {
      console.log(`⚠️ No geocoding results found for: ${location}`);
      return null;
    }
  } catch (error: any) {
    console.error('❌ Freeform geocoding error:', error.message);
    return null;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is within a certain radius of another point
 */
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusKm: number
): boolean {
  const distance = calculateDistanceKm(centerLat, centerLng, pointLat, pointLng);
  return distance <= radiusKm;
}
