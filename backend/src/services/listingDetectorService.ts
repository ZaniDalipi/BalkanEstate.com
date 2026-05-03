/**
 * Auto-detect the best ingestion adapter for a given website URL.
 * Probes in order (fastest/most reliable first) and returns the first match.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import Parser from 'rss-parser';
import { isValidListingItem } from './listingNormalizerService';
import { findSiteProfile } from './listingDetectorProfiles';

const BOT_UA = 'BalkanEstateBot/1.0 (+https://balkanestate.com/bot)';
const TIMEOUT = 12_000;

export interface DetectResult {
  adapterType: 'rss' | 'jsonFeed' | 'jsonLd' | 'customApi' | 'xmlFeed' | 'htmlScrape';
  adapterConfig: Record<string, unknown>;
  fieldMap: Record<string, string>;
  /** One raw example item from the source (for preview). */
  sample?: Record<string, unknown>;
  /** Human-readable description of what was found. */
  hint: string;
}

/**
 * URL-path fragments commonly used for individual listing detail pages
 * across Balkan / European real-estate sites. Used to discriminate
 * "listing card" anchors from navigation/footer/agency links.
 */
const LISTING_URL_FRAGMENTS = [
  '/oglas/', '/oglasi/', '/oglas-', '/oglasi-',
  '/nekretnina/', '/nekretnine/', '/nekretnina-',
  '/imovina/', '/imobil/',
  '/listing/', '/listings/',
  '/property/', '/properties/',
  '/inmueble/', '/immobilien/', '/immobilier/',
  '/objava/', '/objave/',
  '/apartman/', '/apartmani/', '/stan/', '/stanovi/',
  '/kuca/', '/kuće/', '/kuce/',
  '/anuntul/', '/anunt/',
  '/detail/', '/details/',
  '/p/', '/l/', '/o/',
];

const looksLikeListingPath = (pathname: string): boolean => {
  const lower = pathname.toLowerCase();
  if (LISTING_URL_FRAGMENTS.some(f => lower.includes(f))) return true;
  // Numeric-id detail pages like /property/12345 or /oglas/12345
  if (/\/\d{3,}(?:[/-]|$)/.test(lower)) return true;
  return false;
};

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

/**
 * Walk a deeply-nested object/array and return the first array that:
 * - has at least 2 items
 * - items are objects that look like real estate listings
 * Returns the array and a dot-path to it (for itemsPath).
 */
const findListingsInState = (
  obj: unknown,
  depth = 0,
  path = '$'
): { items: Record<string, unknown>[]; itemsPath: string } | null => {
  if (depth > 6 || obj == null || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    if (obj.length >= 2) {
      const records = obj as Record<string, unknown>[];
      const validCount = records.filter(i => typeof i === 'object' && i !== null && isValidListingItem(i as Record<string, unknown>)).length;
      if (validCount >= 2) return { items: records, itemsPath: `${path}[*]` };
    }
    return null;
  }
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const result = findListingsInState(val, depth + 1, `${path}.${key}`);
    if (result) return result;
  }
  return null;
};

/**
 * Try to extract listing data embedded in the page's JavaScript state.
 * Handles Next.js (__NEXT_DATA__), Nuxt (window.__NUXT__), generic
 * window.__INITIAL_STATE__, and any <script type="application/json"> blocks.
 */
const extractEmbeddedSpaListings = (
  html: string
): { items: Record<string, unknown>[]; itemsPath: string; source: string } | null => {
  // 1. Next.js: <script id="__NEXT_DATA__" type="application/json">
  const nextMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextMatch?.[1]) {
    try {
      const data = JSON.parse(nextMatch[1]) as Record<string, unknown>;
      const props = (data.props as Record<string, unknown>)?.pageProps ?? data.props ?? data;
      const result = findListingsInState(props);
      if (result) return { ...result, source: '__NEXT_DATA__' };
    } catch {/* ignore */}
  }

  // 2. Nuxt: window.__NUXT__ = {...}  or  <script>window.__NUXT__={...}</script>
  const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]{20,8000}?\})\s*[;<]/);
  if (nuxtMatch?.[1]) {
    try {
      const data = JSON.parse(nuxtMatch[1]) as Record<string, unknown>;
      const state = (data.data as unknown[]) ?? data;
      const result = findListingsInState(state);
      if (result) return { ...result, source: '__NUXT__' };
    } catch {/* ignore */}
  }

  // 3. Generic window.__INITIAL_STATE__ or window.initialState
  const stateMatch = html.match(/window\.__(?:INITIAL_)?STATE__\s*=\s*(\{[\s\S]{20,8000}?\})\s*[;<]/i);
  if (stateMatch?.[1]) {
    try {
      const data = JSON.parse(stateMatch[1]) as Record<string, unknown>;
      const result = findListingsInState(data);
      if (result) return { ...result, source: '__INITIAL_STATE__' };
    } catch {/* ignore */}
  }

  // 4. Any standalone <script type="application/json"> with listing arrays
  const $ = cheerio.load(html);
  let spaResult: { items: Record<string, unknown>[]; itemsPath: string; source: string } | null = null;
  $('script[type="application/json"]').each((_, el) => {
    if (spaResult) return;
    const text = $(el).contents().text();
    if (!text || text.length < 50) return;
    try {
      const data = JSON.parse(text) as unknown;
      const result = findListingsInState(data);
      if (result) spaResult = { ...result, source: 'application/json script' };
    } catch {/* ignore */}
  });

  return spaResult;
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

/**
 * Smart HTML scrape detection: parse a page (e.g. an agency listings page),
 * find anchors that match listing-detail URL patterns, identify the common
 * card container, and synthesize an htmlScrape adapter config.
 *
 * Returns null when fewer than 2 listing-link anchors are found.
 */
const detectHtmlScrape = (
  html: string,
  pageUrl: string
): {
  selectors: {
    listingItem: string;
    link: string;
    title?: string;
    price?: string;
    image?: string;
    description?: string;
  };
  sample: Record<string, unknown>;
  count: number;
} | null => {
  const $ = cheerio.load(html);

  // 1. Collect anchors that point at listing-detail URLs.
  type AnchorInfo = { el: cheerio.Cheerio<AnyNode>; href: string; abs: string };
  const anchors: AnchorInfo[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    let abs: string;
    try { abs = new URL(href, pageUrl).toString(); } catch { return; }
    let pathname: string;
    try { pathname = new URL(abs).pathname; } catch { return; }
    if (looksLikeListingPath(pathname)) {
      anchors.push({ el: $(el), href, abs });
    }
  });

  if (anchors.length < 2) return null;

  // 2. De-duplicate by abs URL (some pages link the same listing 2-3 times via
  //    image + title + "view" anchors all inside one card).
  const seenUrl = new Set<string>();
  const uniqueAnchors = anchors.filter(a => (seenUrl.has(a.abs) ? false : (seenUrl.add(a.abs), true)));
  if (uniqueAnchors.length < 2) return null;

  // 3. For each anchor, walk up to find the closest ancestor with a class that
  //    looks like a listing card (e.g. ".listing-item", ".oglas", ".property-card").
  //    Score class names by how listing-y they sound.
  const cardKeywords = /(listing|oglas|nekretnin|propert|imovin|imobil|estate|stan|kuca|item|card|result|search)/i;

  const findCardAncestor = (el: cheerio.Cheerio<AnyNode>): { selector: string; classNames: string[] } | null => {
    let cur = el.parent();
    let depth = 0;
    while (cur.length && depth < 8) {
      const tag = (cur.get(0) as { tagName?: string } | undefined)?.tagName?.toLowerCase() ?? '';
      const cls = (cur.attr('class') || '').trim();
      if (cls) {
        const classes = cls.split(/\s+/).filter(c => cardKeywords.test(c));
        if (classes.length > 0 && (tag === 'div' || tag === 'article' || tag === 'li' || tag === 'section')) {
          return { selector: `${tag}.${classes[0]}`, classNames: classes };
        }
      }
      cur = cur.parent();
      depth++;
    }
    return null;
  };

  // 4. Tally which selector covers the most anchors → that's the listing card.
  const selectorCounts = new Map<string, number>();
  for (const a of uniqueAnchors) {
    const card = findCardAncestor(a.el);
    if (!card) continue;
    selectorCounts.set(card.selector, (selectorCounts.get(card.selector) ?? 0) + 1);
  }

  let listingItemSelector: string | null = null;
  let bestCount = 0;
  for (const [sel, count] of selectorCounts) {
    if (count > bestCount) { bestCount = count; listingItemSelector = sel; }
  }

  // 5. Fallback: if no class-based match, group anchors by their immediate
  //    parent's tag-path (e.g. "div > div > article") and use that.
  if (!listingItemSelector || bestCount < 2) {
    // Try article tag (semantic listings) or li (list-based grids)
    const articleCount = $('article').length;
    const liInUlCount = $('ul li').length;
    if (articleCount >= 2 && articleCount <= 200) {
      listingItemSelector = 'article';
      bestCount = articleCount;
    } else if (liInUlCount >= 2 && liInUlCount <= 200) {
      // Find a UL whose LIs each contain a listing link
      let bestLi = '';
      let bestLiCount = 0;
      $('ul').each((_, ul) => {
        const lis = $(ul).find('> li');
        let count = 0;
        lis.each((__, li) => {
          if ($(li).find('a[href]').filter((___, a) => looksLikeListingPath(new URL($(a).attr('href') || '', pageUrl).pathname || '')).length) count++;
        });
        if (count > bestLiCount) {
          bestLiCount = count;
          const ulCls = ($(ul).attr('class') || '').split(/\s+/)[0];
          bestLi = ulCls ? `ul.${ulCls} > li` : 'ul > li';
        }
      });
      if (bestLi && bestLiCount >= 2) { listingItemSelector = bestLi; bestCount = bestLiCount; }
    }
  }

  if (!listingItemSelector || bestCount < 2) return null;

  // 6. Now figure out per-card child selectors using the first matched card as a probe.
  const firstCard = $(listingItemSelector).first();
  if (!firstCard.length) return null;

  const probeText = (sel: string): string | undefined => {
    const t = firstCard.find(sel).first().text().trim();
    return t || undefined;
  };

  // Title: most prominent heading inside the card
  let titleSel: string | undefined;
  for (const candidate of ['h1', 'h2', 'h3', 'h4', '[class*="title"]', '[class*="name"]', '[class*="naslov"]']) {
    if (probeText(candidate)) { titleSel = candidate; break; }
  }

  // Price: look for currency symbols/keywords in any child element's text
  let priceSel: string | undefined;
  const priceClassCandidates = ['[class*="price"]', '[class*="cijena"]', '[class*="cena"]', '[class*="preis"]'];
  for (const candidate of priceClassCandidates) {
    if (probeText(candidate)) { priceSel = candidate; break; }
  }
  if (!priceSel) {
    // Fall back: find any descendant whose text contains a currency mark
    firstCard.find('*').each((_, el) => {
      if (priceSel) return;
      const text = $(el).contents().filter((__, n) => n.type === 'text').text().trim();
      if (/[€$£]|EUR\b|RSD\b|HRK\b|BAM\b|RON\b|BGN\b|MKD\b|kn\b/i.test(text) && /\d/.test(text)) {
        const cls = ($(el).attr('class') || '').split(/\s+/)[0];
        const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? 'span';
        priceSel = cls ? `${tag}.${cls}` : tag;
      }
    });
  }

  // Image: first <img> inside the card
  const imageSel = firstCard.find('img').first().length ? 'img|attr:src' : undefined;

  // Description: first paragraph or [class*="desc"]
  let descSel: string | undefined;
  for (const candidate of ['[class*="desc"]', '[class*="opis"]', 'p']) {
    if (probeText(candidate)) { descSel = candidate; break; }
  }

  // 7. Build a sample object from the first card so the wizard can show a preview.
  const linkAnchorInCard = firstCard.find('a[href]').filter((_, a) => {
    const href = $(a).attr('href') || '';
    let pn: string;
    try { pn = new URL(href, pageUrl).pathname; } catch { return false; }
    return looksLikeListingPath(pn);
  }).first();
  const linkHref = linkAnchorInCard.attr('href') || '';
  const linkSelector = linkAnchorInCard.is('a') ? `a[href*="${(() => {
    try { return new URL(linkHref, pageUrl).pathname.split('/').filter(Boolean)[0] ?? ''; } catch { return ''; }
  })()}"]|attr:href` : 'a|attr:href';

  const sample: Record<string, unknown> = {
    title: titleSel ? probeText(titleSel) : undefined,
    price: priceSel ? probeText(priceSel) : undefined,
    description: descSel ? probeText(descSel) : undefined,
    image: imageSel ? firstCard.find('img').first().attr('src') : undefined,
    url: linkHref ? new URL(linkHref, pageUrl).toString() : undefined,
  };

  return {
    selectors: {
      listingItem: listingItemSelector,
      link: linkSelector,
      title: titleSel,
      price: priceSel,
      image: imageSel,
      description: descSel,
    },
    sample,
    count: bestCount,
  };
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

    // 2c. Embedded SPA state (Next.js, Nuxt, window.__INITIAL_STATE__)
    //     Many modern Balkan portals (cityexpert.rs, indomio.rs, etc.) embed their
    //     entire page data as JSON so we can read it without DOM scraping.
    const spaData = extractEmbeddedSpaListings(html);
    if (spaData) {
      const validItems = spaData.items.filter(i => isValidListingItem(i));
      if (validItems.length >= 2) {
        const sample = validItems[0];
        return {
          adapterType: 'jsonFeed',
          adapterConfig: {
            endpoint: url,
            itemsPath: spaData.itemsPath,
            idPath: '$.id',
            urlPath: '$.url',
          },
          fieldMap: buildJsonFieldMap(sample),
          sample,
          hint: `Embedded ${spaData.source} data detected — ${validItems.length} listing(s) found`,
        };
      }
    }

    // 2d. WordPress indicators → probe WP REST
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

  // ── 6. Known Balkan portal profile → then generic HTML card detection ────────
  if (html && typeof html === 'string') {
    // 6a. Check against known-site profiles (nekretnine.hr, 4zida.rs, etc.)
    const profile = findSiteProfile(url);
    if (profile) {
      const $ = cheerio.load(html);
      const cardCount = $(profile.listingItem).length;
      if (cardCount >= 2) {
        // Build a sample from the first card
        const firstCard = $(profile.listingItem).first();
        const pickText = (sel?: string) => sel ? firstCard.find(sel.split('|')[0]).first().text().trim() || undefined : undefined;
        const pickAttr = (sel?: string) => {
          if (!sel) return undefined;
          const [css, attr] = sel.split('|attr:');
          if (!attr) return firstCard.find(css).first().text().trim() || undefined;
          return firstCard.find(css).first().attr(attr) || undefined;
        };
        const rawLink = pickAttr(profile.link);
        const sample: Record<string, unknown> = {
          title: pickText(profile.title),
          price: pickText(profile.price),
          location: pickText(profile.location),
          sqft: pickText(profile.sqft),
          image: pickAttr(profile.image),
          url: rawLink ? (() => { try { return new URL(rawLink, url).toString(); } catch { return rawLink; } })() : undefined,
        };
        return {
          adapterType: 'htmlScrape',
          adapterConfig: {
            indexUrl: url,
            selectors: {
              listingItem: profile.listingItem,
              link: profile.link,
              title: profile.title,
              price: profile.price,
              image: profile.image,
              description: undefined,
              ...(profile.location && { location: profile.location }),
              ...(profile.sqft && { sqft: profile.sqft }),
            },
            ...(profile.nextPageSelector && { nextPageSelector: profile.nextPageSelector }),
            ...(profile.pageParam && { pageParam: profile.pageParam }),
            followDetails: true,
            requestDelayMs: 2000,
            respectRobotsTxt: true,
            maxPages: 5,
          },
          fieldMap: {
            title: 'title',
            price: 'price',
            city: 'location',
            sqft: 'sqft',
            imageUrl: 'image',
            sourceUrl: 'url',
          },
          sample,
          hint: `Known site: ${new URL(url).hostname} — ${cardCount} listing card(s) detected`,
        };
      }
    }

    // 6b. Generic heuristic: find listing-like anchors and identify card container
    const scrape = detectHtmlScrape(html, url);
    if (scrape) {
      return {
        adapterType: 'htmlScrape',
        adapterConfig: {
          indexUrl: url,
          selectors: scrape.selectors,
          followDetails: true,
          requestDelayMs: 2000,
          respectRobotsTxt: true,
          maxPages: 5,
        },
        fieldMap: {
          title: 'title',
          price: 'price',
          description: 'description',
          imageUrl: 'image',
          sourceUrl: 'url',
        },
        sample: scrape.sample,
        hint: `HTML listing page — found ${scrape.count} listing card(s) on the page`,
      };
    }
  }

  // ── Nothing found ────────────────────────────────────────────────────────────
  throw new Error(
    'Could not auto-detect a supported feed format. The site may block automated access. ' +
    'Try pasting a direct RSS, JSON, or Atom feed URL instead of the homepage.'
  );
};
