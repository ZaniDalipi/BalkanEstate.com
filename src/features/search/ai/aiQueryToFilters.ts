import { initialFilters } from '@/types';
import type { AiSearchQuery, Filters } from '@/types';
import { BALKAN_COUNTRIES, normalizeCountryKey } from '@/constants/countries';
import { CONSTRUCTION_STATUSES } from '@/shared/property/construction';
import { PROPERTY_TYPES } from '@/shared/types/property.types';

/**
 * Turns what the AI assistant understood into the search filters, so every
 * criterion the user stated is applied — not only the few the form used to
 * know about. Pure: the AI's reply is untrusted, so each value is checked here
 * and anything malformed is left unset rather than guessed.
 */

type BooleanFilterKey =
    | 'hasBalcony' | 'hasGarden' | 'hasElevator' | 'hasSecurity'
    | 'hasAirConditioning' | 'hasPool' | 'petsAllowed' | 'has360Tour' | 'hasDiscount';

const BOOLEAN_KEYS: readonly BooleanFilterKey[] = [
    'hasBalcony', 'hasGarden', 'hasElevator', 'hasSecurity',
    'hasAirConditioning', 'hasPool', 'petsAllowed', 'has360Tour', 'hasDiscount',
];

/**
 * Amenity words that the listing records as a yes/no field. Matching them as a
 * free-text tag would miss every listing that ticked the box instead of typing
 * the word, so they are moved onto the field.
 */
const AMENITY_TO_BOOLEAN: Record<string, BooleanFilterKey> = {
    balcony: 'hasBalcony', terrace: 'hasBalcony',
    garden: 'hasGarden', yard: 'hasGarden',
    elevator: 'hasElevator', lift: 'hasElevator',
    security: 'hasSecurity',
    'air conditioning': 'hasAirConditioning', 'air-conditioning': 'hasAirConditioning', ac: 'hasAirConditioning',
    pool: 'hasPool', 'swimming pool': 'hasPool',
    'pets allowed': 'petsAllowed', 'pet friendly': 'petsAllowed', 'pet-friendly': 'petsAllowed',
    '360 tour': 'has360Tour', 'virtual tour': 'has360Tour',
};

const FURNISHING = ['furnished', 'semi-furnished', 'unfurnished'] as const;
const HEATING = ['central', 'electric', 'gas', 'oil', 'heat-pump', 'solar', 'wood', 'none'] as const;
const CONDITION = ['new', 'excellent', 'good', 'fair', 'needs-renovation'] as const;
const VIEW = ['sea', 'mountain', 'city', 'park', 'garden', 'street'] as const;
const ENERGY = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

const oneOf = <T extends string>(allowed: readonly T[], value: unknown): T | undefined =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

/** A usable count or amount: a finite number above zero (or at zero, for floors). */
const num = (value: unknown, allowZero = false): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    if (allowZero ? value < 0 : value <= 0) return null;
    return value;
};

/** A min/max pair, swapped when the AI gave them the wrong way round. */
const range = (min: unknown, max: unknown, allowZero = false): [number | null, number | null] => {
    const lo = num(min, allowZero);
    const hi = num(max, allowZero);
    return lo !== null && hi !== null && lo > hi ? [hi, lo] : [lo, hi];
};

/** The country filter key for a name the AI gave, or null when it is not one we list. */
export const countryKeyFromAi = (country?: string): string | null => {
    if (!country) return null;
    const key = normalizeCountryKey(country);
    return BALKAN_COUNTRIES[key] ? key : null;
};

const splitAmenities = (query: AiSearchQuery) => {
    const booleans: Partial<Record<BooleanFilterKey, boolean>> = {};
    const tags: string[] = [];
    const seen = new Set<string>();
    for (const raw of [...(query.amenities ?? []), ...(query.features ?? [])]) {
        if (typeof raw !== 'string') continue;
        const tag = raw.trim().toLowerCase();
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        const field = AMENITY_TO_BOOLEAN[tag];
        if (field) booleans[field] = true;
        else tags.push(tag);
    }
    return { booleans, tags };
};

export const aiQueryToFilters = (query: AiSearchQuery): Filters => {
    const locationCountry = countryKeyFromAi(query.location);
    const country = countryKeyFromAi(query.country) ?? locationCountry ?? 'any';
    const [minPrice, maxPrice] = range(query.minPrice, query.maxPrice);
    const [minSqft, maxSqft] = range(query.minSqft, query.maxSqft);
    const [minPricePerSqm, maxPricePerSqm] = range(query.minPricePerSqm, query.maxPricePerSqm);
    const [minYearBuilt, maxYearBuilt] = range(query.minYearBuilt, query.maxYearBuilt);
    const [minFloorNumber, maxFloorNumber] = range(query.minFloorNumber, query.maxFloorNumber, true);
    const { booleans, tags } = splitAmenities(query);

    const filters: Filters = {
        ...initialFilters,
        // A country name is not a place to match words against.
        query: locationCountry ? '' : (query.location?.trim() ?? ''),
        country,
        listingType: oneOf(['sale', 'rent'] as const, query.listingType) ?? initialFilters.listingType,
        minPrice, maxPrice, minSqft, maxSqft, minPricePerSqm, maxPricePerSqm,
        minYearBuilt, maxYearBuilt, minFloorNumber, maxFloorNumber,
        beds: num(query.beds),
        baths: num(query.baths),
        livingRooms: num(query.livingRooms),
        minKitchens: num(query.kitchens),
        minParking: num(query.minParking),
        maxDaysListed: num(query.maxDaysListed),
        maxDistanceToCenter: num(query.maxDistanceToCenter),
        maxDistanceToSea: num(query.maxDistanceToSea),
        maxDistanceToSchool: num(query.maxDistanceToSchool),
        maxDistanceToHospital: num(query.maxDistanceToHospital),
        propertyType: oneOf(PROPERTY_TYPES, query.propertyType) ?? 'any',
        sellerType: oneOf(['agent', 'private'] as const, query.sellerType) ?? 'any',
        constructionStatus: oneOf(CONSTRUCTION_STATUSES, query.constructionStatus) ?? 'any',
        furnishing: oneOf(FURNISHING, query.furnishing) ?? 'any',
        heatingType: oneOf(HEATING, query.heatingType) ?? 'any',
        condition: oneOf(CONDITION, query.condition) ?? 'any',
        viewType: oneOf(VIEW, query.viewType) ?? 'any',
        energyRating: oneOf(ENERGY, query.energyRating) ?? 'any',
        amenities: tags,
        // Everything the user asked for must be shown to hold, distances too.
        requireKnownDistances: true,
    };

    for (const key of BOOLEAN_KEYS) {
        const value = query[key];
        if (typeof value === 'boolean') filters[key] = value;
        else if (booleans[key]) filters[key] = true;
    }
    return filters;
};
