import { JSONPath } from 'jsonpath-plus';
import { Types } from 'mongoose';
import type { IListingSource } from '../models/ListingSource';
import type { IProperty, IPropertyImage } from '../models/Property';
import type { RawListing } from './listingAdapters';
import { geocodeAddress } from './geocodingService';
import { uploadFromUrl } from './cloudinaryService';
import { enrichFromDetailHtml } from './listingHtmlEnricher';
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
  studio: 'apartment', garsonjera: 'apartment', garsonijera: 'apartment',
  jednosoban: 'apartment', dvosoban: 'apartment', trosoban: 'apartment',
  penthouse: 'villa', attic: 'villa',
  house: 'house', kuca: 'house', kuća: 'house', vivienda: 'house', maison: 'house', haus: 'house',
  bungalow: 'house', chalet: 'house', cottage: 'house', farmhouse: 'house',
  villa: 'villa', vila: 'villa', vil: 'villa', mansion: 'villa',
  land: 'land', zemljiste: 'land', zemljište: 'land', plac: 'land', plot: 'land', terreno: 'land',
  parcel: 'land', parcela: 'land', teren: 'land', njiva: 'land',
  commercial: 'other', poslovni: 'other', office: 'other', store: 'other',
  lokal: 'other', poslovni_prostor: 'other', retail: 'other', warehouse: 'other',
  garage: 'other', garaza: 'other', garaža: 'other',
  room: 'other', soba: 'other', kamer: 'other',
};

const LISTING_TYPE_MAP: Record<string, IProperty['listingType']> = {
  // English
  sale: 'sale', forsale: 'sale', for_sale: 'sale',
  // Croatian / Bosnian / Serbian
  prodaja: 'sale', prodaje: 'sale', kupoprodaja: 'sale',
  // Romanian
  vanzare: 'sale', devanzare: 'sale',
  // Albanian
  shitje: 'sale',
  // Greek
  πωληση: 'sale', πωλειται: 'sale',
  // Hungarian
  elado: 'sale', eladas: 'sale',
  // German
  kauf: 'sale', kaufen: 'sale', verkauf: 'sale',
  // Bulgarian / Macedonian (Cyrillic)
  продажба: 'sale', продажа: 'sale',
  // Rent / English
  rent: 'rent', rental: 'rent', rentals: 'rent', forrent: 'rent', for_rent: 'rent', lease: 'rent',
  // Croatian / Bosnian / Serbian
  najam: 'rent', iznajmljivanje: 'rent', zakup: 'rent',
  // Romanian
  inchiriere: 'rent', chirii: 'rent',
  // Albanian
  qira: 'rent',
  // Greek
  ενοικιο: 'rent', ενοικιαση: 'rent',
  // Hungarian
  kiado: 'rent', berlet: 'rent',
  // German
  miete: 'rent', vermieten: 'rent', mietung: 'rent',
  // Bulgarian / Macedonian
  наем: 'rent', 'под наем': 'rent', кирија: 'rent',
};

const RENT_PRICE_HINTS = /(\/\s*mo|\/\s*month|month\b|mes\.|mesec|mjesec|m(jese|ese)čno|monatlich|monat\b|μήνα|po mesecu|par\s+mois|al\s+mes|affitto|loyer|aluguel|kira\b|bérlet)/i;

interface ParsedPrice {
  price: number;
  currency?: string;
  isRent?: boolean;
}

/**
 * Convert a raw numeric string (after stripping currency/suffix) into a
 * plain float string, handling all European real-estate price formats:
 *   "1.200.000"    → "1200000"   dot-thousands (Croatian/Balkan/Greek)
 *   "1,200,000"    → "1200000"   comma-thousands (US/UK)
 *   "1.200.000,50" → "1200000.5" EU: dot-thousands + comma-decimal
 *   "1,200,000.50" → "1200000.5" US: comma-thousands + dot-decimal
 *   "1.200,50"     → "1200.5"    EU short
 *   "1,200.50"     → "1200.5"    US short
 *   "1 200 000"    → "1200000"   space-thousands (French/Slavic)
 *   "1 200,50"     → "1200.5"    space-thousands + comma-decimal
 *   "1.200"        → "1200"      single dot with 3-digit group → thousands
 *   "1,200"        → "1200"      single comma with 3-digit group → thousands
 *   "120.5"        → "120.5"     plain decimal
 *   "120,5"        → "120.5"     comma decimal (Balkan style)
 */
const normalizePriceNumeric = (raw: string): string => {
  // Collapse all Unicode whitespace variants and apostrophe/quote thousands separators.
  //   = non-breaking space (very common on European RE sites),   = thin space,
  //   = narrow no-break space,   = figure space,   = punctuation space.
  let s = raw.replace(/[       　'’]/g, ' ').trim();

  // Consolidate ANY spaces between digits into nothing (space-as-thousands separator).
  // Single space between digit groups: "1 200 000" or "620 000" → "1200000" / "620000"
  if (/\d[ \t]+\d/.test(s)) {
    s = s.replace(/(\d)[ \t]+(?=\d)/g, '$1');
  }

  const dots   = (s.match(/\./g) ?? []).length;
  const commas = (s.match(/,/g) ?? []).length;

  if (!dots && !commas) return s;

  // EU: dot-thousands + comma-decimal  e.g. "1.200.000,50" / "1.200,50"
  if (commas === 1 && /,\d{1,2}$/.test(s) && dots >= 1) {
    return s.replace(/\./g, '').replace(',', '.');
  }

  // US: comma-thousands + dot-decimal  e.g. "1,200,000.50" / "1,200.50"
  if (dots === 1 && /\.\d{1,2}$/.test(s) && commas >= 1) {
    return s.replace(/,/g, '');
  }

  // Pure dot-thousands (all segments exactly 3 digits): "1.200.000" / "620.000"
  if (!commas && /^\d{1,3}(\.\d{3})+$/.test(s.trim())) {
    return s.replace(/\./g, '');
  }

  // Pure comma-thousands (all segments exactly 3 digits): "1,200,000"
  if (!dots && /^\d{1,3}(,\d{3})+$/.test(s.trim())) {
    return s.replace(/,/g, '');
  }

  // Single dot — use digit-count heuristic:
  // ".nnn" (exactly 3 digits after dot) → thousands separator ("620.000" → 620000)
  // ".n" / ".nn" → decimal point ("120.5" → 120.5)
  if (dots === 1 && !commas) {
    const afterDot = s.split('.')[1] ?? '';
    if (afterDot.length === 3) return s.replace('.', '');
    return s;
  }

  // Single comma — same heuristic.
  if (commas === 1 && !dots) {
    const afterComma = s.split(',')[1] ?? '';
    if (afterComma.length === 3) return s.replace(',', '');
    return s.replace(',', '.');
  }

  // Fallback: strip separators (rare mixed formats).
  return s.replace(/[.,]/g, '');
};

const parsePrice = (input: unknown): ParsedPrice | null => {
  if (input == null) return null;
  // For bare numbers (e.g. from JSON-LD "price": 620), return directly only
  // when it's already in a plausible RE range. Sub-1000 values are often
  // dot-thousands strings that the JSON parser already collapsed (620.000→620),
  // so we return null to let the HTML label extractor take priority.
  if (typeof input === 'number' && Number.isFinite(input)) {
    if (input < 1000) return null;
    return { price: input };
  }
  const str = String(input).trim();
  if (!str) return null;

  const isRent = RENT_PRICE_HINTS.test(str);

  // All currencies used across Balkan + wider Europe.
  const CURRENCY_RE = /(€|EUR|USD|\$|GBP|£|CHF|RSD|HRK|kn|MKD|ден|BAM|KM|RON|BGN|лв\.?|ALL|Lek|HUF|Ft|TRY|TL|PLN|CZK|SEK|NOK|DKK|UAH|RUB)/i;
  const currencyMatch = str.match(CURRENCY_RE);
  let currency = currencyMatch?.[0]?.trim()
    .replace(/€/g, 'EUR').replace(/\$/g, 'USD').replace(/£/g, 'GBP')
    .replace(/kn/gi, 'HRK').replace(/km/gi, 'BAM')
    .replace(/лв\.?/gi, 'BGN').replace(/ден/gi, 'MKD')
    .replace(/lek/gi, 'ALL').replace(/ft/gi, 'HUF')
    .replace(/tl/gi, 'TRY')
    .toUpperCase();
  // If no currency symbol was found, leave it undefined rather than guessing.
  if (currency === undefined) currency = undefined;

  // Strip everything except digits and separator characters.
  let numeric = str
    .replace(new RegExp(CURRENCY_RE.source, 'gi'), '')
    .replace(/\/\s*(mo|month|mese|monat|mois)\b/gi, '')
    .replace(/(po\s+m(ese|jese)cu|mes\.|m(jese|ese)čno|μήνα|monatlich|par\s+mois|al\s+mes)/gi, '')
    .trim();

  if (!numeric) return null;

  numeric = normalizePriceNumeric(numeric);

  const num = parseFloat(numeric);
  if (!Number.isFinite(num)) return null;
  return { price: num, currency, isRent };
};

const extractPriceFromText = (text: unknown): ParsedPrice | null => {
  if (!text || typeof text !== 'string') return null;
  const t = text.replace(/\s+/g, ' ');
  // Currency must be adjacent to the number. Reject sub-100 (likely fees,
  // deposits, or service charges) and >100M (typo / wrong currency).
  const patterns = [
    /(€|EUR|USD|\$|GBP|£|CHF|RSD|HRK|kn|MKD|ден|BAM|KM|RON|BGN|лв\.?|ALL|Lek|HUF|Ft|TRY|TL|PLN|CZK|SEK|NOK|DKK)\s*([\d][\d.,\s]*[\d](?:\s*[KMB])?)(?!\d)/i,
    /(?<!\d)([\d][\d.,\s]*[\d](?:\s*[KMB])?)\s*(€|EUR|USD|\$|GBP|£|CHF|RSD|HRK|kn|MKD|ден|BAM|KM|RON|BGN|лв\.?|ALL|Lek|HUF|Ft|TRY|TL|PLN|CZK|SEK|NOK|DKK)\b/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(t);
    if (!match) continue;
    const currency = /[€$£]|EUR|USD|GBP|CHF|RSD|HRK|kn|MKD|ден|BAM|KM|RON|BGN|лв\.?|ALL|Lek|HUF|Ft|TRY|TL|PLN|CZK|SEK|NOK|DKK/i.test(match[1]) ? match[1] : match[2];
    const numStr = currency === match[1] ? match[2] : match[1];
    const parsed = parsePrice(`${currency}${numStr}`);
    if (parsed && parsed.price >= 100 && parsed.price <= 100_000_000) return parsed;
  }
  return null;
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

// Strict extraction with word boundaries + plausible numeric ranges. Conservative
// on purpose — we'd rather leave a field unknown than fabricate one. False
// positives end up as wrong data on the public listing page.

const extractBedsFromText = (text: unknown): number | null => {
  if (!text || typeof text !== 'string') return null;
  const t = text.replace(/\s+/g, ' ');
  const patterns = [
    /(?<![.\d])(\d{1,2})\s*(?:bed(?:room)?s?|spava[cć][ae]\s*sobe?|soba|sobi|sobe|spalni[ce]?|стаи|соби|спалн[яи]|chambre[s]?|habitaci[oó]n(?:es)?|zimmer|schlafzimmer|camera(?:\s+da\s+letto)?|camere|szoba|hálószoba|υπνοδωμάτι[αo]|dormitor(?:e|oa)?)\b/i,
    /\b(?:bed(?:room)?s?|soba|sobi|sobe|spalni[ce]?|chambre|habitaci[oó]n|zimmer|camera|szoba|υπνοδωμάτι[αo]|dormitor)\s*[:#=]\s*(\d{1,2})\b/i,
  ];
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 15) return num;
    }
  }
  return null;
};

const extractBathsFromText = (text: unknown): number | null => {
  if (!text || typeof text !== 'string') return null;
  const t = text.replace(/\s+/g, ' ');
  // `wc` removed — it appears in slugs/IDs and false-matches constantly.
  const patterns = [
    /(?<![.\d])(\d{1,2})\s*(?:bath(?:room)?s?|kupatil[ao]?|baie|bai|bagn[oi]|badeziemmer|fürdő\w*|μπάνι[οα]?|toalet|тоалет|купатил[оа]?|баня)\b/i,
    /\b(?:bath(?:room)?s?|kupatil[ao]?|baie|bagno)\s*[:#=]\s*(\d{1,2})\b/i,
  ];
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 10) return num;
    }
  }
  return null;
};

const extractSqftFromText = (text: unknown): number | null => {
  if (!text || typeof text !== 'string') return null;
  const t = text.replace(/\s+/g, ' ');
  // Remove space-as-thousands-separator adjacent to digits (e.g. "1 500 m²" → "1500 m²")
  const tClean = t.replace(/(\d) (\d{3})\b/g, '$1$2').replace(/(\d) (\d{3})\b/g, '$1$2');
  // m² requires a digit-then-unit shape and rejects letter prefixes (e.g. "M2 engine")
  const patterns = [
    /(?<![A-Za-z])(\d{2,5}(?:[.,]\d{1,2})?)\s*(?:m²|m2|sqm|sq\.?\s*m\.?|square\s*meters?|qm|kvadrata?|mp|mq)\b/i,
    /(?<![A-Za-z])(\d{2,5}(?:[.,]\d{1,2})?)\s*(?:sq\s*ft|sqft|ft²)\b/i,
  ];
  for (const pattern of patterns) {
    const match = tClean.match(pattern);
    if (match && match[1]) {
      const num = parseFloat(match[1].replace(',', '.'));
      // Realistic property areas: 10 m² (tiny studio) to 50,000 m² (large estate)
      if (Number.isFinite(num) && num >= 10 && num <= 50_000) return num;
    }
  }
  return null;
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
 * Regex patterns matching keys that indicate a real-estate-listing-shaped
 * field. Matched case-insensitively and with `includes` semantics, so e.g.
 * `propertyTitle`, `listing_name`, `naslov_oglasa` and `house_price` all hit.
 */
const CONTENT_KEY_RE = /(title|name|naslov|naziv|description|opis|content|summary|heading|headline|subject)/i;
const LOCATION_KEY_RE = /(address|street|city|country|state|region|town|location|grad|zemlja|drzava|ulica|adresa|postal|zip|lat|lng|lon|coord|geo|place|district|county|kraj)/i;
const PRICE_KEY_RE = /(price|amount|cost|rent|fee|cijena|cena|preis|prix|precio|valor|asking|monthly|priceeur|price_eur|listing_price|property_price)/i;
const PROPERTY_KEY_RE = /(beds?|bedroom|baths?|bathroom|sqft|sqm|m2|area|surface|sobe|kupatil|povrsina|tip|type|categor|kategorij|zimmer|chamber|bagno|imag|photo|image|slika|foto|gallery|room|stan|kuca|apartment|villa|land|plot|parcel|garage|parking|floor|sprat|etaz|etag|year|built|godinu|baujahr|condition|stanje|construction|view|pogled|aussicht|heating|grijanje|furnishing|nameste)/i;

/**
 * Walk an object and check if any (possibly-nested) key matches the regex.
 * Bounded to depth 4 so we don't burn time on huge payloads.
 */
const hasMatchingKey = (
  obj: unknown,
  re: RegExp,
  depth = 0
): boolean => {
  if (obj == null || depth > 4) return false;
  if (Array.isArray(obj)) {
    return obj.some((v) => hasMatchingKey(v, re, depth + 1));
  }
  if (typeof obj !== 'object') return false;
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (re.test(key)) {
      // The key matches — but ensure the value isn't empty / null / empty array.
      if (val == null) continue;
      if (Array.isArray(val) && val.length === 0) continue;
      if (typeof val === 'string' && val.trim() === '') continue;
      if (typeof val === 'object' && Object.keys(val as object).length === 0) continue;
      return true;
    }
    // Also recurse into nested objects so deep keys can satisfy the check.
    if (typeof val === 'object' && hasMatchingKey(val, re, depth + 1)) return true;
  }
  return false;
};

/**
 * Validate that a raw listing looks like a real estate listing.
 *
 * Permissive: at least ONE strong real-estate signal must be present. Strong
 * signals are price, location, or a dedicated property attribute (beds, area,
 * rooms, image gallery, propertyType, etc.). Title alone is not enough since
 * news articles, blog posts, and product pages all have titles.
 *
 * Tolerant of nested objects and arbitrary key naming styles (snake_case,
 * camelCase, accented Slavic terms, German/French/Spanish/Greek/Romanian
 * keys, etc.) by using regex `includes` matching against keys.
 */
export const isValidListingItem = (raw: Record<string, unknown>): boolean => {
  if (!raw || typeof raw !== 'object') return false;
  const hasContent = hasMatchingKey(raw, CONTENT_KEY_RE);
  const hasPrice = hasMatchingKey(raw, PRICE_KEY_RE);
  const hasLocation = hasMatchingKey(raw, LOCATION_KEY_RE);
  const hasPropertyAttr = hasMatchingKey(raw, PROPERTY_KEY_RE);

  // Need at least one identifying real-estate signal beyond just text content.
  // Title + any of (price | location | property attribute) → it's a listing.
  // No content but price + location → still a listing (sparse feed entry).
  if (hasContent && (hasPrice || hasLocation || hasPropertyAttr)) return true;
  if (hasPrice && hasLocation) return true;
  return false;
};

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

  // Adapters that fetch a per-listing HTML detail page (e.g. HtmlScrapeAdapter
  // with followDetails=true) attach the raw HTML at raw.raw.detailHtml. Pull
  // every structured-data signal we can find from it (JSON-LD, OpenGraph,
  // microdata, image galleries) without overwriting fields the index card
  // already supplied — those are typically more accurate.
  const detailHtml = (raw.raw as Record<string, unknown> | undefined)?.detailHtml;
  if (typeof detailHtml === 'string' && detailHtml.length > 0) {
    enrichFromDetailHtml(detailHtml, raw.url ?? source.baseUrl ?? '', mapped);
  }

  // Don't carry the raw HTML blob into sourceMetadata — it's huge and adds nothing.
  if ('detailHtml' in mapped) delete mapped.detailHtml;

  let parsedPrice = parsePrice(mapped.price);
  // Reject implausible prices from the field map (e.g. price field actually
  // pointed at year/zip/area). Real listing prices are between €100 and €100M.
  if (parsedPrice && (parsedPrice.price < 100 || parsedPrice.price > 100_000_000)) {
    parsedPrice = null;
  }
  // Conservative fallback: scan description and title for price patterns.
  if (!parsedPrice && typeof mapped.description === 'string') {
    parsedPrice = extractPriceFromText(mapped.description);
  }
  if (!parsedPrice && typeof mapped.title === 'string') {
    parsedPrice = extractPriceFromText(mapped.title);
  }

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

  // Fallback extraction. We deliberately scan only title + description (not
  // arbitrary `extras` JSON) because stringifying nested objects creates many
  // numeric noise tokens like view counts, IDs, etc., and the extractors
  // above are tuned for natural-language text.
  const description = (mapped.description as string | undefined) ?? '';
  const title = (mapped.title as string | undefined) ?? '';
  const fullText = [title, description].filter(Boolean).join(' ').replace(/\s+/g, ' ');

  let beds = parseInt0(mapped.beds);
  let baths = parseInt0(mapped.baths);
  let sqft = parseFloatLoose(mapped.sqft);
  let parking = parseInt0(mapped.parking);
  let livingRooms = parseInt0(mapped.livingRooms);

  // Range-validate values that came from the field map too — a fieldMap
  // pointed at the wrong key still produces garbage (e.g. `beds = 2024` from
  // a year field). Drop any out-of-range value rather than persist it.
  if (beds != null && (beds < 1 || beds > 15)) beds = null;
  if (baths != null && (baths < 1 || baths > 10)) baths = null;
  if (sqft != null && (sqft < 10 || sqft > 50_000)) sqft = null;
  if (parking != null && (parking < 1 || parking > 10)) parking = null;
  if (livingRooms != null && (livingRooms < 1 || livingRooms > 5)) livingRooms = null;

  // Try extraction from text only if the fieldMap didn't populate it.
  if (!beds && fullText) beds = extractBedsFromText(fullText);
  if (!baths && fullText) baths = extractBathsFromText(fullText);
  if (!sqft && fullText) sqft = extractSqftFromText(fullText);

  // Parking — explicit phrase only; reject bare digit + "space" (matches anything).
  if (!parking && fullText) {
    const parkMatch = fullText.match(
      /(?<![.\d])(\d{1,2})\s*(?:parking\s+(?:spots?|spaces?|places?)|parking\s+lots?|parkir(?:ali[sš]ta?|no\s+mjesto)|garage[s]?|garaž[ae]|stellpl[aä]tze?)\b/i
    );
    if (parkMatch && parkMatch[1]) {
      const num = parseInt(parkMatch[1], 10);
      if (num >= 1 && num <= 10) parking = num;
    }
  }
  if (!livingRooms && fullText) {
    const roomMatch = fullText.match(
      /(?<![.\d])(\d{1,2})\s*(?:living\s+rooms?|sitting\s+rooms?|dnevn[ai]\s+sob[ae]|wohnzimmer|salon)s?\b/i
    );
    if (roomMatch && roomMatch[1]) {
      const num = parseInt(roomMatch[1], 10);
      if (num >= 1 && num <= 5) livingRooms = num;
    }
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
    beds: beds ?? 0,
    baths: baths ?? 0,
    livingRooms: livingRooms ?? 0,
    sqft: sqft ?? 0,
    yearBuilt: parseInt0(mapped.yearBuilt) ?? 0,
    parking: parking ?? 0,
    description,
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
