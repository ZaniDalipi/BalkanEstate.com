import { canonicalCountry, findPlaceInText, fixSwappedCoordinates, isPlausiblePlaceName, locationSlug } from './location';
import {
  type CataloguePlace,
  catalogueCountry,
  findCataloguePlaceInText,
  lookupCataloguePlace,
  nearestCataloguePlace,
  textMentionsPlace,
} from './placeCatalog';

export interface ResolvedLocation {
  /** A city from the app's catalogue whenever one can be found — what the listing form's picker offers. */
  city?: string;
  country?: string;
  /** Street / village / resort, as precise as the source gave it. */
  address?: string;
  lat?: number;
  lng?: number;
  /** Centre of the matched village or city: a fallback map position when nothing more precise exists. */
  approxLat?: number;
  approxLng?: number;
}

const text = (v: unknown): string | undefined => {
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string') return undefined;
  const t = v.replace(/\s+/g, ' ').trim();
  return t || undefined;
};

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n !== 0 ? n : undefined;
};

const urlPath = (url?: string): string | undefined => {
  try {
    return url ? decodeURIComponent(new URL(url).pathname).replace(/[-_/]+/g, ' ') : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Sites put marketing copy in the address field: "Apartment For Sale In
 * Gjiri i Lalzit, Durres", "Vila na prodaju u Puli". Keep only the place.
 */
const SALES_PHRASE_RE =
  /^.*?\b(?:for\s+sale|for\s+rent|to\s+rent|na\s+prodaju|za\s+prodaju|u\s+najam|za\s+najam|ne\s+shitje|në\s+shitje|me\s+qira|me\s+qera|de\s+v[aâ]nzare|de\s+[iî]nchiriat|за\s+продажба|под\s+наем|προς\s+πώληση)\s+(?:in|at|on|near|u|na|kod|ne|në|în|в|σε|στ[ηο]ν?)\s+/i;

export const cleanListingAddress = (address: string | undefined): string | undefined => {
  if (!address) return undefined;
  const cleaned = address.replace(SALES_PHRASE_RE, '').replace(/^[\s,–—-]+|[\s,–—-]+$/g, '');
  return cleaned.length >= 2 ? cleaned : undefined;
};

/** Add a place name to an address unless it's already in it. */
const withPlace = (address: string | undefined, place: string | undefined): string | undefined => {
  if (!place) return address;
  if (!address) return place;
  return locationSlug(address).includes(locationSlug(place)) ? address : `${address}, ${place}`;
};

/**
 * City, country, street address and coordinates of an imported listing,
 * matched to the places the app knows.
 *
 * City: the app catalogue's city named in the city field, then in the
 * address, region, title, URL or description (a village or resort named
 * there gives its city: Radhimë → Vlore, Banjole → Pula); then the catalogue
 * city nearest the listing's map position; only then the site's own name.
 * A village or district the site named is kept in the address.
 */
export const resolveLocation = (mapped: Record<string, unknown>, url?: string): ResolvedLocation => {
  const rawCity = text(mapped.city);
  const rawAddress = cleanListingAddress(text(mapped.address));
  const rawCountry = text(mapped.country);
  const sources = [rawCity, rawAddress, text(mapped.region), text(mapped.title), urlPath(url), text(mapped.description)?.slice(0, 400)]
    .filter((s): s is string => !!s);

  // Country first — it decides which "Novi" or "Bar" a name means.
  let country = rawCountry ? catalogueCountry(rawCountry) ?? canonicalCountry(rawCountry) ?? rawCountry : undefined;
  for (const s of sources) {
    if (country) break;
    country = findPlaceInText(s).country;
  }
  const strongCountry = country;
  country ??= text(mapped.pageCountry);

  const lat0 = num(mapped.lat);
  const lng0 = num(mapped.lng);
  const coords = lat0 !== undefined && lng0 !== undefined ? fixSwappedCoordinates(lat0, lng0) : undefined;

  const findIn = (hint?: string): CataloguePlace | undefined => {
    const c = catalogueCountry(hint);
    if (rawCity) {
      const direct = lookupCataloguePlace(rawCity, c) ?? lookupCataloguePlace(rawCity.split(',')[0], c);
      if (direct) return direct;
    }
    for (const s of sources) {
      const hit = findCataloguePlaceInText(s, c);
      if (hit) return hit;
    }
    return coords ? nearestCataloguePlace(coords.lat, coords.lng, c) : undefined;
  };
  // A country guessed from the site (phone prefix, domain) may be wrong for
  // this listing; when nothing matches under it, look everywhere.
  // A listing abroad (a country the catalogue doesn't cover) keeps its own city.
  const outsideCatalogue = Boolean(strongCountry && !catalogueCountry(strongCountry));
  const place = outsideCatalogue ? undefined : findIn(country) ?? (strongCountry ? undefined : findIn(undefined));

  let city = place?.city;
  let address = rawAddress;
  if (place) {
    country = place.country;
    // Name the village / resort in the address, unless it's there already
    // under any of its names ("Lalzi Bay" is "Gjiri i Lalzit").
    if (place.locality && !(address && textMentionsPlace(address, place))) address = withPlace(address, place.locality);
    // A place the site named that the catalogue doesn't know stays in the address.
    const sitePlace = rawCity?.split(',')[0].trim();
    if (sitePlace && isPlausiblePlaceName(sitePlace) && !lookupCataloguePlace(sitePlace, place.country)) {
      address = withPlace(address, sitePlace);
    }
  } else {
    // Outside the catalogue: the site's own name, if it reads like a place.
    const legacy = sources.map((s) => findPlaceInText(s).city).find(Boolean);
    city = legacy ?? (rawCity && isPlausiblePlaceName(rawCity.split(',')[0]) ? rawCity.split(',')[0].trim() : undefined);
  }

  return {
    city,
    country,
    address,
    lat: coords?.lat,
    lng: coords?.lng,
    approxLat: place?.lat,
    approxLng: place?.lng,
  };
};
