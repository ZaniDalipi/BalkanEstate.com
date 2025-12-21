import L from 'leaflet';
import { Property, Filters } from '../../../../types';
import { filterProperties } from '../../../../utils/propertyUtils';

export const parseBounds = (boundsJSON: string | null): L.LatLngBounds | null => {
    if (!boundsJSON) return null;
    try {
        const parsed = JSON.parse(boundsJSON);
        return L.latLngBounds(parsed._southWest, parsed._northEast);
    } catch (e) {
        return null;
    }
};

export const getFilteredProperties = (
    properties: Property[],
    activeFilters: Filters,
    mapBounds: L.LatLngBounds | null,
    drawnBounds: L.LatLngBounds | null
): Property[] => {
    const baseFiltered = filterProperties(properties, activeFilters);
    
    switch (activeFilters.sortBy) {
        case 'price_asc': 
            baseFiltered.sort((a, b) => a.price - b.price);
            break;
        case 'price_desc': 
            baseFiltered.sort((a, b) => b.price - a.price);
            break;
        case 'beds_desc': 
            baseFiltered.sort((a, b) => b.beds - a.beds);
            break;
        case 'newest': 
            baseFiltered.sort((a, b) => 
                (Math.max(b.createdAt || 0, b.lastRenewed || 0)) - 
                (Math.max(a.createdAt || 0, a.lastRenewed || 0))
            );
            break;
    }

    // If a specific area is drawn, use it exclusively
    if (drawnBounds) {
        return baseFiltered.filter(p => drawnBounds.contains([p.lat, p.lng]));
    }
    
    // Otherwise, filter by the current map view if available
    if (mapBounds) {
        return baseFiltered.filter(p => mapBounds.contains([p.lat, p.lng]));
    }
    
    // Fallback
    return baseFiltered;
};

export const isFormSearchActive = (filters: Filters): boolean => {
    return filters.query.trim() !== '' || 
           filters.minPrice !== null || 
           filters.maxPrice !== null || 
           filters.beds !== null || 
           filters.baths !== null || 
           filters.livingRooms !== null || 
           filters.minSqft !== null || 
           filters.maxSqft !== null || 
           filters.sellerType !== 'any' || 
           filters.propertyType !== 'any';
};