import { Type } from '@google/genai';

/**
 * The AI property search: what the model may return as a search, the rules it
 * extracts by, and the check its reply passes before it reaches the client.
 *
 * Every field a listing can be searched by has a slot, so nothing the user
 * asked for ("floor 15", "A+ energy", "near a school") is lost between the
 * conversation and the filters. Ranges are min/max pairs; an exact value is
 * sent with both ends equal.
 */

const ENUMS = {
  listingType: ['sale', 'rent'],
  propertyType: ['house', 'apartment', 'villa', 'luxury-villa', 'commercial', 'parking', 'land'],
  sellerType: ['agent', 'private'],
  constructionStatus: ['ready', 'under-construction'],
  furnishing: ['furnished', 'semi-furnished', 'unfurnished'],
  heatingType: ['central', 'electric', 'gas', 'oil', 'heat-pump', 'solar', 'wood', 'none'],
  condition: ['new', 'excellent', 'good', 'fair', 'needs-renovation'],
  viewType: ['sea', 'mountain', 'city', 'park', 'garden', 'street'],
  energyRating: ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
  orientation: ['north', 'south', 'east', 'west', 'northEast', 'northWest', 'southEast', 'southWest'],
} as const;

type EnumKey = keyof typeof ENUMS;

const STRING_KEYS = ['location', 'country'] as const;

/** Numbers that must be above zero. */
const POSITIVE_KEYS = [
  'minPrice', 'maxPrice', 'beds', 'baths', 'livingRooms', 'kitchens',
  'minSqft', 'maxSqft', 'minPricePerSqm', 'maxPricePerSqm',
  'minYearBuilt', 'maxYearBuilt', 'minParking', 'maxDaysListed',
  'maxDistanceToCenter', 'maxDistanceToSea', 'maxDistanceToSchool', 'maxDistanceToHospital',
] as const;

/** Numbers where zero is meaningful (the ground floor). */
const NON_NEGATIVE_KEYS = ['minFloorNumber', 'maxFloorNumber'] as const;

const BOOLEAN_KEYS = [
  'hasBalcony', 'hasGarden', 'hasElevator', 'hasSecurity', 'hasAirConditioning',
  'hasPool', 'petsAllowed', 'has360Tour', 'hasDiscount',
] as const;

const RANGE_PAIRS = [
  ['minPrice', 'maxPrice'], ['minSqft', 'maxSqft'], ['minPricePerSqm', 'maxPricePerSqm'],
  ['minYearBuilt', 'maxYearBuilt'], ['minFloorNumber', 'maxFloorNumber'],
] as const;

const MAX_AMENITIES = 20;
const MAX_TEXT = 100;
const MAX_ALTERNATIVES = 10;

export type AiSearchQuery = Record<string, string | number | boolean | string[]>;

const num = (description: string) => ({ type: Type.NUMBER, description });
const int = (description: string) => ({ type: Type.INTEGER, description });
const bool = (description: string) => ({ type: Type.BOOLEAN, description });
const choice = (key: EnumKey, description: string) => ({
  type: Type.STRING, nullable: true, enum: [...ENUMS[key]], description,
});

/** The `searchQuery` object of the chat response schema. */
export const AI_SEARCH_QUERY_SCHEMA = {
  type: Type.OBJECT,
  nullable: true,
  properties: {
    location: { type: Type.STRING, description: 'City, town or area to search in.' },
    country: { type: Type.STRING, description: 'Country name in English (Albania, Serbia, Croatia, ...).' },
    listingType: choice('listingType', '"rent" only when the user wants to rent; "sale" when they want to buy.'),
    minPrice: num('Lowest price in EUR.'),
    maxPrice: num('Highest price in EUR.'),
    beds: int('Bedrooms (at least).'),
    baths: int('Bathrooms (at least).'),
    livingRooms: int('Living rooms (at least).'),
    kitchens: int('Kitchens (at least).'),
    minSqft: num('Smallest area in m². For an exact size, equal to maxSqft.'),
    maxSqft: num('Largest area in m². For an exact size, equal to minSqft.'),
    minPricePerSqm: num('Lowest price per m² in EUR.'),
    maxPricePerSqm: num('Highest price per m² in EUR.'),
    propertyType: choice('propertyType', 'Only when the user names a type.'),
    sellerType: choice('sellerType', 'Only when the user asks for an agent or a private owner.'),
    minYearBuilt: int('Built in or after this year.'),
    maxYearBuilt: int('Built in or before this year.'),
    constructionStatus: choice('constructionStatus', '"under-construction" for off-plan / new build not finished; "ready" for move-in ready.'),
    minParking: int('Parking spaces (at least).'),
    minFloorNumber: int('Lowest floor (0 = ground). For an exact floor, equal to maxFloorNumber.'),
    maxFloorNumber: int('Highest floor. For an exact floor, equal to minFloorNumber.'),
    furnishing: choice('furnishing', 'Furnishing.'),
    heatingType: choice('heatingType', 'Heating source.'),
    condition: choice('condition', 'Condition of the property.'),
    viewType: choice('viewType', 'View, when it is one of these.'),
    orientation: choice('orientation', 'Direction the property faces.'),
    energyRating: choice('energyRating', 'Energy rating.'),
    hasBalcony: bool('Balcony or terrace.'),
    hasGarden: bool('Garden or yard.'),
    hasElevator: bool('Elevator.'),
    hasSecurity: bool('Security / guarded building.'),
    hasAirConditioning: bool('Air conditioning.'),
    hasPool: bool('Swimming pool.'),
    petsAllowed: bool('Pets allowed.'),
    has360Tour: bool('Has a 360° virtual tour.'),
    hasDiscount: bool('Price was reduced.'),
    maxDaysListed: int('Listed within this many days.'),
    maxDistanceToCenter: num('Max km to the city centre.'),
    maxDistanceToSea: num('Max km to the sea / beach.'),
    maxDistanceToSchool: num('Max km to a school.'),
    maxDistanceToHospital: num('Max km to a hospital.'),
    amenities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Other things the listing must have that no field above covers. One entry per thing: the English term first, then the same thing in Albanian, Serbian/Croatian/Bosnian, Macedonian, Bulgarian, Greek and Romanian, all separated by "|" (e.g. "floor heating|underfloor heating|ngrohje në dysheme|podno grejanje|podno grijanje|подно греење|подово отопление|ενδοδαπέδια θέρμανση|încălzire în pardoseală").',
    },
  },
};

/** The extraction rules, appended to the assistant's instructions. */
export const AI_SEARCH_RULES = `
        **CRITICAL - Precision: every requirement the user states MUST be in searchQuery.**
        A listing has to meet ALL of them, so never drop one, never loosen one, never invent one.
        - EXACT value ("76 m2", "exactly 76 square meters", "76m²"): set BOTH minSqft and maxSqft to 76.
        - RANGE ("between 60 and 80 m2", "60-80 m²", "from 60 to 80"): minSqft 60, maxSqft 80.
        - "under / up to / max / at most / below X": only the max. "over / at least / min / from X": only the min.
        - "around / about X" for a size: min X*0.9, max X*1.1 (rounded). For price "around X": min X*0.9, max X*1.1.
        - The same rules apply to price, price per m², year built and floor ("on floor 15" → minFloorNumber 15 AND maxFloorNumber 15; "ground floor" → both 0; "above 5th floor" → minFloorNumber 6).
        - Counts (beds, baths, livingRooms, kitchens, minParking) are minimums: "1 bedroom" → beds 1.
        - "under construction", "off-plan", "new build not finished", "në ndërtim", "u izgradnji" → constructionStatus "under-construction". "ready to move in", "finished" → "ready".
        - Heating: "electric", "floor heating (electric)" → heatingType "electric"; "central" → "central"; "heat pump" → "heat-pump"; "gas" → "gas". Put the specific system ("floor heating", "underfloor heating") ALSO in amenities.
        - View: sea/mountain/city/park/garden/street go in viewType. Any other view ("panoramic view", "lake view") goes in amenities.
        - Energy rating "A+" → energyRating "A+".
        - Distances: "less than 500 m from a school" → maxDistanceToSchool 0.5 (always km). "near the sea / walking distance to the beach" → maxDistanceToSea 1. "close to the centre" → maxDistanceToCenter 2.
        - Yes/no features use their field (hasBalcony, hasGarden, hasElevator, hasSecurity, hasAirConditioning, hasPool, petsAllowed, has360Tour). "no pets" → petsAllowed false.
        - Anything else the listing must have (fireplace, sauna, jacuzzi, gym, storage, wine cellar, panoramic view, floor heating, smart home, duplex, penthouse, sea view from the terrace, ...) → amenities. Each entry is ONE requirement written as "english term|translations" in Albanian, Serbian/Croatian/Bosnian, Macedonian, Bulgarian, Greek and Romanian, separated by "|", so listings written in any of those languages are found. Use short stems that appear in listing text ("ngrohje në dysheme", not a whole sentence).
        - Read the WHOLE message, including every comma-separated item, and map each one. Before answering, check each requirement the user wrote has a home in searchQuery.
        - Orientation ("south facing", "faces east") → orientation: north, south, east, west, northEast, northWest, southEast, southWest.
        - "not on the ground floor" → minFloorNumber 1. "top floor" / "last floor" / "penthouse" → amenities ("top floor|kati i fundit|poslednji sprat|zadnji kat|последен кат|последен етаж|τελευταίος όροφος|ultimul etaj").
        - "to rent", "for rent", "me qira", "za izdavanje" → listingType "rent". Otherwise leave listingType unset.
        - Refinements keep everything from earlier turns unless the user changes or removes it.
        - Your responseMessage may ONLY mention criteria you actually put in searchQuery, and must mention all of them. Say "between X and Y" for ranges and "exactly X" when min equals max.
`;

const sanitizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, MAX_TEXT);
  return text || null;
};

/**
 * One amenity: "english|translation|..." with each alternative trimmed,
 * lower-cased, de-duplicated and capped, or null when nothing usable is left.
 */
const sanitizeAmenity = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const alternatives = [...new Set(
    value.split('|').map((a) => a.trim().toLowerCase().slice(0, MAX_TEXT)).filter(Boolean),
  )].slice(0, MAX_ALTERNATIVES);
  return alternatives.length > 0 ? alternatives.join('|') : null;
};

const sanitizeNumber = (value: unknown, allowZero: boolean): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return (allowZero ? value >= 0 : value > 0) ? value : null;
};

/**
 * The model's `searchQuery`, keeping only well-formed known fields: unknown
 * keys, nulls, wrong types and values outside an enum are dropped, a range
 * given back to front is swapped, and amenities are trimmed and de-duplicated.
 */
export const sanitizeAiSearchQuery = (raw: unknown): AiSearchQuery | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const out: AiSearchQuery = {};

  for (const key of STRING_KEYS) {
    const text = sanitizeText(input[key]);
    if (text) out[key] = text;
  }
  for (const key of POSITIVE_KEYS) {
    const value = sanitizeNumber(input[key], false);
    if (value !== null) out[key] = value;
  }
  for (const key of NON_NEGATIVE_KEYS) {
    const value = sanitizeNumber(input[key], true);
    if (value !== null) out[key] = value;
  }
  for (const key of BOOLEAN_KEYS) {
    if (typeof input[key] === 'boolean') out[key] = input[key] as boolean;
  }
  for (const key of Object.keys(ENUMS) as EnumKey[]) {
    const value = input[key];
    if (typeof value === 'string' && (ENUMS[key] as readonly string[]).includes(value)) out[key] = value;
  }

  const amenitySource: unknown[] = Array.isArray(input.amenities) ? input.amenities
    : Array.isArray(input.features) ? input.features : [];
  const amenities = [...new Set(amenitySource.map(sanitizeAmenity).filter((a): a is string => !!a))]
    .slice(0, MAX_AMENITIES);
  if (amenities.length > 0) out.amenities = amenities;

  for (const [minKey, maxKey] of RANGE_PAIRS) {
    const lo = out[minKey];
    const hi = out[maxKey];
    if (typeof lo === 'number' && typeof hi === 'number' && lo > hi) {
      out[minKey] = hi;
      out[maxKey] = lo;
    }
  }
  return out;
};
