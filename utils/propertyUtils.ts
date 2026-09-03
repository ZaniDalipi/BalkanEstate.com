import { Property, Filters } from '../types';
import { BALKAN_COUNTRIES } from '../constants/countries';
import { createPropertyMatcher } from '../src/shared/search';

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
