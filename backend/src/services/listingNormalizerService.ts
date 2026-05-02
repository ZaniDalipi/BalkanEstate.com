import { JSONPath } from 'jsonpath-plus';
import { Types } from 'mongoose';
import type { IListingSource } from '../models/ListingSource';
import type { IProperty, IPropertyImage } from '../models/Property';
import type { RawListing } from './listingAdapters';
import { geocodeAddress } from './geocodingService';
import { uploadFromUrl } from './cloudinaryService';
import User from '../models/User';
import { cronLogger } from '../utils/logger';

const EXTERNAL_SELLER_EMAIL = process.env.EXTERNAL_SELLER_EMAIL || 'external@balkanestate.com';

let cachedExternalSellerId: Types.ObjectId | null = null;

/**
 * Lookup (and cache) the system "external" user id used as `sellerId` for imported listings.
 * Run `seedExternalSeller.ts` once to create this account.
 */
export const getExternalSellerId = async (): Promise<Types.ObjectId> => {
  if (cachedExternalSellerId) return cachedExternalSellerId;
  const user = await User.findOne({ email: EXTERNAL_SELLER_EMAIL }).select('_id').lean();
  if (!user) {
    throw new Error(
      `External seller account not found (email=${EXTERNAL_SELLER_EMAIL}). ` +
        `Run "ts-node src/scripts/seedExternalSeller.ts" before ingesting external listings.`
    );
  }
  cachedExternalSellerId = user._id as Types.ObjectId;
  return cachedExternalSellerId;
};

/**
 * Property type lookup table covering Balkan vernacular.
 * Map external strings → IProperty.propertyType.
 */
const PROPERTY_TYPE_MAP: Record<string, IProperty['propertyType']> = {
  apartment: 'apartment', stan: 'apartment', apartman: 'apartment', diamerisma: 'apartment',
  flat: 'apartment', appartement: 'apartment', wohnung: 'apartment',
  house: 'house', kuca: 'house', kuća: 'house', vivienda: 'house', maison: 'house', haus: 'house',
  villa: 'villa', vila: 'villa', vil: 'villa',
  land: 'land', zemljiste: 'land', zemljište: 'land', plac: 'land', plot: 'land', terreno: 'land',
  commercial: 'other', poslovni: 'other', office: 'other', store: 'other',
  garage: 'other', garaza: 'other',
};

const LISTING_TYPE_MAP: Record<string, IProperty['listingType']> = {
  sale: 'sale', prodaja: 'sale', prodaje: 'sale', forsale: 'sale', for_sale: 'sale',
  rent: 'rent', najam: 'rent', iznajmljivanje: 'rent', forrent: 'rent', for_rent: 'rent',
  rental: 'rent', rentals: 'rent',
};

const RENT_PRICE_HINTS = /(\/\s*mo|\/\s*month|month\b|mes\.|mesec|mjesec|mjesečno|monatlich|μήνα|po mesecu)/i;

interface ParsedPrice {
  price: number;
  currency?: string;
  isRent?: boolean;
}

const parsePrice = (input: unknown): ParsedPrice | null => {
  if (input == null) return null;
  if (typeof input === 'number' && Number.isFinite(input)) return { price: input };
  const str = String(input).trim();
  if (!str) return null;

  const isRent = RENT_PRICE_HINTS.test(str);
  const currencyMatch = str.match(/(€|EUR|USD|\$|GBP|£|RSD|HRK|kn|MKD|BAM|RON|BGN|ALL|HUF)/i);
  const currency = currencyMatch?.[0]?.toUpperCase().replace('€', 'EUR').replace('$', 'USD').replace('£', 'GBP');

  // Strip currency symbols/codes and rent suffixes; normalize EU/US thousand separators.
  let numeric = str
    .replace(/(€|EUR|USD|\$|GBP|£|RSD|HRK|kn|MKD|BAM|RON|BGN|ALL|HUF)/gi, '')
    .replace(/\/\s*(mo|month)\b/gi, '')
    .replace(/(po\s+(mesecu|mjesecu)|mes\.|mjesečno|μήνα|monatlich)/gi, '')
    .trim();

  // Detect EU format (1.234,56) vs US format (1,234.56)
  if (/,\d{1,2}$/.test(numeric) && /\./.test(numeric)) {
    numeric = numeric.replace(/\./g, '').replace(',', '.');
  } else if (/,\d{3}/.test(numeric) && !/\./.test(numeric)) {
    numeric = numeric.replace(/,/g, '');
  } else {
    numeric = numeric.replace(/[\s']/g, '').replace(',', '.');
  }

  const num = parseFloat(numeric);
  if (!Number.isFinite(num)) return null;
  return { price: num, currency, isRent };
};

const parseInt0 = (input: unknown): number | null => {
  if (input == null) return null;
  if (typeof input === 'number') return Math.trunc(input);
  const m = String(input).match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
};

const parseFloatLoose = (input: unknown): number | null => {
  if (input == null) return null;
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  const cleaned = String(input).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return cleaned ? parseFloat(cleaned[0]) : null;
};

const mapPropertyType = (raw: unknown): IProperty['propertyType'] | undefined => {
  if (!raw) return undefined;
  const key = String(raw).toLowerCase().trim();
  if (PROPERTY_TYPE_MAP[key]) return PROPERTY_TYPE_MAP[key];
  for (const [needle, val] of Object.entries(PROPERTY_TYPE_MAP)) {
    if (key.includes(needle)) return val;
  }
  return undefined;
};

const mapListingType = (raw: unknown): IProperty['listingType'] | undefined => {
  if (!raw) return undefined;
  const key = String(raw).toLowerCase().replace(/\s+/g, '');
  if (LISTING_TYPE_MAP[key]) return LISTING_TYPE_MAP[key];
  for (const [needle, val] of Object.entries(LISTING_TYPE_MAP)) {
    if (key.includes(needle)) return val;
  }
  return undefined;
};

const categorizeAmenities = (amenities: unknown[]): string[] => {
  if (!Array.isArray(amenities)) return [];

  const AMENITY_KEYWORDS: Record<string, string[]> = {
    'balcony': ['balkon', 'balcony', 'terassa', 'terrace', 'veranda'],
    'parking': ['parking', 'parkiraliste', 'garage', 'garaza', 'lot', 'spaces'],
    'pool': ['pool', 'swimming', 'bazen', 'bazin', 'bazenit'],
    'garden': ['garden', 'yard', 'basta', 'bašta', 'dvoriste', 'dvorište'],
    'gym': ['gym', 'fitness', 'teretana', 'tererana'],
    'security': ['security', 'guard', 'zaštita', 'brvar', 'alarma', 'alarm'],
    'elevator': ['elevator', 'lift', 'asansor', 'lift'],
    'laundry': ['laundry', 'pranje', 'vešeraj', 'vešeraj'],
    'dishwasher': ['dishwasher', 'mašina za sudove'],
    'central_heating': ['central heating', 'centralno grijanje', 'zentrale heizung', 'centralino otopljavanje'],
    'ac': ['air conditioning', 'ac', 'klima', 'klimatizacija', 'klime'],
    'furnished': ['furnished', 'namesten', 'mebliran', 'möbliert'],
    'internet': ['internet', 'wifi', 'wi-fi', 'broadband'],
    'pets': ['pets', 'pet friendly', 'ljubimci', 'haustiere'],
  };

  const normalized: Set<string> = new Set();

  for (const item of amenities) {
    const str = String(item).toLowerCase().trim();
    if (!str) continue;

    // Check if it's already a known amenity key
    if (Object.keys(AMENITY_KEYWORDS).includes(str)) {
      normalized.add(str);
      continue;
    }

    // Try to match against known keywords
    for (const [key, keywords] of Object.entries(AMENITY_KEYWORDS)) {
      if (keywords.some(kw => str.includes(kw))) {
        normalized.add(key);
        break;
      }
    }

    // If no match, keep the original (trimmed/lowercased) as a custom amenity
    if (!normalized.has(str) && str.length < 50) {
      normalized.add(str);
    }
  }

  return Array.from(normalized);
};

const queryPath = (data: unknown, path: string): unknown => {
  if (!path) return undefined;
  // Bare string ⇒ literal key on the raw object.
  if (!path.startsWith('$') && !path.includes('.')) {
    return (data as Record<string, unknown>)?.[path];
  }
  return JSONPath({ path, json: data as object, wrap: false }) as unknown;
};

/**
 * Apply `source.fieldMap` to extract canonical fields from the raw payload.
 * Keys of fieldMap are IProperty paths; values are JSONPath expressions
 * (or bare keys) into `raw.raw`.
 */
const applyFieldMap = (raw: RawListing, source: IListingSource): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [propKey, rawPath] of Object.entries(source.fieldMap ?? {})) {
    const v = queryPath(raw.raw, rawPath);
    if (v !== undefined && v !== null && v !== '') out[propKey] = v;
  }
  return out;
};

interface NormalizeOptions {
  rehostImages?: boolean;
}

const collectImageUrls = (mapped: Record<string, unknown>): string[] => {
  const urls: string[] = [];
  const main = mapped.imageUrl;
  if (typeof main === 'string') urls.push(main);
  const list = mapped.images;
  if (Array.isArray(list)) {
    for (const i of list) {
      if (typeof i === 'string') urls.push(i);
      else if (i && typeof i === 'object' && typeof (i as { url?: unknown }).url === 'string') {
        urls.push((i as { url: string }).url);
      }
    }
  }
  return Array.from(new Set(urls.filter(Boolean)));
};

const knownPropertyKeys = new Set<string>([
  'title', 'description', 'address', 'city', 'country', 'price', 'beds', 'baths', 'livingRooms',
  'sqft', 'yearBuilt', 'parking', 'lat', 'lng', 'propertyType', 'listingType', 'imageUrl',
  'images', 'amenities', 'floorNumber', 'totalFloors', 'furnishing', 'heatingType', 'condition',
  'viewType', 'energyRating', 'orientation', 'rentPeriod', 'securityDeposit', 'isNegotiable',
  'tourUrl', 'virtualTour360Url', 'videoUrl', 'distanceToCenter', 'distanceToSea',
  'distanceToSchool', 'distanceToHospital', 'specialFeatures', 'materials', 'floorplanUrl',
  'minimumLeaseDuration', 'maximumLeaseDuration', 'availableFrom', 'utilitiesIncluded',
  'internetIncluded', 'tenantRequirements', 'maxOccupants',
]);

/**
 * Convert an adapter's RawListing into a `Property` document.
 * The result is `Partial<IProperty>` because the orchestrator merges
 * required defaults (sellerId, status, …) at upsert time.
 */
export const normalize = async (
  raw: RawListing,
  source: IListingSource,
  opts: NormalizeOptions = {}
): Promise<Partial<IProperty>> => {
  const mapped = applyFieldMap(raw, source);

  const parsedPrice = parsePrice(mapped.price);
  const explicitListing = mapListingType(mapped.listingType);
  const listingType: IProperty['listingType'] =
    explicitListing ?? (parsedPrice?.isRent ? 'rent' : 'sale');

  const propertyType = mapPropertyType(mapped.propertyType) ?? 'other';

  let lat = parseFloatLoose(mapped.lat);
  let lng = parseFloatLoose(mapped.lng);
  const city = (mapped.city as string | undefined)?.toString().trim();
  const country = (mapped.country as string | undefined)?.toString().trim();
  const address = (mapped.address as string | undefined)?.toString().trim() || city || country || 'Unknown';

  if ((lat == null || lng == null) && city && country) {
    try {
      const geo = await geocodeAddress(address, city, country);
      if (geo) {
        lat = lat ?? geo.lat;
        lng = lng ?? geo.lng;
      }
    } catch (err) {
      cronLogger.info(`[normalizer] geocode failed for ${source.slug}/${raw.id}: ${(err as Error).message}`);
    }
  }

  const imageUrls = collectImageUrls(mapped);
  let images: IPropertyImage[] = imageUrls.map((url) => ({ url, tag: 'other' as const }));
  let imageUrl = imageUrls[0] ?? '';

  if (opts.rehostImages && imageUrls.length) {
    const rehosted: IPropertyImage[] = [];
    for (const url of imageUrls) {
      try {
        const result = await uploadFromUrl(url);
        rehosted.push({ url: result.url, publicId: result.publicId, tag: 'other' });
      } catch (err) {
        cronLogger.info(`[normalizer] rehost failed (${url}): ${(err as Error).message}`);
        rehosted.push({ url, tag: 'other' });
      }
    }
    images = rehosted;
    imageUrl = rehosted[0]?.url ?? imageUrl;
  }

  // If the source belongs to a user, attribute imported listings to them.
  // Otherwise fall back to the system "external" seller account.
  let sellerId: Types.ObjectId;
  let createdByName: string;
  let createdByEmail: string;
  let createdAsRole: IProperty['createdAsRole'];

  if (source.userId) {
    const owner = await User.findById(source.userId).select('email name role').lean();
    if (!owner) {
      throw new Error(`Owner user ${source.userId.toString()} not found for source ${source.slug}`);
    }
    sellerId = owner._id as Types.ObjectId;
    createdByName = (owner as { name?: string }).name || source.name || 'External Source';
    createdByEmail = (owner as { email?: string }).email || EXTERNAL_SELLER_EMAIL;
    createdAsRole = (owner as { role?: string }).role === 'agent' ? 'agent' : 'private_seller';
  } else {
    sellerId = await getExternalSellerId();
    createdByName = source.name || 'External Source';
    createdByEmail = EXTERNAL_SELLER_EMAIL;
    createdAsRole = 'external';
  }

  // Anything that wasn't a known IProperty key stays in sourceMetadata
  // so we don't lose source-specific information.
  const sourceMetadata: Record<string, unknown> = {};
  if (parsedPrice?.currency) sourceMetadata.currency = parsedPrice.currency;
  if (imageUrls.length) sourceMetadata.originalImages = imageUrls;
  for (const [k, v] of Object.entries(mapped)) {
    if (!knownPropertyKeys.has(k)) sourceMetadata[k] = v;
  }

  const property: Partial<IProperty> = {
    sellerId,
    createdByName,
    createdByEmail,
    createdAsRole,
    listingType,
    title: (mapped.title as string | undefined) ?? undefined,
    status: 'active',
    price: parsedPrice?.price ?? 0,
    isNegotiable: parsedPrice?.price === 0 ? true : Boolean(mapped.isNegotiable),
    address,
    city: city || 'Unknown',
    country: country || 'Unknown',
    beds: parseInt0(mapped.beds) ?? 0,
    baths: parseInt0(mapped.baths) ?? 0,
    livingRooms: parseInt0(mapped.livingRooms) ?? 0,
    sqft: parseFloatLoose(mapped.sqft) ?? 0,
    yearBuilt: parseInt0(mapped.yearBuilt) ?? 0,
    parking: parseInt0(mapped.parking) ?? 0,
    description: (mapped.description as string | undefined) ?? '',
    specialFeatures: Array.isArray(mapped.specialFeatures) ? (mapped.specialFeatures as string[]) : [],
    materials: Array.isArray(mapped.materials) ? (mapped.materials as string[]) : [],
    amenities: categorizeAmenities(Array.isArray(mapped.amenities) ? (mapped.amenities as unknown[]) : []),
    imageUrl,
    images,
    lat: lat ?? 0,
    lng: lng ?? 0,
    propertyType,
    hasVirtualTour360: typeof mapped.virtualTour360Url === 'string',
    hasGeneratedVideo: false,
    isPromoted: false,
    views: 0,
    saves: 0,
    inquiries: 0,
    lastRenewed: new Date(),
    source: source.slug,
    sourceListingId: raw.id,
    sourceUrl: raw.url,
    sourceFetchedAt: new Date(),
    sourceMetadata,
  };

  return property;
};
