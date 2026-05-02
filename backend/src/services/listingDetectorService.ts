/**
 * Auto-detect the best ingestion adapter for a given website URL.
 * Probes in order (fastest/most reliable first) and returns the first match.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { isValidListingItem } from './listingNormalizerService';

const BOT_UA = 'BalkanEstateBot/1.0 (+https://balkanestate.com/bot)';
const TIMEOUT = 12_000;

export interface DetectResult {
  adapterType: 'rss' | 'jsonFeed' | 'jsonLd' | 'customApi' | 'xmlFeed';
  adapterConfig: Record<string, unknown>;
  fieldMap: Record<string, string>;
  /** One raw example item from the source (for preview). */
  sample?: Record<string, unknown>;
  /** Human-readable description of what was found. */
  hint: string;
}

const get = (url: string, responseType: 'text' | 'json' = 'text') =>
  axios.get(url, {
    timeout: TIMEOUT,
    headers: { 'User-Agent': BOT_UA, Accept: '*/*' },
    responseType,
    validateStatus: (s) => s < 400,
  });

const tryUrl = async (url: string, responseType: 'text' | 'json' = 'text') => {
  try {
    const r = await get(url, responseType);
    return r.data as unknown;
  } catch {
    return null;
  }
};

/** Extract the first RSS/Atom feed URL from a page's <head>. */
const findFeedLinkInHtml = (html: string, baseUrl: string): string | null => {
  const $ = cheerio.load(html);
  const el = $('link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]').first();
  const href = el.attr('href');
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
};

/** Check if page has JSON-LD with real-estate types. */
const findJsonLdInHtml = (html: string): boolean => {
  const $ = cheerio.load(html);
  const ACCEPTED = new Set(['RealEstateListing', 'Residence', 'Apartment', 'House', 'Product']);
  let found = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    try {
      const data = JSON.parse($(el).html() ?? '{}');
      const items = Array.isArray(data) ? data : [data];
      if (items.some((i) => i['@type'] && ACCEPTED.has(String(i['@type'])))) found = true;
    } catch {/* ignore */}
  });
  return found;
};

/** Try to validate a URL looks like an RSS/Atom feed with real estate listings. */
const probeRss = async (url: string): Promise<Record<string, unknown>[] | null> => {
  try {
    const parser = new Parser({ timeout: TIMEOUT, headers: { 'User-Agent': BOT_UA } });
    const feed = await parser.parseURL(url);
    if (feed.items && feed.items.length > 0) {
      // Filter to only items that look like real listings
      const validItems = (feed.items as Record<string, unknown>[]).filter(item => isValidListingItem(item));
      if (validItems.length > 0) return validItems;
    }
    return null;
  } catch {
    return null;
  }
};

/** Try WordPress REST API. */
const probeWordPress = async (baseUrl: string): Promise<Record<string, unknown>[] | null> => {
  const origin = new URL(baseUrl).origin;
  const data = await tryUrl(`${origin}/wp-json/wp/v2/posts?per_page=3&_embed`, 'json');
  if (Array.isArray(data) && data.length > 0) {
    // Filter to only items that look like real listings
    const validItems = (data as Record<string, unknown>[]).filter(item => isValidListingItem(item));
    if (validItems.length > 0) return validItems;
  }
  return null;
};

/** Try fetching the URL itself as a JSON array/object. */
const probeJsonFeed = async (url: string): Promise<{ items: Record<string, unknown>[]; itemsPath: string } | null> => {
  const data = await tryUrl(url, 'json');
  if (!data || typeof data !== 'object') return null;
  if (Array.isArray(data) && data.length > 0) {
    const validItems = (data as Record<string, unknown>[]).filter(item => isValidListingItem(item));
    if (validItems.length > 0) return { items: validItems, itemsPath: '$[*]' };
  }
  // Common wrappers: { data: [], items: [], results: [], listings: [] }
  for (const key of ['data', 'items', 'results', 'listings', 'properties', 'nekretnine']) {
    const val = (data as Record<string, unknown>)[key];
    if (Array.isArray(val) && val.length > 0) {
      const validItems = (val as Record<string, unknown>[]).filter(item => isValidListingItem(item));
      if (validItems.length > 0) {
        return { items: validItems, itemsPath: `$.${key}[*]` };
      }
    }
  }
  return null;
};

/** Build a best-effort fieldMap from an RSS item. */
const rssFieldMap = (): Record<string, string> => ({
  title: 'title',
  description: 'content:encoded',
  imageUrl: 'enclosure.url',
  city: 'categories',
});

/** Build a best-effort fieldMap from JSON-LD keys. */
const jsonLdFieldMap = (): Record<string, string> => ({
  title: 'name',
  description: 'description',
  price: 'offers.price',
  imageUrl: 'image',
  address: 'address.streetAddress',
  city: 'address.addressLocality',
  country: 'address.addressCountry',
  lat: 'geo.latitude',
  lng: 'geo.longitude',
  beds: 'numberOfRooms',
  sqft: 'floorSize.value',
});

/** Build a best-effort fieldMap from a WordPress post. */
const wpFieldMap = (): Record<string, string> => ({
  title: 'title.rendered',
  description: 'content.rendered',
  imageUrl: '_embedded.wp:featuredmedia[0].source_url',
  city: '_embedded.wp:term[0][0].name',
});

/** Build a fieldMap by inspecting the keys of a sample JSON object. */
const buildJsonFieldMap = (sample: Record<string, unknown>): Record<string, string> => {
  const map: Record<string, string> = {};
  const keyHints: Array<[RegExp, string]> = [
    // Core fields
    [/^(title|name|naslov|naziv|listing_title|property_title)$/i, 'title'],
    [/^(description|desc|opis|content|listing_description|property_description|summary)$/i, 'description'],
    [/^(price|cijena|cena|preis|prix|precio|asking_price|listing_price)$/i, 'price'],

    // Images (multiple patterns — higher priority)
    [/^(images|photos|pictures|photos_array|image_array|gallery)$/i, 'images'],
    [/^(image|img|photo|foto|thumbnail|slika|main_image|primary_image|featured_image)$/i, 'imageUrl'],
    [/^(image_url|photo_url|image_link|thumbnail_url)$/i, 'imageUrl'],

    // Location
    [/^(city|grad|stadt|ville|ciudad)$/i, 'city'],
    [/^(address|adresa|adresse|street|ulica|ulice)$/i, 'address'],
    [/^(country|zemlja|drzava|pays|nation)$/i, 'country'],
    [/^(lat|latitude|coords_lat)$/i, 'lat'],
    [/^(lng|lon|longitude|coords_lng|coords_lon)$/i, 'lng'],

    // Specs
    [/^(beds|bedrooms|sobe|zimmer|num_bedrooms|bedroom_count)$/i, 'beds'],
    [/^(baths|bathrooms|kupatila|num_bathrooms|bathroom_count)$/i, 'baths'],
    [/^(sqft|area|povrsina|size|flaeche|square_feet|square_meters|living_area|floor_area)$/i, 'sqft'],
    [/^(rooms|living_rooms|salon|num_rooms)$/i, 'livingRooms'],
    [/^(year_built|year_constructed|godinu_izgradnje|baujahr)$/i, 'yearBuilt'],
    [/^(parking|parking_spaces|garaza|garagen)$/i, 'parking'],
    [/^(floor|floor_number|sprat|etaj)$/i, 'floorNumber'],
    [/^(total_floors|num_floors|ukupno_spratova|stockwerke)$/i, 'totalFloors'],

    // Property details
    [/^(property_type|type|kategorija|kategorie|propertytype)$/i, 'propertyType'],
    [/^(listing_type|transaction_type|tip_oglasa)$/i, 'listingType'],
    [/^(amenities|features|specijalne_karakteristike|ausstattung|facility)$/i, 'amenities'],
    [/^(furnishing|furnish|namesten|moebel|furnished_status)$/i, 'furnishing'],
    [/^(heating|heating_type|grijanje|heizung)$/i, 'heatingType'],
    [/^(condition|stanje|zustand|quality)$/i, 'condition'],
    [/^(view|views|pogled|aussicht|view_type)$/i, 'viewType'],

    // Links
    [/^(url|link|permalink|href|listing_url|property_url|source_url)$/i, 'sourceUrl'],
    [/^(virtual_tour|tour_url|3d_tour|video_url|video)$/i, 'virtualTour360Url'],

    // Identifiers
    [/^(id|_id|uid|listing_id|property_id)$/i, 'id'],
  ];
  for (const key of Object.keys(sample)) {
    for (const [re, prop] of keyHints) {
      if (re.test(key) && !Object.values(map).includes(prop)) {
        map[prop] = key;
        break;
      }
    }
  }
  return map;
};

/**
 * Analyze a pasted JSON string (single object or array) and build a fieldMap
 * from it. Does not make any network requests.
 */
export const detectFromJsonSample = (jsonString: string): DetectResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString.trim());
  } catch {
    throw new Error('Invalid JSON — please paste a valid JSON object or array of listings');
  }

  let items: Record<string, unknown>[] = [];
  let itemsPath = '$[*]';

  if (Array.isArray(parsed)) {
    items = parsed as Record<string, unknown>[];
  } else if (parsed && typeof parsed === 'object') {
    for (const key of ['data', 'items', 'results', 'listings', 'properties', 'nekretnine']) {
      const val = (parsed as Record<string, unknown>)[key];
      if (Array.isArray(val) && val.length > 0) {
        items = val as Record<string, unknown>[];
        itemsPath = `$.${key}[*]`;
        break;
      }
    }
    if (items.length === 0) {
      items = [parsed as Record<string, unknown>];
      itemsPath = '$';
    }
  } else {
    throw new Error('JSON must be an object or array of listings');
  }

  if (items.length === 0) throw new Error('No items found in the provided JSON');

  // Filter to only items that look like real listings
  const validItems = items.filter(item => isValidListingItem(item));
  if (validItems.length === 0) {
    throw new Error(
      'No items in the JSON look like real estate listings. ' +
      'Listings must have at least (title or description) and (price or location/city/country).'
    );
  }

  const sample = validItems[0];
  return {
    adapterType: 'jsonFeed',
    adapterConfig: { itemsPath, idPath: '$.id', urlPath: '$.url' },
    fieldMap: buildJsonFieldMap(sample),
    sample,
    hint: `JSON sample analyzed — ${validItems.length} valid item(s) detected out of ${items.length}`,
  };
};

/**
 * Probe a URL with optional auth headers and build an adapter config from the
 * response. Used when the user already knows the API endpoint and credentials.
 */
export const detectFeedForUrlWithAuth = async (
  rawUrl: string,
  headers: Record<string, string>
): Promise<DetectResult> => {
  const url = rawUrl.trim();
  let data: unknown;
  try {
    const r = await axios.get(url, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': BOT_UA, Accept: 'application/json, */*', ...headers },
      responseType: 'json',
      validateStatus: (s) => s < 500,
    });
    if (r.status >= 400) {
      throw new Error(`API returned HTTP ${r.status} — check the URL and auth credentials`);
    }
    data = r.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(`API returned HTTP ${err.response.status} — check the URL and auth credentials`);
    }
    throw err;
  }

  let items: Record<string, unknown>[] = [];
  let itemsPath = '$[*]';

  if (Array.isArray(data) && data.length > 0) {
    items = data as Record<string, unknown>[];
  } else if (data && typeof data === 'object') {
    for (const key of ['data', 'items', 'results', 'listings', 'properties', 'nekretnine']) {
      const val = (data as Record<string, unknown>)[key];
      if (Array.isArray(val) && val.length > 0) {
        items = val as Record<string, unknown>[];
        itemsPath = `$.${key}[*]`;
        break;
      }
    }
  }

  if (items.length === 0) {
    throw new Error(
      'API responded but returned no items. Check the URL, auth credentials, and that the endpoint returns a list of listings.'
    );
  }

  // Filter to only items that look like real listings
  const validItems = items.filter(item => isValidListingItem(item));
  if (validItems.length === 0) {
    throw new Error(
      'API returned items but none look like real estate listings. ' +
      'Listings must have at least (title or description) and (price or location/city/country).'
    );
  }

  const sample = validItems[0];
  const authConfig: Record<string, unknown> = {};
  if (Object.keys(headers).length > 0) authConfig.headers = headers;

  return {
    adapterType: 'customApi',
    adapterConfig: {
      url,
      ...authConfig,
      itemsPath,
      idPath: '$.id',
      urlPath: '$.url',
    },
    fieldMap: buildJsonFieldMap(sample),
    sample,
    hint: `Custom API detected — ${validItems.length} valid item(s) detected out of ${items.length}`,
  };
};

export const detectFeedForUrl = async (rawUrl: string): Promise<DetectResult> => {
  const url = rawUrl.trim();

  // ── 1. Probe the URL directly as RSS ────────────────────────────────────────
  const rssItems = await probeRss(url);
  if (rssItems) {
    const sample = rssItems[0];
    return {
      adapterType: 'rss',
      adapterConfig: { feedUrls: [url] },
      fieldMap: rssFieldMap(),
      sample,
      hint: `RSS/Atom feed detected — ${rssItems.length} item(s) found`,
    };
  }

  // ── 2. Fetch the page HTML and look for clues ────────────────────────────────
  const html = (await tryUrl(url)) as string | null;

  if (html && typeof html === 'string') {
    // 2a. RSS/Atom link in <head>
    const feedLink = findFeedLinkInHtml(html, url);
    if (feedLink) {
      const items = await probeRss(feedLink);
      if (items) {
        return {
          adapterType: 'rss',
          adapterConfig: { feedUrls: [feedLink] },
          fieldMap: rssFieldMap(),
          sample: items[0],
          hint: `RSS/Atom feed found via page <head>: ${feedLink}`,
        };
      }
    }

    // 2b. JSON-LD embedded in page
    if (findJsonLdInHtml(html)) {
      return {
        adapterType: 'jsonLd',
        adapterConfig: { listingUrls: [url] },
        fieldMap: jsonLdFieldMap(),
        hint: 'Schema.org JSON-LD (RealEstateListing) detected on the page',
      };
    }

    // 2c. WordPress indicators → probe WP REST
    if (html.includes('/wp-content/') || html.includes('wp-json')) {
      const wpItems = await probeWordPress(url);
      if (wpItems) {
        return {
          adapterType: 'customApi',
          adapterConfig: {
            url: `${new URL(url).origin}/wp-json/wp/v2/posts`,
            params: { per_page: 20, _embed: true },
            itemsPath: '$[*]',
            idPath: '$.id',
            urlPath: '$.link',
          },
          fieldMap: wpFieldMap(),
          sample: wpItems[0],
          hint: 'WordPress REST API detected',
        };
      }
    }
  }

  // ── 3. Common RSS paths ──────────────────────────────────────────────────────
  const origin = (() => { try { return new URL(url).origin; } catch { return ''; } })();
  for (const path of ['/feed', '/feed/', '/rss.xml', '/atom.xml', '/rss', '/?feed=rss2']) {
    const candidate = `${origin}${path}`;
    const items = await probeRss(candidate);
    if (items) {
      return {
        adapterType: 'rss',
        adapterConfig: { feedUrls: [candidate] },
        fieldMap: rssFieldMap(),
        sample: items[0],
        hint: `RSS feed found at ${candidate}`,
      };
    }
  }

  // ── 4. WordPress REST on origin ──────────────────────────────────────────────
  const wpItems = await probeWordPress(url);
  if (wpItems) {
    return {
      adapterType: 'customApi',
      adapterConfig: {
        url: `${origin}/wp-json/wp/v2/posts`,
        params: { per_page: 20, _embed: true },
        itemsPath: '$[*]',
        idPath: '$.id',
        urlPath: '$.link',
      },
      fieldMap: wpFieldMap(),
      sample: wpItems[0],
      hint: 'WordPress REST API detected',
    };
  }

  // ── 5. URL itself as JSON feed ───────────────────────────────────────────────
  const jsonResult = await probeJsonFeed(url);
  if (jsonResult) {
    const sample = jsonResult.items[0];
    return {
      adapterType: 'jsonFeed',
      adapterConfig: { url, itemsPath: jsonResult.itemsPath, idPath: '$.id', urlPath: '$.url' },
      fieldMap: buildJsonFieldMap(sample),
      sample,
      hint: `JSON feed detected — ${jsonResult.items.length} item(s) in response`,
    };
  }

  // ── Nothing found ────────────────────────────────────────────────────────────
  throw new Error(
    'Could not auto-detect a supported feed format. The site may block automated access. ' +
    'Try pasting a direct RSS, JSON, or Atom feed URL instead of the homepage.'
  );
};
