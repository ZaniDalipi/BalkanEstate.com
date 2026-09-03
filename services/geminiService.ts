// AI Service - Routes all AI calls through the backend API
// This ensures API keys are never exposed in the browser bundle

import { Property, PropertyImageTag, ChatMessage, AiSearchQuery, Filters } from '../types';
import type { PropertyType } from '@/shared/types/property.types';
import { apiRequest, uploadRequest } from '@/src/shared/api';
import type { LatLngBounds } from 'leaflet';

export interface ImageTag {
    index: number;
    tag: PropertyImageTag;
}

export interface PropertyAnalysisResult {
    bedrooms: number;
    bathrooms: number;
    living_rooms: number;
    sq_meters: number;
    year_built: number;
    parking_spots: number;
    amenities: string[];
    key_features: string[];
    materials: string[];
    description: string;
    image_tags: ImageTag[];
    property_type: 'house' | 'apartment' | 'villa' | 'luxury-villa' | 'commercial' | 'parking' | 'land' | 'other';
    floor_number?: number;
    total_floors?: number;
}

export interface LocationContext {
    country?: string;
    city?: string;
    address?: string;
}

export interface DistanceCalculationResult {
    distanceToCenter: number; // in km
    distanceToSea: number; // in km
    distanceToSchool: number; // in km
    distanceToHospital: number; // in km
}

export interface AiChatResponse {
    responseMessage: string;
    searchQuery: AiSearchQuery | null;
    isFinalQuery: boolean;
}

export const generateDescriptionFromImages = async (
    images: File[],
    language: string,
    propertyType: PropertyType,
    location?: LocationContext
): Promise<PropertyAnalysisResult> => {
    const formData = new FormData();
    images.forEach(file => formData.append('images', file));
    formData.append('language', language);
    formData.append('propertyType', propertyType);
    if (location) {
        formData.append('location', JSON.stringify(location));
    }

    return uploadRequest<PropertyAnalysisResult>('/ai/generate-description', formData);
};

export interface RoomStyleResponse {
    imageDataUrl: string;
    style: string;
}

export interface RoomStyleUsage {
    used: number;
    limit: number;       // -1 = unlimited
    remaining: number;   // -1 = unlimited
    resetDate: string;
    isPremium: boolean;
}

/**
 * Fetch the current user's room-styler usage + resolved monthly limit.
 * The limit reflects the user's real account status (agency/pro/buyer/free).
 */
export const getRoomStyleUsage = async (): Promise<RoomStyleUsage> => {
    return apiRequest<RoomStyleUsage>('/ai/room-style/usage', {
        method: 'GET',
        requiresAuth: true,
    });
};

/**
 * Restyle a room photo (by its Cloudinary URL) into a chosen interior design style.
 * Returns a base64 data URL of the AI-generated image.
 */
export const restyleRoom = async (
    imageUrl: string,
    style: string
): Promise<RoomStyleResponse> => {
    return apiRequest<RoomStyleResponse>('/ai/restyle-room', {
        method: 'POST',
        body: { imageUrl, style },
        requiresAuth: true,
    });
};

export const calculatePropertyDistances = async (
    address: string,
    city: string,
    country: string,
    lat: number,
    lng: number
): Promise<DistanceCalculationResult> => {
    return apiRequest<DistanceCalculationResult>('/ai/calculate-distances', {
        method: 'POST',
        body: { address, city, country, lat, lng },
        requiresAuth: true,
    });
};

export const getAiChatResponse = async (history: ChatMessage[], properties: Property[]): Promise<AiChatResponse> => {
    return apiRequest<AiChatResponse>('/ai/chat', {
        method: 'POST',
        body: { history, properties },
        requiresAuth: true,
    });
};

export const generateSearchName = async (filters: Filters): Promise<string> => {
    try {
        const result = await apiRequest<{ name: string }>('/ai/generate-search-name', {
            method: 'POST',
            body: { filters },
            requiresAuth: true,
        });
        return result.name;
    } catch (_e) {
        // Fallback if AI is unavailable
        return filters.query || 'Saved Search';
    }
};

export const generateSearchNameFromCoords = async (lat: number, lng: number, bounds?: LatLngBounds): Promise<string> => {
    // Helper function to get the best location name from address
    const getLocationName = (address: any): string | null => {
        if (address.suburb) return address.suburb;
        if (address.neighbourhood) return address.neighbourhood;
        if (address.city) return address.city;
        if (address.town) return address.town;
        if (address.village) return address.village;
        if (address.municipality) return address.municipality;
        if (address.county) return address.county;
        if (address.state) return address.state;
        if (address.country) return address.country;
        return null;
    };

    // If bounds are provided, get location names for both corners via OSM
    if (bounds) {
        try {
            const { reverseGeocode } = await import('./osmService');

            const sw = bounds.getSouthWest();
            const swResult = await reverseGeocode(sw.lat, sw.lng);

            const ne = bounds.getNorthEast();
            const neResult = await reverseGeocode(ne.lat, ne.lng);

            const swName = swResult?.address ? getLocationName(swResult.address) : null;
            const neName = neResult?.address ? getLocationName(neResult.address) : null;

            if (swName && neName) {
                if (swName === neName) {
                    return swName;
                } else {
                    return `${swName} to ${neName}`;
                }
            }

            if (swName) return `Area near ${swName}`;
            if (neName) return `Area near ${neName}`;
        } catch (_error) {
            // Bounds reverse geocoding failed, trying center
        }
    }

    // Use reverse geocoding for center point
    try {
        const { reverseGeocode } = await import('./osmService');
        const result = await reverseGeocode(lat, lng);

        if (result && result.address) {
            const locationName = getLocationName(result.address);
            if (locationName) return locationName;
        }
    } catch (_error) {
        // Reverse geocoding failed, falling back to AI
    }

    // Fallback to AI if reverse geocoding fails
    try {
        const result = await apiRequest<{ name: string }>('/ai/generate-search-name', {
            method: 'POST',
            body: { filters: {}, lat, lng },
            requiresAuth: true,
        });
        return result.name;
    } catch (_e) {
        return `Search at ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }
};
