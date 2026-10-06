import { PROPERTY_TYPES, type PropertyType } from '../../config/propertyTypes';
import { htmlToPlainText, safeHttpUrl, singleLine } from './contentSanitizer';
import type { MappedRecord } from './fieldMapper';
import type {
  FeedIssue,
  FeedMapping,
  ListingStatusFromFeed,
  NormalizeResult,
  NormalizedListing,
  ValueMapName,
} from './feedTypes';

/**
 * Strict normalization of one mapped feed record.
 *
 * Unlike the heuristic scraper normalizer (services/listingNormalizerService),
 * this never guesses: a value the feed does not state is left absent, and a
 * required value that is missing or unreadable rejects the record with an
 * issue the agency can act on. Nothing is extracted from free text.
 */

export const LIMITS = {
  title: 200,
  description: 10_000,
  city: 100,
  address: 200,
  externalId: 100,
  amenity: 50,
  amenities: 40,
  images: 50,
  floorplans: 10,
  maxPrice: 1_000_000_000,
} as const;

/** Types that, on this platform, must state bedrooms and bathrooms. */
const ROOMS_REQUIRED: ReadonlySet<PropertyType> = new Set(['apartment', 'house', 'villa', 'luxury-villa']);

const SUPPORTED_CURRENCIES = new Set(['EUR']);
/**
 * Currencies with a legally fixed euro conversion rate, converted exactly.
 * Floating currencies (MKD, RSD, ALL, RON, …) are not converted: a guessed
 * exchange rate would publish a price the agency never set.
 */
const FIXED_EURO_RATES: Record<string, number> = { BGN: 1.95583, BAM: 1.95583 };

const TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartment', house: 'House', villa: 'Villa', 'luxury-villa': 'Luxury villa',
  commercial: 'Commercial property', parking: 'Parking space', land: 'Land', other: 'Property',
};

const SYNONYMS: Record<ValueMapName, Record<string, string>> = {
  listingType: {
    sale: 'sale', sell: 'sale', 'for-sale': 'sale', 'for sale': 'sale', buy: 'sale', prodaja: 'sale',
    prodaje: 'sale', shitje: 'sale', shitet: 'sale', vanzare: 'sale', 'vânzare': 'sale', 'продажба': 'sale',
    'продажа': 'sale', 'продаја': 'sale', 'πώληση': 'sale', verkauf: 'sale',
    rent: 'rent', rental: 'rent', lease: 'rent', let: 'rent', 'to-let': 'rent', najam: 'rent', izdavanje: 'rent',
    iznajmljivanje: 'rent', qira: 'rent', 'qiradhënie': 'rent', inchiriere: 'rent', 'închiriere': 'rent',
    'for rent': 'rent', 'for-rent': 'rent', 'forrent': 'rent', 'long term rental': 'rent', 'month': 'rent',
    'наем': 'rent', 'под наем': 'rent', 'издавање': 'rent', 'изнајмување': 'rent', 'ενοικίαση': 'rent', miete: 'rent',
  },
  propertyType: {
    apartment: 'apartment', flat: 'apartment', studio: 'apartment', stan: 'apartment', apartament: 'apartment',
    apartman: 'apartment', 'апартамент': 'apartment', 'стан': 'apartment', 'διαμέρισμα': 'apartment', penthouse: 'apartment',
    house: 'house', home: 'house', 'kuća': 'house', kuca: 'house', 'shtëpi': 'house', shtepi: 'house', casa: 'house',
    'къща': 'house', 'куќа': 'house', 'кућа': 'house', 'μονοκατοικία': 'house', 'detached-house': 'house',
    villa: 'villa', vila: 'villa', 'вила': 'villa', 'βίλα': 'villa',
    'luxury-villa': 'luxury-villa', 'luxury villa': 'luxury-villa',
    commercial: 'commercial', office: 'commercial', shop: 'commercial', retail: 'commercial', warehouse: 'commercial',
    'poslovni prostor': 'commercial', lokal: 'commercial', ured: 'commercial', 'business-premises': 'commercial',
    parking: 'parking', garage: 'parking', 'garaža': 'parking', garaza: 'parking', 'parking-space': 'parking',
    land: 'land', plot: 'land', 'zemljište': 'land', zemljiste: 'land', plac: 'land', parcel: 'land', truall: 'land',
    teren: 'land', 'парцел': 'land', 'плац': 'land', 'οικόπεδο': 'land',
    townhouse: 'house', 'town house': 'house', bungalow: 'house', 'country house': 'house', 'semi-detached': 'house',
    detached: 'house', cottage: 'house', chalet: 'house', finca: 'house', 'terraced house': 'house', farmhouse: 'house',
    duplex: 'apartment', maisonette: 'apartment', loft: 'apartment', 'ground floor apartment': 'apartment', 'garsonjera': 'apartment',
    'гарсоњера': 'apartment', 'гарсониера': 'apartment', 'мезонет': 'apartment', 'двособен': 'apartment', 'тристаен': 'apartment', 'двустаен': 'apartment',
    'office space': 'commercial', store: 'commercial', hotel: 'commercial', restaurant: 'commercial',
    'industrial': 'commercial', 'деловен простор': 'commercial', 'локал': 'commercial', 'офис': 'commercial',
    'гаража': 'parking', 'гараж': 'parking', field: 'land', 'building plot': 'land', 'urban plot': 'land', 'земјиште': 'land', 'земјиште/плац': 'land',
    'стан/апартман': 'apartment',
    other: 'other',
  },
  status: {
    active: 'active', available: 'active', published: 'active', live: 'active', 'for-sale': 'active', 'for-rent': 'active',
    sold: 'sold', prodano: 'sold', prodato: 'sold',
    rented: 'rented', leased: 'rented', let: 'rented', iznajmljeno: 'rented',
    reserved: 'reserved', 'under-offer': 'reserved', 'under offer': 'reserved', pending: 'reserved', rezervirano: 'reserved',
    removed: 'removed', deleted: 'removed', inactive: 'removed', withdrawn: 'removed', archived: 'removed',
    expired: 'removed', 'off-market': 'removed', unpublished: 'removed',
  },
  rentPeriod: {
    monthly: 'monthly', month: 'monthly', 'per-month': 'monthly', 'mjesečno': 'monthly', mesecno: 'monthly',
    weekly: 'weekly', week: 'weekly', daily: 'daily', day: 'daily', night: 'daily', nightly: 'daily',
  },
  addressVisibility: {
    exact: 'exact', public: 'exact', full: 'exact', true: 'exact', yes: 'exact', visible: 'exact',
    private: 'private', hidden: 'private', approximate: 'private', false: 'private', no: 'private', hide: 'private',
  },
};

const ALLOWED_VALUES: Record<ValueMapName, readonly string[]> = {
  listingType: ['sale', 'rent'],
  propertyType: PROPERTY_TYPES,
  status: ['active', 'sold', 'rented', 'reserved', 'removed'],
  rentPeriod: ['monthly', 'weekly', 'daily'],
  addressVisibility: ['exact', 'private'],
};

/** Agency-configured value maps win; then built-in synonyms; then the value itself if already canonical. */
export const mapValue = (name: ValueMapName, raw: string | undefined, mapping: FeedMapping): string | undefined => {
  if (raw === undefined) return undefined;
  const key = raw.trim().toLowerCase();
  if (!key) return undefined;
  const custom = mapping.valueMaps?.[name];
  if (custom) {
    for (const [from, to] of Object.entries(custom)) {
      if (from.trim().toLowerCase() === key && ALLOWED_VALUES[name].includes(to)) return to;
    }
  }
  const builtIn = SYNONYMS[name][key];
  if (builtIn) return builtIn;
  return ALLOWED_VALUES[name].includes(key) ? key : undefined;
};

/**
 * Parse a number written either way round: "185000", "185.000", "185,000.50",
 * "185.000,50", "74,5". A lone separator followed by exactly three digits is
 * a thousands separator.
 */
export const parseLocaleNumber = (input: string | undefined): number | undefined => {
  if (input === undefined) return undefined;
  let s = input.replace(/[\s '€$£]|EUR|eur/g, '');
  if (!s || !/^-?[\d.,]+$/.test(s)) return undefined;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    const decimal = lastDot > lastComma ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    s = s.split(thousands).join('').replace(decimal, '.');
  } else {
    const sep = lastDot !== -1 ? '.' : lastComma !== -1 ? ',' : '';
    if (sep) {
      const parts = s.split(sep);
      const isThousands = parts.length > 2 || (parts.length === 2 && parts[1].length === 3);
      s = isThousands ? parts.join('') : parts.join('.');
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const parseCoordinate = (input: string | undefined, min: number, max: number): number | undefined => {
  if (input === undefined) return undefined;
  const s = input.trim();
  if (!/^-?\d{1,3}(\.\d+)?$/.test(s)) return undefined;
  const n = Number(s);
  return n >= min && n <= max ? n : undefined;
};

const CURRENCY_SYMBOLS: Record<string, string> = { '€': 'EUR', 'eur': 'EUR', 'euro': 'EUR', 'evro': 'EUR', 'евро': 'EUR', 'лв': 'BGN', 'лв.': 'BGN', 'km': 'BAM' };
const normalizeCurrency = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  return CURRENCY_SYMBOLS[key] ?? (key ? key.toUpperCase() : undefined);
};

const parseBool = (input: string | undefined): boolean =>
  input !== undefined && ['true', '1', 'yes', 'da', 'po'].includes(input.trim().toLowerCase());

const single = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const multi = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const SQFT_PER_M2 = 10.7639;
const ENERGY_RATINGS = new Set(['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']);
const EXTERNAL_ID = /^[\w.\-:/#]+$/;

export const normalizeRecord = (record: MappedRecord, mapping: FeedMapping): NormalizeResult => {
  const issues: FeedIssue[] = [];
  const rawId = single(record.externalId)?.trim();
  const externalId = rawId && rawId.length <= LIMITS.externalId && EXTERNAL_ID.test(rawId) ? rawId : undefined;
  const add = (severity: FeedIssue['severity'], code: string, message: string, field?: string) =>
    issues.push({ severity, code, message, field, externalId: externalId ?? rawId?.slice(0, LIMITS.externalId) });
  const error = (code: string, message: string, field?: string) => add('error', code, message, field);
  const warn = (code: string, message: string, field?: string) => add('warning', code, message, field);

  if (!externalId) {
    error(rawId ? 'invalid_external_id' : 'missing_external_id',
      rawId ? 'Listing ID may only contain letters, digits and . _ - : / # (max 100)' : 'Listing has no ID', 'externalId');
  }

  const rawStatus = single(record.status);
  const feedStatus = (rawStatus === undefined ? 'active' : mapValue('status', rawStatus, mapping)) as
    | ListingStatusFromFeed
    | undefined;
  if (!feedStatus) error('unknown_status', `Unknown listing status "${rawStatus}"`, 'status');

  // A removal notice only needs its ID: no other field is validated.
  if (feedStatus === 'removed' && externalId) {
    return {
      issues,
      listing: {
        externalId, feedStatus, title: '', description: '', listingType: 'sale', propertyType: 'other', price: 0,
        isNegotiable: false, country: '', city: '', address: '', addressPrivate: true, amenities: [], imageUrls: [],
        floorplans: [],
      },
    };
  }

  const titleRaw = single(record.title);
  let title = singleLine(titleRaw, 10_000);
  if (!title && mapping.deriveTitle) {
    // Built from stated values only; checked again below once type and city are known.
    const derivedType = mapValue('propertyType', single(record.propertyType), mapping) as PropertyType | undefined;
    const derivedCity = singleLine(single(record.city), LIMITS.city);
    if (derivedType && derivedCity) {
      title = `${TYPE_LABELS[derivedType]} in ${derivedCity}`;
      warn('title_derived', 'The feed has no title; one was built from the property type and city', 'title');
    }
  }
  if (!title) error('missing_title', 'Title is missing', 'title');
  else if (title.length > LIMITS.title) warn('title_truncated', `Title shortened to ${LIMITS.title} characters`, 'title');

  const descriptionRaw = single(record.description);
  let description = descriptionRaw ? htmlToPlainText(descriptionRaw) : '';
  if (!description) error('missing_description', 'Description is missing', 'description');
  if (description.length > LIMITS.description) {
    description = description.slice(0, LIMITS.description).trim();
    warn('description_truncated', `Description shortened to ${LIMITS.description} characters`, 'description');
  }

  const rawListingType = single(record.listingType);
  const listingType = mapValue('listingType', rawListingType, mapping) as 'sale' | 'rent' | undefined;
  if (!listingType) {
    error('invalid_listing_type', rawListingType ? `Unknown sale/rent value "${rawListingType}"` : 'Sale or rent is not stated', 'listingType');
  }

  // Only a rental has a rent period (some formats share one element for sale/month/week).
  const rawRentPeriod = listingType === 'rent' ? single(record.rentPeriod) : undefined;
  const rentPeriod = mapValue('rentPeriod', rawRentPeriod, mapping) as NormalizedListing['rentPeriod'];
  if (rawRentPeriod && !rentPeriod) warn('unknown_rent_period', `Unknown rent period "${rawRentPeriod}" ignored`, 'rentPeriod');

  const rawType = single(record.propertyType);
  const propertyType = mapValue('propertyType', rawType, mapping) as PropertyType | undefined;
  if (!propertyType) {
    error('invalid_property_type', rawType ? `Unknown property type "${rawType}" — add it to the type mapping` : 'Property type is not stated', 'propertyType');
  }

  const onRequest = parseBool(single(record.priceOnRequest));
  const rawPrice = single(record.price);
  let price = parseLocaleNumber(rawPrice);
  if (onRequest && (price === undefined || price === 0)) {
    price = 0;
  } else if (price === undefined || price <= 0 || price > LIMITS.maxPrice) {
    error('invalid_price', rawPrice ? `Price "${rawPrice}" is not a valid amount` : 'Price is missing', 'price');
  }
  const currency = normalizeCurrency(single(record.currency) ?? mapping.defaults?.currency);
  if (!onRequest || (price ?? 0) > 0) {
    if (!currency) {
      error('missing_currency', 'Price currency is not stated — if every price is in one currency, set "Currency if not stated" in the field mapping', 'currency');
    } else if (FIXED_EURO_RATES[currency] && price !== undefined && price > 0) {
      price = Math.round(price / FIXED_EURO_RATES[currency]);
      warn('currency_converted', `Price converted from ${currency} at the fixed rate ${FIXED_EURO_RATES[currency]} per euro`, 'price');
    } else if (!SUPPORTED_CURRENCIES.has(currency)) {
      error('unsupported_currency', `Currency ${currency} is not supported; prices must be in EUR (BGN and BAM are converted at their fixed rate)`, 'currency');
    }
  }

  const country = singleLine(single(record.country) ?? mapping.defaults?.country, LIMITS.city);
  if (!country) error('missing_country', 'Country is missing — if the whole feed is in one country, set "Country if not stated" in the field mapping', 'country');
  const city = singleLine(single(record.city), LIMITS.city);
  if (!city) error('missing_city', 'City is missing', 'city');
  const district = singleLine(single(record.district), LIMITS.city);

  const rawVisibility = single(record.addressVisibility);
  const visibility = rawVisibility === undefined ? 'exact' : mapValue('addressVisibility', rawVisibility, mapping);
  // Unknown visibility values are treated as private: the safe reading.
  const addressPrivate = visibility !== 'exact';
  if (rawVisibility !== undefined && !visibility) {
    warn('unknown_address_visibility', `Unknown address visibility "${rawVisibility}" treated as private`, 'addressVisibility');
  }
  const street = singleLine(single(record.address), LIMITS.address);
  let address: string;
  if (addressPrivate) {
    address = [district, city].filter(Boolean).join(', ');
  } else if (street) {
    address = street;
  } else {
    address = [district, city].filter(Boolean).join(', ');
    if (city) warn('missing_address', 'No street address; the listing shows its district/city only', 'address');
  }

  let lat = parseCoordinate(single(record.latitude), -90, 90);
  let lng = parseCoordinate(single(record.longitude), -180, 180);
  if ((single(record.latitude) && lat === undefined) || (single(record.longitude) && lng === undefined)) {
    warn('invalid_coordinates', 'Coordinates are out of range and were ignored', 'latitude');
  }
  if (lat === undefined || lng === undefined) {
    lat = undefined;
    lng = undefined;
  } else if (addressPrivate) {
    // Never keep a precise point for a private address: ~1 km grid.
    lat = Math.round(lat * 100) / 100;
    lng = Math.round(lng * 100) / 100;
  }

  const areaFactor = mapping.areaUnit === 'sqft' ? 1 / SQFT_PER_M2 : 1;
  const toArea = (raw: string | undefined, field: string): number | undefined => {
    if (raw === undefined) return undefined;
    const n = parseLocaleNumber(raw);
    if (n === undefined || n <= 0 || n > 1_000_000) {
      warn('invalid_area', `Area "${raw}" is not a valid measurement`, field);
      return undefined;
    }
    return Math.round(n * areaFactor * 100) / 100;
  };
  const sqft = toArea(single(record.area), 'area');
  const landArea = toArea(single(record.landArea), 'landArea');
  if (sqft === undefined && propertyType !== 'parking' && !(propertyType === 'land' && landArea !== undefined)) {
    error('missing_area', 'Floor area is missing', 'area');
  }

  const toCount = (raw: string | undefined, field: string, min: number, max: number): number | undefined => {
    if (raw === undefined) return undefined;
    const n = parseLocaleNumber(raw);
    if (n === undefined || !Number.isInteger(n) || n < min || n > max) {
      warn('invalid_number', `${field} "${raw}" is not a valid value and was ignored`, field);
      return undefined;
    }
    return n;
  };
  const beds = toCount(single(record.bedrooms), 'bedrooms', 0, 50);
  const baths = toCount(single(record.bathrooms), 'bathrooms', 0, 50);
  if (propertyType && ROOMS_REQUIRED.has(propertyType)) {
    if (beds === undefined) error('missing_bedrooms', 'Number of bedrooms is missing', 'bedrooms');
    if (baths === undefined) error('missing_bathrooms', 'Number of bathrooms is missing', 'bathrooms');
  }
  const livingRooms = toCount(single(record.livingRooms), 'livingRooms', 0, 20);
  const floorNumber = toCount(single(record.floor), 'floor', -5, 200);
  const totalFloors = toCount(single(record.totalFloors), 'totalFloors', 1, 200);
  const currentYear = new Date().getUTCFullYear();
  const yearBuilt = toCount(single(record.yearBuilt), 'yearBuilt', 1000, currentYear + 10);

  const rawEnergy = single(record.energyRating)?.trim().toUpperCase();
  const energyRating = rawEnergy && ENERGY_RATINGS.has(rawEnergy) ? (rawEnergy as NormalizedListing['energyRating']) : undefined;
  if (rawEnergy && !energyRating) warn('unknown_energy_rating', `Energy rating "${rawEnergy}" is not A+–G and was ignored`, 'energyRating');

  const amenities = Array.from(
    new Set(
      multi(record.amenities)
        .map((a) => singleLine(a, LIMITS.amenity)?.toLowerCase())
        .filter((a): a is string => Boolean(a))
    )
  ).slice(0, LIMITS.amenities);

  const collectUrls = (values: string[], field: string, max: number): string[] => {
    const urls: string[] = [];
    let invalid = 0;
    for (const value of values) {
      const url = safeHttpUrl(value);
      if (!url) invalid++;
      else if (!urls.includes(url)) urls.push(url);
    }
    if (invalid) warn('invalid_media_url', `${invalid} ${field} URL(s) are not valid http(s) addresses`, field);
    if (urls.length > max) {
      warn('too_many_media', `Only the first ${max} ${field} are imported`, field);
      return urls.slice(0, max);
    }
    return urls;
  };
  const imageUrls = collectUrls(multi(record.images), 'images', LIMITS.images);
  if (imageUrls.length === 0) error('missing_images', 'At least one photo is required', 'images');

  const planUrls = multi(record.floorplans);
  const floorplans: NormalizedListing['floorplans'] = [];
  planUrls.forEach((value, i) => {
    const url = safeHttpUrl(value);
    if (url && floorplans.length < LIMITS.floorplans && !floorplans.some((f) => f.url === url)) {
      floorplans.push({ url, label: singleLine(record.floorplanLabels?.[i], 40) });
    }
  });

  const rawSourceUrl = single(record.sourceUrl);
  const sourceUrl = safeHttpUrl(rawSourceUrl);
  if (rawSourceUrl && !sourceUrl) warn('invalid_source_url', 'Listing URL is not a valid http(s) address', 'sourceUrl');

  const rawUpdated = single(record.updatedAt);
  const updated = rawUpdated ? new Date(rawUpdated) : undefined;

  if (issues.some((i) => i.severity === 'error')) return { issues };

  const listing: NormalizedListing = {
    externalId: externalId as string,
    feedStatus: feedStatus as ListingStatusFromFeed,
    sourceUrl,
    title: (title as string).slice(0, LIMITS.title).trim(),
    description,
    listingType: listingType as 'sale' | 'rent',
    ...(listingType === 'rent' && rentPeriod ? { rentPeriod } : {}),
    propertyType: propertyType as PropertyType,
    price: price as number,
    isNegotiable: (price as number) === 0,
    country: country as string,
    city: city as string,
    address,
    addressPrivate,
    ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
    ...(sqft !== undefined ? { sqft } : {}),
    ...(landArea !== undefined ? { landArea } : {}),
    ...(beds !== undefined ? { beds } : {}),
    ...(baths !== undefined ? { baths } : {}),
    ...(livingRooms !== undefined ? { livingRooms } : {}),
    ...(floorNumber !== undefined ? { floorNumber } : {}),
    ...(totalFloors !== undefined ? { totalFloors } : {}),
    ...(yearBuilt !== undefined ? { yearBuilt } : {}),
    ...(energyRating ? { energyRating } : {}),
    amenities,
    imageUrls,
    floorplans,
    ...(updated && !Number.isNaN(updated.getTime()) ? { sourceUpdatedAt: updated.toISOString() } : {}),
  };
  return { listing, issues };
};
