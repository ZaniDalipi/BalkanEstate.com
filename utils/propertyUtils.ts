import { Property, Filters } from '../types';
import { BALKAN_COUNTRIES } from '../constants/countries';
import { createPropertyMatcher, rankProperties } from '../src/shared/search';

export const filterProperties = (properties: Property[], filters: Filters): Property[] => {
    // Text matching runs through the search engine: the query is parsed once,
    // its words are all required (typing more narrows), spellings are folded
    // so "Becici" and "Bečići" are one word, and a typo is forgiven.
    const queryMatcher = createPropertyMatcher(filters.query ?? '');

    return properties.filter(p => {
        // Ensure property has valid coordinates
        if (p.lat == null || p.lng == null || isNaN(p.lat) || isNaN(p.lng)) {
            return false;
        }

        const queryMatch = queryMatcher.matches(p);

        // Country filter — handles both key ("kosovo") and name ("Kosovo") formats
        let countryMatch = true;
        if (filters.country && filters.country !== 'any') {
            const filterVal = filters.country.toLowerCase();
            const selectedCountry = BALKAN_COUNTRIES[filterVal]
                || Object.values(BALKAN_COUNTRIES).find(c => c.name.toLowerCase() === filterVal);
            const countryLower = (p.country || '').toLowerCase();
            if (selectedCountry) {
                countryMatch = countryLower === selectedCountry.name.toLowerCase();
            } else {
                // Direct string comparison fallback
                countryMatch = countryLower === filterVal;
            }
        }

        // Listing type filter (sale vs rent)
        const listingTypeMatch = filters.listingType && filters.listingType !== 'any'
            ? (p.listingType || 'sale') === filters.listingType
            : true;

        // Basic filters
        const minPriceMatch = filters.minPrice ? p.price >= filters.minPrice : true;
        const maxPriceMatch = filters.maxPrice ? p.price <= filters.maxPrice : true;
        const bedsMatch = filters.beds ? p.beds >= filters.beds : true;
        const bathsMatch = filters.baths ? p.baths >= filters.baths : true;
        const livingRoomsMatch = filters.livingRooms ? p.livingRooms >= filters.livingRooms : true;
        const minSqftMatch = filters.minSqft ? p.sqft >= filters.minSqft : true;
        const maxSqftMatch = filters.maxSqft ? p.sqft <= filters.maxSqft : true;
        const sellerTypeMatch = filters.sellerType !== 'any' ? p.seller.type === filters.sellerType : true;
        const propertyTypeMatch = filters.propertyType !== 'any'
            ? p.propertyType === filters.propertyType
            : p.propertyType !== 'luxury-villa'; // luxury-villa is exclusive to the Luxury Villas tab

        // Advanced filters
        const minYearBuiltMatch = filters.minYearBuilt ? p.yearBuilt >= filters.minYearBuilt : true;
        const maxYearBuiltMatch = filters.maxYearBuilt ? p.yearBuilt <= filters.maxYearBuilt : true;
        const minParkingMatch = filters.minParking ? p.parking >= filters.minParking : true;

        const furnishingMatch = filters.furnishing !== 'any' ? p.furnishing === filters.furnishing : true;
        const heatingTypeMatch = filters.heatingType !== 'any' ? p.heatingType === filters.heatingType : true;
        const conditionMatch = filters.condition !== 'any' ? p.condition === filters.condition : true;
        const viewTypeMatch = filters.viewType !== 'any' ? p.viewType === filters.viewType : true;
        const energyRatingMatch = filters.energyRating !== 'any' ? p.energyRating === filters.energyRating : true;

        // Boolean filters (null means no filter applied)
        const hasBalconyMatch = filters.hasBalcony !== null ? p.hasBalcony === filters.hasBalcony : true;
        const hasGardenMatch = filters.hasGarden !== null ? p.hasGarden === filters.hasGarden : true;
        const hasElevatorMatch = filters.hasElevator !== null ? p.hasElevator === filters.hasElevator : true;
        const hasSecurityMatch = filters.hasSecurity !== null ? p.hasSecurity === filters.hasSecurity : true;
        const hasAirConditioningMatch = filters.hasAirConditioning !== null ? p.hasAirConditioning === filters.hasAirConditioning : true;
        const hasPoolMatch = filters.hasPool !== null ? p.hasPool === filters.hasPool : true;
        const petsAllowedMatch = filters.petsAllowed !== null ? p.petsAllowed === filters.petsAllowed : true;
        const has360TourMatch = filters.has360Tour !== null ? p.hasVirtualTour360 === filters.has360Tour : true;

        // Discount filter - property has discount if originalPrice exists and is higher than current price
        const hasDiscountMatch = filters.hasDiscount !== null ?
            (filters.hasDiscount === true
                ? (p.originalPrice !== undefined && p.originalPrice > p.price)
                : !(p.originalPrice !== undefined && p.originalPrice > p.price))
            : true;

        // Price increase filter - property has price increase if originalPrice exists and is lower than current price
        const hasPriceIncreaseMatch = filters.hasPriceIncrease !== null ?
            (filters.hasPriceIncrease === true
                ? (p.originalPrice !== undefined && p.originalPrice < p.price)
                : !(p.originalPrice !== undefined && p.originalPrice < p.price))
            : true;

        // Price per sqm filters
        const pricePerSqm = p.sqft > 0 ? p.price / p.sqft : 0;
        const minPricePerSqmMatch = filters.minPricePerSqm !== null ? (p.sqft > 0 && pricePerSqm >= filters.minPricePerSqm) : true;
        const maxPricePerSqmMatch = filters.maxPricePerSqm !== null ? (p.sqft > 0 && pricePerSqm <= filters.maxPricePerSqm) : true;

        // Days listed filter
        const maxDaysListedMatch = filters.maxDaysListed !== null ?
            (p.createdAt && (Date.now() - new Date(p.createdAt).getTime()) <= filters.maxDaysListed * 24 * 60 * 60 * 1000)
            : true;

        // Floor number filters
        const minFloorNumberMatch = filters.minFloorNumber !== null ? (p.floorNumber !== undefined && p.floorNumber >= filters.minFloorNumber) : true;
        const maxFloorNumberMatch = filters.maxFloorNumber !== null ? (p.floorNumber !== undefined && p.floorNumber <= filters.maxFloorNumber) : true;

        // Distance filters - include properties without distance data (treat as unknown/not yet calculated)
        const maxDistanceToCenterMatch = filters.maxDistanceToCenter !== null ?
            (p.distanceToCenter === undefined || p.distanceToCenter <= filters.maxDistanceToCenter) : true;
        const maxDistanceToSeaMatch = filters.maxDistanceToSea !== null ?
            (p.distanceToSea === undefined || p.distanceToSea <= filters.maxDistanceToSea) : true;
        const maxDistanceToSchoolMatch = filters.maxDistanceToSchool !== null ?
            (p.distanceToSchool === undefined || p.distanceToSchool <= filters.maxDistanceToSchool) : true;
        const maxDistanceToHospitalMatch = filters.maxDistanceToHospital !== null ?
            (p.distanceToHospital === undefined || p.distanceToHospital <= filters.maxDistanceToHospital) : true;

        // Amenities filter - check if property has all required amenities (bidirectional substring matching)
        const amenitiesMatch = filters.amenities && filters.amenities.length > 0 ?
            filters.amenities.every(amenity => {
                const propertyAmenities = p.amenities || [];
                const searchTerm = (amenity || '').toLowerCase().trim();
                if (!searchTerm) return true;
                return propertyAmenities.some(pAmenity => {
                    const propAmenity = (pAmenity || '').toLowerCase().trim();
                    if (!propAmenity) return false;
                    // Bidirectional matching: either the property amenity contains the search term,
                    // or the search term contains the property amenity
                    return propAmenity.includes(searchTerm) || searchTerm.includes(propAmenity);
                });
            }) : true;

        return queryMatch &&
               countryMatch &&
               listingTypeMatch &&
               minPriceMatch &&
               maxPriceMatch &&
               bedsMatch &&
               bathsMatch &&
               livingRoomsMatch &&
               sellerTypeMatch &&
               propertyTypeMatch &&
               minSqftMatch &&
               maxSqftMatch &&
               minYearBuiltMatch &&
               maxYearBuiltMatch &&
               minParkingMatch &&
               furnishingMatch &&
               heatingTypeMatch &&
               conditionMatch &&
               viewTypeMatch &&
               energyRatingMatch &&
               hasBalconyMatch &&
               hasGardenMatch &&
               hasElevatorMatch &&
               hasSecurityMatch &&
               hasAirConditioningMatch &&
               hasPoolMatch &&
               petsAllowedMatch &&
               has360TourMatch &&
               hasDiscountMatch &&
               hasPriceIncreaseMatch &&
               minFloorNumberMatch &&
               maxFloorNumberMatch &&
               maxDistanceToCenterMatch &&
               maxDistanceToSeaMatch &&
               maxDistanceToSchoolMatch &&
               maxDistanceToHospitalMatch &&
               amenitiesMatch &&
               minPricePerSqmMatch &&
               maxPricePerSqmMatch &&
               maxDaysListedMatch;
    });
};

/**
 * The listings a search page shows, in the order it shows them.
 *
 * Filtering and ordering in one place because the order depends on the
 * filters: "most relevant" means nothing without a query, and promoted
 * listings hold the top of every ordering. Kept out of the page hook so the
 * orderings can be tested directly — a `switch` this size is exactly where a
 * branch quietly stops returning anything.
 */
export const filterAndSortProperties = (properties: Property[], activeFilters: Filters): Property[] => {
    const filtered = filterProperties(properties, activeFilters);
    const now = Date.now();

    // Pre-compute promotion scores once (O(N)) — avoids O(N log N) calls inside comparators
    const scoreCache = new Map<string, number>();
    const tierScores: Record<string, number> = { premium: 100, highlight: 70, featured: 40, standard: 10 };
    for (const p of filtered) {
        const isActivelyPromoted = p.isPromoted && p.promotionEndDate && p.promotionEndDate > now;
        if (!isActivelyPromoted) {
            scoreCache.set(p.id, 0);
        } else {
            const tierScore = tierScores[p.promotionTier || 'standard'] || 0;
            scoreCache.set(p.id, tierScore + (p.hasUrgentBadge ? 5 : 0));
        }
    }
    const score = (p: Property) => scoreCache.get(p.id) ?? 0;

    // First sort by promotion score, then apply user's selected sort
    const promotionSorted = [...filtered].sort((a, b) => {
        const diff = score(b) - score(a);
        return diff !== 0 ? diff : 0;
    });

    // Helper to convert date/string/number to timestamp
    const toTimestamp = (value: number | string | Date | undefined | null): number => {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return new Date(value).getTime();
        if (value instanceof Date) return value.getTime();
        return 0;
    };

    // Helper to get property timestamp (prioritize lastRenewed over createdAt)
    const getPropertyTime = (p: Property) => {
        const renewed = toTimestamp(p.lastRenewed);
        const created = toTimestamp(p.createdAt);
        return Math.max(renewed, created);
    };

    /** Newest first — the ordering every other sort falls back to. */
    const byNewest = () => promotionSorted.sort((a, b) => {
        const diff = score(b) - score(a);
        return diff !== 0 ? diff : getPropertyTime(b) - getPropertyTime(a);
    });

    // Then apply user's sorting preference (maintaining promotion priority)
    switch (activeFilters.sortBy) {
        // How well each listing answers what was typed — the ordering any
        // search engine defaults to, and meaningless without a query, so
        // an empty box gets the newest-first ordering instead.
        case 'relevance': {
            if (!activeFilters.query.trim()) return byNewest();
            const relevance = new Map(
                rankProperties(promotionSorted, activeFilters.query).map(
                    (result) => [result.doc.id, result.score]
                )
            );
            return promotionSorted.sort((a, b) => {
                const diff = score(b) - score(a);
                if (diff !== 0) return diff;
                const byRelevance = (relevance.get(b.id) ?? 0) - (relevance.get(a.id) ?? 0);
                return byRelevance !== 0 ? byRelevance : getPropertyTime(b) - getPropertyTime(a);
            });
        }
        case 'price_asc': return promotionSorted.sort((a, b) => {
            const diff = score(b) - score(a);
            return diff !== 0 ? diff : a.price - b.price;
        });
        case 'price_desc': return promotionSorted.sort((a, b) => {
            const diff = score(b) - score(a);
            return diff !== 0 ? diff : b.price - a.price;
        });
        case 'area_asc':
        case 'sqft_asc': return promotionSorted.sort((a, b) => {
            const diff = score(b) - score(a);
            return diff !== 0 ? diff : a.sqft - b.sqft;
        });
        case 'area_desc':
        case 'sqft_desc': return promotionSorted.sort((a, b) => {
            const diff = score(b) - score(a);
            return diff !== 0 ? diff : b.sqft - a.sqft;
        });
        case 'beds_desc': return promotionSorted.sort((a, b) => {
            const diff = score(b) - score(a);
            return diff !== 0 ? diff : b.beds - a.beds;
        });
        case 'baths_desc': return promotionSorted.sort((a, b) => {
            const diff = score(b) - score(a);
            return diff !== 0 ? diff : b.baths - a.baths;
        });
        case 'oldest': return promotionSorted.sort((a, b) => {
            const diff = score(b) - score(a);
            return diff !== 0 ? diff : (a.createdAt || 0) - (b.createdAt || 0);
        });
        case 'featured': return promotionSorted.sort((a, b) => {
            const diff = score(b) - score(a);
            return diff !== 0 ? diff : getPropertyTime(b) - getPropertyTime(a);
        });
        case 'price_per_sqm': return promotionSorted.sort((a, b) => {
            const diff = score(b) - score(a);
            if (diff !== 0) return diff;
            const pricePerSqmA = a.sqft > 0 ? a.price / a.sqft : Infinity;
            const pricePerSqmB = b.sqft > 0 ? b.price / b.sqft : Infinity;
            return pricePerSqmA - pricePerSqmB;
        });
        case 'year_built_desc': return promotionSorted.sort((a, b) => {
            const diff = score(b) - score(a);
            return diff !== 0 ? diff : (b.yearBuilt || 0) - (a.yearBuilt || 0);
        });
        case 'price_reduced': return promotionSorted.sort((a, b) => {
            const diff = score(b) - score(a);
            if (diff !== 0) return diff;
            const hasDiscountA = a.hasDiscount ? 1 : 0;
            const hasDiscountB = b.hasDiscount ? 1 : 0;
            if (hasDiscountA !== hasDiscountB) return hasDiscountB - hasDiscountA;
            return getPropertyTime(b) - getPropertyTime(a);
        });
        case 'newest':
        default:
            return byNewest();
    }
};
