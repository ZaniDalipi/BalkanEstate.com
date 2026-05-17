/**
 * Extract structured listing data from a detail-page HTML document.
 * Used by the normalizer to enrich data scraped from index/agency pages with
 * the much-richer information typically present on each listing's detail page:
 *
 *   1. JSON-LD            (most authoritative — schema.org RealEstateListing)
 *   2. OpenGraph meta     (og:title, og:image, og:description, product:price:amount)
 *   3. Schema.org microdata via itemprop attributes
 *   4. <meta itemprop> / Twitter cards
 *   5. Image gallery       (img.src, srcset, data-src, og:image array)
 *
 * Only fields that aren't already populated in `base` get filled in, so
 * data extracted from the index card is treated as preferred.
 */
import * as cheerio from 'cheerio';

type Mapped = Record<string, unknown>;

const setIfMissing = (target: Mapped, key: string, value: unknown): void => {
  if (value == null || value === '') return;
  if (target[key] !== undefined && target[key] !== null && target[key] !== '') return;
  target[key] = value;
};

const pushImages = (target: Mapped, urls: string[]): void => {
  if (!urls.length) return;
  const existing = Array.isArray(target.images) ? (target.images as unknown[]) : [];
  const existingUrls = new Set<string>(
    existing
      .map(i => (typeof i === 'string' ? i : (i as { url?: string })?.url))
      .filter((u): u is string => typeof u === 'string')
  );
  const merged = [...existing];
  for (const u of urls) {
    if (!u || existingUrls.has(u)) continue;
    if (u.startsWith('data:')) continue;
    merged.push(u);
    existingUrls.add(u);
  }
  if (merged.length) target.images = merged;
};

const resolveUrl = (base: string, href: string): string => {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
};

/** Walk a JSON-LD node (which may be an array or have @graph) and extract listing-like properties. */
const extractFromJsonLdNode = (node: Record<string, unknown>, base: string, target: Mapped): void => {
  // Resolve @graph wrappers
  if (Array.isArray(node['@graph'])) {
    for (const sub of node['@graph']) {
      if (sub && typeof sub === 'object') extractFromJsonLdNode(sub as Record<string, unknown>, base, target);
    }
    return;
  }
  // Pick whichever schema.org property is meaningful.
  setIfMissing(target, 'title', node.name);
  setIfMissing(target, 'description', node.description);

  const offers = node.offers;
  if (offers && typeof offers === 'object') {
    const o = offers as Record<string, unknown>;
    setIfMissing(target, 'price', o.price ?? o.lowPrice ?? o.highPrice);
    setIfMissing(target, 'priceCurrency', o.priceCurrency);
  } else if (typeof offers === 'string' || typeof offers === 'number') {
    setIfMissing(target, 'price', offers);
  }

  const address = node.address;
  if (address && typeof address === 'object') {
    const a = address as Record<string, unknown>;
    setIfMissing(target, 'address', a.streetAddress);
    setIfMissing(target, 'city', a.addressLocality);
    setIfMissing(target, 'country', a.addressCountry);
    setIfMissing(target, 'postalCode', a.postalCode);
  } else if (typeof address === 'string') {
    setIfMissing(target, 'address', address);
  }

  const geo = node.geo;
  if (geo && typeof geo === 'object') {
    const g = geo as Record<string, unknown>;
    setIfMissing(target, 'lat', g.latitude);
    setIfMissing(target, 'lng', g.longitude);
  }

  const floorSize = node.floorSize;
  if (floorSize && typeof floorSize === 'object') {
    setIfMissing(target, 'sqft', (floorSize as Record<string, unknown>).value);
  }

  setIfMissing(target, 'beds', node.numberOfRooms ?? node.numberOfBedrooms);
  setIfMissing(target, 'baths', node.numberOfBathroomsTotal ?? node.numberOfFullBathrooms);
  setIfMissing(target, 'yearBuilt', node.yearBuilt);
  setIfMissing(target, 'propertyType', node['@type']);

  // Images can be a string, an array of strings, or array of ImageObject.
  const images = node.image;
  const imgUrls: string[] = [];
  if (typeof images === 'string') imgUrls.push(resolveUrl(base, images));
  else if (Array.isArray(images)) {
    for (const im of images) {
      if (typeof im === 'string') imgUrls.push(resolveUrl(base, im));
      else if (im && typeof im === 'object') {
        const u = (im as { url?: unknown }).url ?? (im as { contentUrl?: unknown }).contentUrl;
        if (typeof u === 'string') imgUrls.push(resolveUrl(base, u));
      }
    }
  }
  pushImages(target, imgUrls);
  if (imgUrls.length && !target.imageUrl) target.imageUrl = imgUrls[0];
};

const extractJsonLd = ($: cheerio.CheerioAPI, base: string, target: Mapped): void => {
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).contents().text();
    if (!txt) return;
    try {
      const data = JSON.parse(txt) as unknown;
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item && typeof item === 'object') extractFromJsonLdNode(item as Record<string, unknown>, base, target);
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });
};

const extractOpenGraph = ($: cheerio.CheerioAPI, base: string, target: Mapped): void => {
  const meta = (prop: string): string | undefined => {
    const el = $(`meta[property="${prop}"], meta[name="${prop}"]`).first();
    const v = el.attr('content');
    return v ? v.trim() : undefined;
  };
  setIfMissing(target, 'title', meta('og:title') ?? meta('twitter:title'));
  setIfMissing(target, 'description', meta('og:description') ?? meta('twitter:description'));
  setIfMissing(target, 'price', meta('product:price:amount') ?? meta('og:price:amount'));
  setIfMissing(target, 'priceCurrency', meta('product:price:currency') ?? meta('og:price:currency'));
  setIfMissing(target, 'city', meta('og:locality') ?? meta('place:location:locality'));
  setIfMissing(target, 'country', meta('og:country-name'));
  setIfMissing(target, 'lat', meta('og:latitude') ?? meta('place:location:latitude'));
  setIfMissing(target, 'lng', meta('og:longitude') ?? meta('place:location:longitude'));

  // og:image may appear multiple times — collect all.
  const ogImages: string[] = [];
  $('meta[property="og:image"], meta[property="og:image:url"], meta[property="og:image:secure_url"]').each((_, el) => {
    const c = $(el).attr('content');
    if (c) ogImages.push(resolveUrl(base, c.trim()));
  });
  pushImages(target, ogImages);
  if (ogImages.length && !target.imageUrl) target.imageUrl = ogImages[0];
};

/** Extract microdata via [itemprop] attributes. */
const extractMicrodata = ($: cheerio.CheerioAPI, base: string, target: Mapped): void => {
  const prop = (name: string): string | undefined => {
    const el = $(`[itemprop="${name}"]`).first();
    if (!el.length) return undefined;
    return (el.attr('content') ?? el.attr('href') ?? el.text() ?? '').trim() || undefined;
  };
  setIfMissing(target, 'title', prop('name'));
  setIfMissing(target, 'description', prop('description'));
  setIfMissing(target, 'price', prop('price'));
  setIfMissing(target, 'priceCurrency', prop('priceCurrency'));
  setIfMissing(target, 'address', prop('streetAddress'));
  setIfMissing(target, 'city', prop('addressLocality'));
  setIfMissing(target, 'country', prop('addressCountry'));
  setIfMissing(target, 'lat', prop('latitude'));
  setIfMissing(target, 'lng', prop('longitude'));

  const microImages: string[] = [];
  $('[itemprop="image"]').each((_, el) => {
    const u = $(el).attr('src') ?? $(el).attr('content') ?? $(el).attr('href');
    if (u) microImages.push(resolveUrl(base, u));
  });
  pushImages(target, microImages);
};

/**
 * When the same image appears in multiple resolutions via query params (e.g.
 * ?w=400 and ?w=1200), keep only the largest version to maximise quality.
 */
const deduplicateImageUrls = (urls: string[]): string[] => {
  // Group by the URL with size-related query params stripped.
  const groups = new Map<string, { url: string; score: number }>();
  for (const u of urls) {
    let base = u;
    let score = 0;
    try {
      const parsed = new URL(u);
      // Score by explicit width/height params — prefer larger
      const w = parseInt(parsed.searchParams.get('w') ?? parsed.searchParams.get('width') ?? '0', 10);
      const h = parseInt(parsed.searchParams.get('h') ?? parsed.searchParams.get('height') ?? '0', 10);
      score = w || h;
      // Key = URL without size params
      ['w', 'width', 'h', 'height', 'size', 'thumb', 'resize', 'dim'].forEach(p => parsed.searchParams.delete(p));
      base = parsed.toString();
    } catch { /* keep url as-is */ }
    const existing = groups.get(base);
    if (!existing || score > existing.score) groups.set(base, { url: u, score });
  }
  return Array.from(groups.values()).map(g => g.url);
};

/** Pull every reasonable image URL from <img> tags on the page (with srcset & lazy-load support). */
const extractGalleryImages = ($: cheerio.CheerioAPI, base: string, target: Mapped): void => {
  const found: string[] = [];
  $('img').each((_, el) => {
    const $el = $(el);
    // Try every common lazy-load attr in priority order
    const candidate =
      $el.attr('src') ??
      $el.attr('data-src') ??
      $el.attr('data-lazy-src') ??
      $el.attr('data-original') ??
      $el.attr('data-lazy') ??
      $el.attr('data-image');
    if (candidate) found.push(resolveUrl(base, candidate));

    // srcset: pick the largest
    const srcset = $el.attr('srcset') ?? $el.attr('data-srcset');
    if (srcset) {
      const parts = srcset.split(',').map(p => p.trim());
      let best: { url: string; width: number } | null = null;
      for (const p of parts) {
        const [u, w] = p.split(/\s+/);
        const width = parseInt((w ?? '0').replace(/\D/g, ''), 10) || 0;
        if (!best || width > best.width) best = { url: u, width };
      }
      if (best) found.push(resolveUrl(base, best.url));
    }
  });
  // <source srcset> inside <picture> — prefer the largest descriptor
  $('picture source').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (!srcset) return;
    const parts = srcset.split(',').map(p => p.trim());
    let best: { url: string; width: number } | null = null;
    for (const p of parts) {
      const [u, w] = p.split(/\s+/);
      const width = parseInt((w ?? '0').replace(/\D/g, ''), 10) || 0;
      if (!best || width > best.width) best = { url: u, width };
    }
    if (best) found.push(resolveUrl(base, best.url));
  });

  // Swiper, Fancybox, Slick, Lightbox and other gallery widgets store the
  // full-resolution URL in data attributes on slide/thumbnail wrappers.
  const galleryAttrSelectors = [
    '[data-image]', '[data-src]', '[data-original]', '[data-image-url]',
    '[data-gallery-image]', '[data-photo]', '[data-full]', '[data-full-image]',
    '[data-fancybox]', '[data-fancybox-href]', '[data-lightbox]',
    '[data-swiper-slide-index]', // Swiper slide — pull src from inner <img> instead
    '.swiper-slide img', '.slick-slide img', '.flexslider li img',
    '.gallery-item img', '.gallery-image img', '.fancybox img',
    'a[href$=".jpg"], a[href$=".jpeg"], a[href$=".png"], a[href$=".webp"]',
  ];
  for (const selector of galleryAttrSelectors) {
    $(selector).each((_, el) => {
      const $el = $(el);
      const tag = (el as { tagName?: string }).tagName?.toLowerCase();
      // For anchor tags pointing to images — use href
      if (tag === 'a') {
        const href = $el.attr('href') ?? $el.attr('data-fancybox-href');
        if (href) found.push(resolveUrl(base, href));
        return;
      }
      // For img tags — prefer explicit data attrs, then src
      let url = $el.attr('data-full') ?? $el.attr('data-full-image') ??
        $el.attr('data-src') ?? $el.attr('data-original') ??
        $el.attr('data-image') ?? $el.attr('data-image-url') ??
        $el.attr('src');
      if (!url) {
        const bg = $el.attr('style');
        if (bg) {
          const match = bg.match(/url\(['"]?([^'")\]]+)['"]?\)/i);
          if (match) url = match[1];
        }
      }
      if (url) found.push(resolveUrl(base, url));
    });
  }

  // Also scan for JSON gallery arrays embedded in page scripts (common in WP/custom RE sites)
  $('script:not([src])').each((_, el) => {
    const src = $(el).html() ?? '';
    // Look for arrays of image URLs in JS variables
    const urlPattern = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))["']/gi;
    let m: RegExpExecArray | null;
    while ((m = urlPattern.exec(src)) !== null) {
      found.push(m[1]);
    }
  });

  // Filter out tracking pixels, icons, thumbnails, and non-listing images.
  const meaningful = found.filter((u) => {
    const lower = u.toLowerCase();
    // Skip tracking pixels and 1x1 spacers
    if (/[?&](w|width|h|height)=1\b/.test(lower)) return false;
    // Skip common icon/logo/avatar paths
    if (/(\/icon|\/logo|\/avatar|\/sprite|\/blank|\/pixel|\/spacer|\/placeholder|\/thumb[s]?\/[^/]*[_-]\d{1,3}x\d{1,3})/i.test(lower)) return false;
    // Skip known tracker domains
    if (/(doubleclick|google-analytics|facebook\.net\/tr|pixel\.)/i.test(lower)) return false;
    // Skip very small thumbnail hints in URL parameters
    if (/[?&](size|dim|thumb|resize)=\d{1,3}\b/i.test(lower)) return false;
    return true;
  });

  // Deduplicate: prefer higher-resolution variant when a URL appears in multiple
  // sizes via query params (e.g. ?w=400 vs ?w=1200 — keep ?w=1200).
  const deduped = deduplicateImageUrls(found.filter((u) => {
    const lower = u.toLowerCase();
    if (/[?&](w|width|h|height)=1\b/.test(lower)) return false;
    if (/(\/icon|\/logo|\/avatar|\/sprite|\/blank|\/pixel|\/spacer|\/placeholder|\/thumb[s]?\/[^/]*[_-]\d{1,3}x\d{1,3})/i.test(lower)) return false;
    if (/(doubleclick|google-analytics|facebook\.net\/tr|pixel\.)/i.test(lower)) return false;
    if (/[?&](size|dim|thumb|resize)=\d{1,3}\b/i.test(lower)) return false;
    return true;
  }));
  pushImages(target, deduped);
  void meaningful; // meaningful kept for potential future use
};

const extractStructuredPriceFromHtml = ($: cheerio.CheerioAPI, target: Mapped): void => {
  if (target.price) return;

  // 1. Known data-* attributes and CSS class selectors (priority order)
  const selectors = [
    '[data-price]', '[data-list-price]', '[data-asking-price]', '[data-amount]',
    '[data-sale-price]', '[data-regular-price]', '[data-final-price]',
    '.price', '.listing-price', '.property-price', '[itemprop="price"]',
    '.asking-price', '.price-tag', '.price-value', '.price-amount',
    '[class*="asking"]', '[class*="price-box"]', '[class*="price-wrap"]',
    '[class*="sale-price"]', '[class*="offer-price"]', '[class*="list-price"]',
  ];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const val = el.attr('data-price') ?? el.attr('data-list-price') ??
                  el.attr('data-asking-price') ?? el.attr('data-amount') ??
                  el.attr('data-sale-price') ?? el.attr('content') ?? el.text();
      if (val && /[\d€$£]/.test(val) && val.trim().length < 60) {
        target.price = val.trim();
        return;
      }
    }
  }

  // 2. Scan all data-* attributes for price-like values
  const allElements = $('*').toArray();
  for (const el of allElements) {
    const attrs = (el as any).attribs || {};
    for (const [key, value] of Object.entries(attrs)) {
      if (!key.startsWith('data-')) continue;
      if (!value || typeof value !== 'string') continue;
      // Price pattern: number + currency (€, $, EUR, etc.)
      if (/^\d[\d,.\s]*(?:€|USD|\$|EUR|GBP|£|CHF|RON|BGN|HRK|BAM|RSD|ALL)/.test(value)) {
        target.price = value;
        return;
      }
    }
  }

  // 3. Look for price in aria-label or title attributes (common on modern sites)
  const ariaElements = $('[aria-label*="price"], [aria-label*="Price"], [title*="price"], [title*="Price"]').toArray();
  for (const el of ariaElements) {
    const label = $(el).attr('aria-label') || $(el).attr('title') || '';
    if (/\d[\d,.\s]*(?:€|USD|\$|EUR)/.test(label)) {
      target.price = label;
      return;
    }
  }

  // 4. Keyword-prefixed price in visible text: "Price: 250.000 €", "Cijena: 85 000 EUR"
  const PRICE_LABEL_RE = /(?:price|cijena|cena|cjena|çmimi|preis|prix|prezzo|pret|ár|τιμή|цена)\s*[:–-]\s*((?:€|EUR|USD|\$|£|ALL|Lek|RSD|BAM|KM|MKD|RON|BGN|лв)?\s*[\d][\d\s.,]*[\d]\s*(?:€|EUR|USD|\$|£|ALL|Lek|RSD|BAM|KM|MKD|RON|BGN|лв)?)/i;
  const leafNodes = $('p, li, span, div, td, th, strong, b, h3, h4, h5').toArray();
  for (const el of leafNodes) {
    const $el = $(el);
    if ($el.children('p, div, ul, ol, table').length) continue; // skip containers
    const text = $el.text().replace(/\s+/g, ' ').trim();
    if (text.length < 3 || text.length > 200) continue;
    const m = text.match(PRICE_LABEL_RE);
    if (m?.[1]) {
      target.price = m[1].trim();
      return;
    }
  }
};

/** Well-known Balkan/European cities → canonical name (keyed by slug for URL matching). */
const KNOWN_CITIES: Record<string, string> = {
  // Albania
  'tirana': 'Tirana', 'tirane': 'Tirana', 'tiranes': 'Tirana',
  'durres': 'Durrës', 'durresi': 'Durrës', 'durresso': 'Durrës',
  'vlore': 'Vlorë', 'vlora': 'Vlorë', 'shkoder': 'Shkodër',
  'elbasan': 'Elbasan', 'korce': 'Korçë', 'fier': 'Fier',
  'berat': 'Berat', 'lushnje': 'Lushnjë', 'pogradec': 'Pogradec',
  'gjirokaster': 'Gjirokastër', 'sarand': 'Sarandë',
  // Kosovo
  'pristina': 'Pristina', 'prishtina': 'Pristina', 'prizren': 'Prizren',
  'peja': 'Pejë', 'gjakova': 'Gjakovë', 'mitrovica': 'Mitrovicë',
  // North Macedonia
  'skopje': 'Skopje', 'bitola': 'Bitola', 'ohrid': 'Ohrid',
  'tetovo': 'Tetovo', 'kumanovo': 'Kumanovo',
  // Montenegro
  'podgorica': 'Podgorica', 'niksic': 'Nikšić', 'budva': 'Budva',
  'kotor': 'Kotor', 'hercegnovi': 'Herceg Novi', 'bar': 'Bar',
  'tivat': 'Tivat', 'ulcinj': 'Ulcinj',
  // Bosnia and Herzegovina
  'sarajevo': 'Sarajevo', 'mostar': 'Mostar', 'banjaluka': 'Banja Luka',
  'tuzla': 'Tuzla', 'zenica': 'Zenica',
  // Serbia
  'beograd': 'Belgrade', 'belgrade': 'Belgrade', 'novisad': 'Novi Sad',
  'nis': 'Niš', 'kragujevac': 'Kragujevac', 'subotica': 'Subotica',
  // Croatia
  'zagreb': 'Zagreb', 'split': 'Split', 'rijeka': 'Rijeka',
  'osijek': 'Osijek', 'dubrovnik': 'Dubrovnik', 'zadar': 'Zadar',
  'pula': 'Pula', 'varazdin': 'Varaždin',
  // Bulgaria
  'sofia': 'Sofia', 'plovdiv': 'Plovdiv', 'varna': 'Varna',
  'burgas': 'Burgas', 'stara zagora': 'Stara Zagora',
  // Romania
  'bucharest': 'Bucharest', 'bucuresti': 'Bucharest', 'cluj': 'Cluj-Napoca',
  'timisoara': 'Timișoara', 'iasi': 'Iași', 'constanta': 'Constanța',
  // Greece
  'athens': 'Athens', 'athina': 'Athens', 'thessaloniki': 'Thessaloniki',
  'patras': 'Patras', 'heraklion': 'Heraklion',
  // Slovenia
  'ljubljana': 'Ljubljana', 'maribor': 'Maribor',
};

/** Country slug → canonical name. */
const KNOWN_COUNTRIES: Record<string, string> = {
  'albania': 'Albania', 'al': 'Albania', 'shqiperia': 'Albania', 'shqiperi': 'Albania',
  'kosovo': 'Kosovo', 'kosova': 'Kosovo',
  'northmacedonia': 'North Macedonia', 'macedonia': 'North Macedonia', 'mk': 'North Macedonia',
  'montenegro': 'Montenegro', 'crna-gora': 'Montenegro', 'crna_gora': 'Montenegro',
  'bosniaandherzegovina': 'Bosnia and Herzegovina', 'bih': 'Bosnia and Herzegovina', 'ba': 'Bosnia and Herzegovina',
  'serbia': 'Serbia', 'srbija': 'Serbia',
  'croatia': 'Croatia', 'hrvatska': 'Croatia',
  'bulgaria': 'Bulgaria', 'bulgarija': 'Bulgaria',
  'romania': 'Romania', 'ro': 'Romania',
  'greece': 'Greece', 'ellada': 'Greece', 'gr': 'Greece',
  'slovenia': 'Slovenia', 'si': 'Slovenia',
  'turkey': 'Turkey', 'turkiye': 'Turkey',
};

const extractStructuredLocationFromHtml = ($: cheerio.CheerioAPI, target: Mapped, baseUrl = ''): void => {
  // 1. itemprop attributes (most structured)
  if (!target.address) {
    const el = $('[itemprop="streetAddress"]').first();
    if (el.length) target.address = el.text().trim();
  }
  if (!target.city) {
    const el = $('[itemprop="addressLocality"]').first();
    if (el.length) target.city = el.text().trim();
  }
  if (!target.country) {
    const el = $('[itemprop="addressCountry"]').first();
    if (el.length) target.country = el.text().trim();
  }

  // 1b. Geo meta tags (<meta name="geo.placename" content="Tirana, Albania">)
  const geoPlacename = $('meta[name="geo.placename"]').attr('content')?.trim();
  if (geoPlacename) {
    const parts = geoPlacename.split(',').map(p => p.trim()).filter(Boolean);
    if (!target.city && parts[0]) target.city = parts[0];
    if (!target.country && parts[1]) target.country = parts[1];
  }
  if (!target.country) {
    const geoRegion = $('meta[name="geo.region"]').attr('content')?.trim();
    if (geoRegion) target.country = geoRegion.split('-')[0]?.trim() || geoRegion;
  }
  if (!target.lat) {
    const icbm = $('meta[name="ICBM"]').attr('content')?.trim();
    if (icbm) {
      const [lat, lng] = icbm.split(',').map(s => s.trim());
      if (lat) target.lat = lat;
      if (lng) target.lng = lng;
    }
  }

  // 2. data-* attributes
  if (!target.city) {
    const el = $('[data-city]').first();
    if (el.length) target.city = (el.attr('data-city') ?? '').trim() || undefined;
  }
  if (!target.lat) {
    const el = $('[data-lat]').first();
    if (el.length) target.lat = el.attr('data-lat');
  }
  if (!target.lng) {
    const el = $('[data-lng],[data-lon]').first();
    if (el.length) target.lng = el.attr('data-lng') ?? el.attr('data-lon');
  }

  // 3. CSS class selectors for location chips/headers common on Balkan RE sites
  if (!target.city) {
    const locationSelectors = [
      '[class*="location-city"]', '[class*="city-name"]', '[class*="property-city"]',
      '[class*="listing-city"]', '[class*="grad"]', '[class*="lokacija"]',
      '.location .city', '.property-location .city',
      '[data-field="city"]', '[data-field="location"]',
    ];
    for (const sel of locationSelectors) {
      const el = $(sel).first();
      const text = el.text().trim();
      if (text && text.length < 80 && text.length > 1) {
        target.city = text.split(/[,/]/)[0].trim();
        break;
      }
    }
  }

  // 4. Location header chips — e.g. "Shijak Albania" in a single element.
  //    Deliberately excludes h1/h2/title — those are almost always the property
  //    title, not the address, and including them caused the title to be stored
  //    in the address field on sites like Century 21 Albania.
  if (!target.city || !target.country) {
    const chipSelectors = [
      '[class*="location"]', '[class*="address"]', '[class*="adresa"]',
      '[class*="property-address"]', '[class*="listing-address"]',
      '[class*="property-location"]', '[class*="listing-location"]',
      '[class*="breadcrumb"]', '.breadcrumb', 'nav.breadcrumb',
      '[class*="place"]', '[class*="geo"]', '[class*="region"]',
      'nav .location', 'header .location', 'footer .location',
    ];
    outer: for (const sel of chipSelectors) {
      const elements = $(sel).toArray();
      for (const el of elements) {
        if (target.city && target.country) break outer;
        const $el = $(el);
        // For headers/titles, include up to 5 children; for other selectors, keep tight
        const tagName = ((el as any).tagName || '').toLowerCase();
        const maxChildren = /^h[1-6]$|title/i.test(tagName) ? 5 : 3;
        if ($el.children().length > maxChildren) continue;
        let text = $el.text().replace(/\s+/g, ' ').trim();
        // Skip if too long or too short
        if (!text || text.length < 2 || text.length > 180) continue;
        // Remove common noise (word count, currency, numbers at start/end)
        text = text.replace(/^\s*\d+\s*(property|listing|properties|m²|sqm|beds?|m\d)?[,\s]*/, '')
                   .replace(/\s*(\d+\s*(?:property|listing|properties))?$/, '')
                   .trim();

        // Try splitting by comma first (most reliable)
        const commaIdx = text.indexOf(',');
        if (commaIdx > 0 && commaIdx < text.length - 1) {
          const part1 = text.slice(0, commaIdx).trim();
          const part2 = text.slice(commaIdx + 1).trim();
          if (!target.city && part1.length < 60) target.city = part1;
          if (!target.country && part2.length < 60) target.country = part2;
          if (target.city && target.country) break outer;
          continue;
        }

        // Try breadcrumb separators
        if (/\s*\/\s+|\s*>\s*|\s*»\s*|\s*·\s*/.test(text)) {
          const parts = text.split(/\s*(?:\/|>|»|·)\s+/).filter(p => p.length > 0);
          if (parts.length >= 2) {
            if (!target.city) target.city = parts[0];
            if (!target.country && parts.length >= 2) target.country = parts[parts.length - 1];
            if (target.city && target.country) break outer;
            continue;
          }
        }

        // Try space-separated (last word likely country, rest is city)
        const words = text.split(/\s+/);
        if (words.length === 2) {
          if (!target.city) target.city = words[0];
          if (!target.country) target.country = words[1];
          if (target.city && target.country) break outer;
        } else if (words.length > 2) {
          // For "8700 m² Land in Xhafzotaj, Durres" → extract last two words as city/country
          const lastWord = words[words.length - 1];
          const secondLast = words[words.length - 2];
          if (!target.address) target.address = text;
          if (!target.city && secondLast.length < 50) target.city = secondLast;
          if (!target.country && lastWord.length < 50) target.country = lastWord;
        }
      }
      if (target.city) break;
    }
  }

  // 4b. Page <title> — often contains "City, Country" or "in City" patterns
  if (!target.city || !target.country) {
    const titleText = $('title').first().text().replace(/\s+/g, ' ').trim();
    if (titleText) {
      // "Apartment in Tirana, Albania — Agency" or "Villa Tirana Albania"
      const inMatch = titleText.match(/\bin\s+([A-ZČŠŽĆĐ][a-zA-ZčšžćđÀ-ÿ\s]{1,30}?)(?:\s*,\s*([A-ZČŠŽĆĐ][a-zA-ZčšžćđÀ-ÿ\s]{1,30}))?(?:\s*[-|·–—|]|$)/);
      if (inMatch) {
        if (!target.city && inMatch[1]?.trim()) target.city = inMatch[1].trim();
        if (!target.country && inMatch[2]?.trim()) target.country = inMatch[2].trim();
      }
      // "Apartment, Tirana, Albania" — last two comma-separated segments before separator
      if (!target.city || !target.country) {
        const segments = titleText.split(/\s*[-–—|·]\s*/)[0].split(',').map(s => s.trim()).filter(Boolean);
        if (segments.length >= 3) {
          const last = segments[segments.length - 1];
          const secondLast = segments[segments.length - 2];
          if (!target.country && last.length < 40 && /^[A-ZČŠŽĆĐ]/.test(last)) target.country = last;
          if (!target.city && secondLast.length < 40 && /^[A-ZČŠŽĆĐ]/.test(secondLast)) target.city = secondLast;
        }
      }
    }
  }

  // 4c. URL path — extract city/country from slug segments like /albania/tirana/
  if ((!target.city || !target.country) && baseUrl) {
    try {
      const pathParts = new URL(baseUrl).pathname.toLowerCase()
        .split('/')
        .map(p => p.replace(/[-_]/g, ''))
        .filter(Boolean);
      for (const part of pathParts) {
        if (!target.country) {
          const country = KNOWN_COUNTRIES[part];
          if (country) target.country = country;
        }
        if (!target.city) {
          const city = KNOWN_CITIES[part];
          if (city) target.city = city;
        }
        if (target.city && target.country) break;
      }
    } catch { /* ignore invalid URLs */ }
  }

  // 4d. Keyword-prefixed location in visible text:
  //     "Location: Tirana, Albania", "Lokacija: Zagreb", "Grad: Beograd"
  if (!target.city) {
    const LOC_LABEL_RE = /(?:location|lokacija|ciudad|lage|emplacement|posizione|τοποθεσία|vendndodhja|locatie|helyszín|адреса|адрес|lokacija|grad|city|address)\s*[:–-]\s*([^,\n\r<]{2,60}?)(?:\s*,\s*([^,\n\r<]{2,40}?))?(?:\s*$|\s*[<\n])/i;
    const visibleEls = $('p, li, span, div, td, th').toArray();
    for (const el of visibleEls) {
      const $el = $(el);
      if ($el.children('p, div, ul, ol, table').length) continue;
      const text = $el.text().replace(/\s+/g, ' ').trim();
      if (text.length < 5 || text.length > 300) continue;
      const m = text.match(LOC_LABEL_RE);
      if (m?.[1]) {
        const city = m[1].trim().replace(/[.,;]$/, '');
        if (city.length < 60 && city.length > 1) {
          if (!target.city) target.city = city;
          if (!target.country && m[2]?.trim()) target.country = m[2].trim().replace(/[.,;]$/, '');
          break;
        }
      }
    }
  }

  // 5. Property ID — aggressive scanning of all possible sources
  if (!target.propertyId) {
    // 5a. Known data-* attributes (property-id, listing-id, ref, etc.)
    const idAttrs = ['data-property-id', 'data-listing-id', 'data-id', 'data-ref', 'data-sku', 'data-code'];
    for (const attr of idAttrs) {
      const el = $(`[${attr}]`).first();
      const val = el.attr(attr)?.trim();
      if (val && val.length >= 2 && val.length <= 50 && !/^https?:\/\/|^\/|^\d{4}-\d{2}/.test(val)) {
        target.propertyId = val;
        break;
      }
    }
  }

  // 5b. Scan ALL data-* attributes for ID-like values (if not found by name)
  if (!target.propertyId) {
    const allElements = $('*').toArray();
    for (const el of allElements) {
      const attrs = (el as any).attribs || {};
      for (const [key, value] of Object.entries(attrs)) {
        if (!key.startsWith('data-')) continue;
        if (!value || typeof value !== 'string') continue;
        // Skip obvious non-IDs: URLs, dates, colors, CSS, long strings
        if (/^https?:|^\d{4}-\d{2}|^#[0-9A-F]{3,6}$|^(px|em|rem|%|rgba)/.test(value)) continue;
        // ID-like: alphanumeric, hyphen, underscore, max 50 chars
        if (/^[A-Za-z0-9\-_]+$/.test(value) && value.length >= 2 && value.length <= 50) {
          // Prefer attributes with "id", "ref", "code" in their name
          if (/id|ref|code|sku|listing|property/.test(key.toLowerCase())) {
            target.propertyId = value;
            break;
          }
        }
      }
      if (target.propertyId) break;
    }
  }

  // 5c. Text pattern search: "Property ID: Eon140479", "Ref #123", etc.
  if (!target.propertyId) {
    const idPattern = /(?:property\s*id|listing\s*id|ref(?:erence)?|reference\s*no|ref\s*(?:no|#|id)?|id\s*(?:oglasa|nekretnine|ponude|imobil|proneese)|objektnummer|sifra\s*oglasa|number|code|sku)[:\s#]*([A-Za-z0-9\-_]+)/i;
    const leafElements = $('*').toArray();
    for (const el of leafElements) {
      if (target.propertyId) break;
      const $el = $(el);
      if ($el.children().length > 0) continue;
      const text = $el.text().trim();
      if (text.length < 3 || text.length > 200) continue;
      const m = text.match(idPattern);
      if (m && m[1] && m[1].length >= 2 && m[1].length <= 50) {
        target.propertyId = m[1];
      }
    }
  }
};

/**
 * Extract fields from Balkan/European real estate label-value block patterns.
 * Covers Croatian, Bosnian, Serbian (Latin+Cyrillic), Slovenian, Macedonian,
 * Bulgarian, Albanian, Romanian, Greek, Hungarian, German, French, Italian,
 * and English — matching labels as displayed on detail pages.
 */
const extractBalkanLabelValues = ($: cheerio.CheerioAPI, baseUrl: string, target: Mapped): void => {
  // Strip separators and non-letter/digit chars; keep all Unicode scripts
  // (Cyrillic, Greek, Latin with diacritics, etc.).
  const normLabel = (s: string): string =>
    s.toLowerCase()
      .replace(/[\s\-_./:()|]+/g, '')
      .replace(/[^\p{L}\d]/gu, '')
      .trim();

  // Maps normalised label → canonical target field.
  const LABEL_MAP: Record<string, string> = {
    // ── Price ──────────────────────────────────────────────────────────────
    // HR/BA
    'cijena': 'price', 'cjena': 'price', 'prodajnacijjena': 'price', 'cijenaponude': 'price',
    // SR Latin / SL
    'cena': 'price', 'prodajnacena': 'price', 'prodajnicena': 'price',
    // SR/MK/BG Cyrillic
    'цена': 'price', 'продажнацена': 'price', 'продажна': 'price',
    // RO
    'pret': 'price', 'pretul': 'price', 'costul': 'price', 'pretzul': 'price',
    // AL
    'çmimi': 'price', 'cmimi': 'price', 'çmimiishitjes': 'price', 'cmimiishitjes': 'price',
    // GR
    'τιμή': 'price', 'τιμη': 'price', 'τιμήπώλησης': 'price', 'τιμηπωλησης': 'price',
    // HU
    'ár': 'price', 'ar': 'price', 'eladásiár': 'price', 'eladasiar': 'price',
    // DE
    'preis': 'price', 'kaufpreis': 'price', 'verkaufspreis': 'price', 'mietpreis': 'price', 'kaltmiete': 'price',
    // FR
    'prix': 'price', 'prixdevente': 'price', 'prixdachat': 'price', 'loyer': 'price',
    // IT
    'prezzo': 'price', 'prezzovendita': 'price', 'affitto': 'price',
    // EN
    'price': 'price', 'askingprice': 'price', 'listprice': 'price', 'salesprice': 'price', 'rentalprice': 'price',

    // ── Area / Floor size ─────────────────────────────────────────────────
    // HR/BA/SR Latin
    'površina': 'sqft', 'povrsina': 'sqft', 'površinainterijera': 'sqft', 'povrsinainterijera': 'sqft',
    'stambenapovrš': 'sqft', 'stambena': 'sqft', 'stambenapovrsi': 'sqft',
    // SR/MK Cyrillic
    'површина': 'sqft', 'квадратура': 'sqft', 'стамбена': 'sqft',
    // BG Cyrillic
    'площ': 'sqft', 'жилищнаплощ': 'sqft', 'застроена': 'sqft', 'ползваема': 'sqft',
    // RO
    'suprafata': 'sqft', 'suprafaţa': 'sqft', 'suprafatautila': 'sqft', 'suprafatautil': 'sqft',
    'suprafataconstruita': 'sqft', 'suprafatabrutа': 'sqft',
    // AL
    'sipërfaqja': 'sqft', 'siperfaqja': 'sqft', 'sipërfaqe': 'sqft', 'siperfaqe': 'sqft',
    // GR
    'εμβαδόν': 'sqft', 'εμβαδον': 'sqft', 'εμβαδό': 'sqft',
    // HU
    'alapterület': 'sqft', 'alapterulet': 'sqft', 'hasznosalapterület': 'sqft',
    // DE
    'fläche': 'sqft', 'flache': 'sqft', 'wohnfläche': 'sqft', 'wohnflache': 'sqft',
    'nutzfläche': 'sqft', 'nutzflache': 'sqft',
    // FR
    'surface': 'sqft', 'surfacehabitable': 'sqft', 'superficiehabitable': 'sqft',
    // IT
    'superficie': 'sqft', 'superficieabitabile': 'sqft', 'superficieutile': 'sqft',
    // EN
    'area': 'sqft', 'floorarea': 'sqft', 'livingarea': 'sqft', 'internalarea': 'sqft',
    'grossarea': 'sqft', 'interiorarea': 'sqft', 'usablearea': 'sqft', 'netarea': 'sqft',
    'size': 'sqft', 'propertysize': 'sqft', 'interiorsize': 'sqft',

    // ── Plot / Land area ──────────────────────────────────────────────────
    // HR/BA/SR Latin
    'površinaokućnice': 'plotSqm', 'površinaokucnice': 'plotSqm', 'okućnica': 'plotSqm', 'okucnica': 'plotSqm',
    'površinaparcele': 'plotSqm', 'površinazem': 'plotSqm',
    // SR/MK Cyrillic
    'површинапарцеле': 'plotSqm', 'плац': 'plotSqm', 'парцела': 'plotSqm',
    // BG
    'площназемя': 'plotSqm', 'дворна': 'plotSqm', 'парцел': 'plotSqm',
    // RO
    'suprafataterean': 'plotSqm', 'suprafatatotala': 'plotSqm',
    // DE
    'grundfläche': 'plotSqm', 'grundflache': 'plotSqm', 'grundstücksfläche': 'plotSqm',
    // EN
    'plotarea': 'plotSqm', 'landarea': 'plotSqm', 'plotsize': 'plotSqm',
    'lotsize': 'plotSqm', 'groundarea': 'plotSqm', 'yardsize': 'plotSqm',

    // ── Bedrooms ──────────────────────────────────────────────────────────
    // HR/BA/SR Latin
    'spavaćesobe': 'beds', 'spavacesobe': 'beds', 'sobe': 'beds', 'spavaona': 'beds', 'brojsoba': 'beds',
    // SR Cyrillic
    'спаваћесобе': 'beds', 'собе': 'beds', 'бројсоби': 'beds', 'спаваоница': 'beds',
    // MK Cyrillic
    'соби': 'beds', 'броисоби': 'beds', 'спални': 'beds',
    // BG Cyrillic
    'спалня': 'beds', 'стаи': 'beds', 'броистаи': 'beds',
    // SL
    'spalnice': 'beds', 'številosob': 'beds',
    // RO
    'dormitoare': 'beds', 'camere': 'beds', 'camerededormit': 'beds', 'numarcamere': 'beds',
    // AL
    'dhomagjumi': 'beds', 'numridhomave': 'beds', 'dhoma': 'beds',
    // GR
    'υπνοδωμάτια': 'beds', 'υπνοδωματια': 'beds', 'κρεβατοκάμαρες': 'beds',
    // HU
    'hálószoba': 'beds', 'haloszoba': 'beds', 'szobák': 'beds', 'szobak': 'beds',
    // DE
    'schlafzimmer': 'beds', 'zimmeranzahl': 'beds',
    // FR
    'chambre': 'beds', 'chambres': 'beds', 'chambresàcoucher': 'beds',
    // IT
    'camera': 'beds', 'cameradaletto': 'beds',
    // EN
    'bedrooms': 'beds', 'bedroom': 'beds', 'beds': 'beds', 'numberofbedrooms': 'beds',

    // ── Bathrooms ─────────────────────────────────────────────────────────
    // HR/BA/SR
    'kupatilo': 'baths', 'kupatila': 'baths', 'kupaonica': 'baths', 'toalet': 'baths',
    // SR Cyrillic
    'купатило': 'baths', 'тоалет': 'baths',
    // BG
    'баня': 'baths', 'бани': 'baths',
    // RO
    'baie': 'baths', 'bai': 'baths',
    // AL
    'banjo': 'baths', 'tualet': 'baths',
    // GR
    'μπάνιο': 'baths', 'μπανιο': 'baths', 'λουτρό': 'baths',
    // HU
    'fürdőszoba': 'baths', 'furdoszoba': 'baths',
    // DE
    'badezimmer': 'baths', 'bäder': 'baths',
    // FR
    'salledebain': 'baths', 'salledebains': 'baths',
    // IT
    'bagno': 'baths', 'bagni': 'baths',
    // EN
    'bathrooms': 'baths', 'bathroom': 'baths', 'baths': 'baths',

    // ── Location / City ───────────────────────────────────────────────────
    // HR/BA/SR Latin
    'lokacija': 'city', 'mjesto': 'city', 'grad': 'city', 'adresa': 'city', 'općina': 'city', 'opcina': 'city',
    // SR Cyrillic
    'локација': 'city', 'место': 'city', 'град': 'city', 'адреса': 'city', 'општина': 'city',
    // MK Cyrillic
    'локациjа': 'city',
    // BG Cyrillic
    'местоположение': 'city', 'населеноместо': 'city', 'квартал': 'city', 'адрес': 'city',
    // SL
    'kraj': 'city',
    // RO
    'locatie': 'city', 'locaţie': 'city', 'localitate': 'city', 'oras': 'city', 'oraş': 'city',
    // AL
    'vendndodhja': 'city', 'qyteti': 'city',
    // GR
    'τοποθεσία': 'city', 'τοποθεσια': 'city', 'πόλη': 'city', 'πολη': 'city', 'περιοχή': 'city',
    // HU
    'helyszín': 'city', 'helyszin': 'city', 'város': 'city', 'varos': 'city', 'cím': 'city',
    // DE
    'lage': 'city', 'ort': 'city', 'stadt': 'city', 'standort': 'city', 'lageort': 'city',
    // FR
    'emplacement': 'city', 'ville': 'city', 'adresse': 'city',
    // IT
    'posizione': 'city', 'città': 'city', 'citta': 'city', 'indirizzo': 'city',
    // EN
    'location': 'city', 'city': 'city', 'address': 'city', 'town': 'city', 'district': 'city',

    // ── Property type ─────────────────────────────────────────────────────
    'vrstanekretnine': 'propertyType', 'vrstaponude': 'propertyType', 'tipnekretnine': 'propertyType',
    'врстанекретнине': 'propertyType', 'тип': 'propertyType', 'видимот': 'propertyType',
    'tipproprietate': 'propertyType', 'tipologie': 'propertyType',
    'immobilienart': 'propertyType', 'objektart': 'propertyType',
    'type': 'propertyType', 'propertytype': 'propertyType', 'typedebien': 'propertyType',

    // ── Year built ────────────────────────────────────────────────────────
    'godinaizgradnje': 'yearBuilt', 'godišnjaizgradnje': 'yearBuilt', 'godgradnje': 'yearBuilt',
    'годинаградње': 'yearBuilt', 'годнастрояване': 'yearBuilt',
    'anconstructie': 'yearBuilt', 'anconstruire': 'yearBuilt',
    'vitacostruizione': 'yearBuilt', 'annodiristruzione': 'yearBuilt',
    'baujahr': 'yearBuilt', 'építésiév': 'yearBuilt', 'epitesiév': 'yearBuilt',
    'annéedeconstruction': 'yearBuilt',
    'yearbuilt': 'yearBuilt', 'built': 'yearBuilt', 'constructionyear': 'yearBuilt',

    // ── Floor ─────────────────────────────────────────────────────────────
    'kat': 'floor', 'sprat': 'floor', 'etaža': 'floor', 'etaza': 'floor', 'etažnost': 'floor',
    'спрат': 'floor', 'кат': 'floor', 'етаж': 'floor',
    'etaj': 'floor', 'korridor': 'floor',
    'stockwerk': 'floor', 'etage': 'floor', 'obergeschoss': 'floor',
    'emelet': 'floor', 'piano': 'floor',
    'floor': 'floor', 'floornumber': 'floor', 'storey': 'floor',

    // ── Distance to sea ───────────────────────────────────────────────────
    'udaljenostodmora': 'distanceToSea', 'udaljenostdoumora': 'distanceToSea', 'odmorja': 'distanceToSea',
    'удаљеностодмора': 'distanceToSea', 'разстояниедоморе': 'distanceToSea',
    'distantafatademare': 'distanceToSea', 'distantadalamare': 'distanceToSea',
    'distanzevomeer': 'distanceToSea', 'meeresnähe': 'distanceToSea',
    'distancetosea': 'distanceToSea', 'distancefromsea': 'distanceToSea', 'distancetothesea': 'distanceToSea',
    'απόστασηαπόθάλασσα': 'distanceToSea', 'tengerközelség': 'distanceToSea',

    // ── Living rooms ──────────────────────────────────────────────────────
    // HR/BA/SR Latin
    'dnevnasoba': 'livingRooms', 'dnevnasobe': 'livingRooms', 'brojosobna': 'livingRooms',
    'salon': 'livingRooms', 'boravak': 'livingRooms', 'boravišnisob': 'livingRooms',
    // SR/MK Cyrillic
    'дневнасоба': 'livingRooms', 'дневнасобе': 'livingRooms', 'дневни': 'livingRooms',
    // BG
    'дневна': 'livingRooms', 'хол': 'livingRooms',
    // SL
    'dnevnaoba': 'livingRooms', 'dnevnisobor': 'livingRooms',
    // RO
    'cameradeziua': 'livingRooms', 'cameradestat': 'livingRooms', 'salonro': 'livingRooms',
    // AL
    'dhomaejeteses': 'livingRooms', 'dhomaeqeteses': 'livingRooms',
    // GR
    'καθιστικό': 'livingRooms', 'καθιστικο': 'livingRooms', 'σαλόνι': 'livingRooms',
    // HU
    'nappali': 'livingRooms', 'nappaliszoba': 'livingRooms',
    // DE
    'wohnzimmer': 'livingRooms', 'wohnraum': 'livingRooms',
    // FR
    'séjour': 'livingRooms', 'sejour': 'livingRooms', 'salonsejourou': 'livingRooms',
    // IT
    'soggiorno': 'livingRooms', 'salone': 'livingRooms',
    // EN
    'livingroom': 'livingRooms', 'livingrooms': 'livingRooms', 'sittingroom': 'livingRooms',
    'lounge': 'livingRooms', 'receptionrooms': 'livingRooms',

    // ── Total floors in building ──────────────────────────────────────────
    // HR/BA/SR Latin
    'ukupnokatova': 'totalFloors', 'ukupnospratova': 'totalFloors', 'ukupnoetaža': 'totalFloors',
    'ukupnoetaza': 'totalFloors', 'brojetaza': 'totalFloors', 'katnost': 'totalFloors',
    // SR Cyrillic
    'укупноспратова': 'totalFloors', 'укупноетажа': 'totalFloors', 'катност': 'totalFloors',
    // BG
    'броетажи': 'totalFloors', 'общоетажи': 'totalFloors',
    // RO
    'numaretaje': 'totalFloors', 'totaletaje': 'totalFloors',
    // DE
    'gesamtstockwerke': 'totalFloors', 'gesamtgeschosse': 'totalFloors', 'anzahlstockwerke': 'totalFloors',
    // EN
    'totalfloors': 'totalFloors', 'numberoffloors': 'totalFloors', 'floorsintotal': 'totalFloors',
    'buildingfloors': 'totalFloors', 'totalstoreys': 'totalFloors',

    // ── Parking ───────────────────────────────────────────────────────────
    // HR/BA/SR Latin
    'parking': 'parking', 'parkiralište': 'parking', 'parkiraliste': 'parking',
    'parkirnomjesto': 'parking', 'garaža': 'parking', 'garaza': 'parking', 'garažno': 'parking',
    'garazno': 'parking',
    // SR Cyrillic
    'паркинг': 'parking', 'гаража': 'parking', 'паркиралиште': 'parking',
    // BG
    'паркомясто': 'parking', 'гараж': 'parking',
    // RO
    'parcare': 'parking', 'garage': 'parking', 'locparcare': 'parking',
    // DE
    'stellplatz': 'parking', 'garagenstellplatz': 'parking', 'tiefgarage': 'parking',
    // EN
    'parkingspaces': 'parking', 'parkingspots': 'parking', 'garageplaces': 'parking',

    // ── Furnishing ────────────────────────────────────────────────────────
    // HR/BA/SR Latin
    'namještenost': 'furnishing', 'namjestenost': 'furnishing', 'oprema': 'furnishing',
    'namješteno': 'furnishing', 'namjesteno': 'furnishing', 'namještaj': 'furnishing',
    // SR Cyrillic
    'намештеност': 'furnishing', 'намештено': 'furnishing',
    // BG
    'обзавеждане': 'furnishing', 'обзаведен': 'furnishing',
    // RO
    'mobilare': 'furnishing', 'mobilat': 'furnishing', 'dotare': 'furnishing',
    // AL
    'mobilim': 'furnishing', 'mobiluar': 'furnishing',
    // GR
    'επίπλωση': 'furnishing', 'επιπλωση': 'furnishing', 'επιπλωμένο': 'furnishing',
    // HU
    'bútorozottság': 'furnishing', 'butorozottsag': 'furnishing',
    // DE
    'einrichtung': 'furnishing', 'möbliert': 'furnishing', 'moebliert': 'furnishing',
    'möblierung': 'furnishing',
    // FR
    'ameublement': 'furnishing', 'meublé': 'furnishing', 'meuble': 'furnishing',
    // IT
    'arredamento': 'furnishing', 'arredato': 'furnishing',
    // EN
    'furnishing': 'furnishing', 'furnished': 'furnishing', 'furnishings': 'furnishing',

    // ── Heating type ──────────────────────────────────────────────────────
    // HR/BA/SR Latin
    'grijanje': 'heatingType', 'vrstagrija': 'heatingType', 'tipgrijanja': 'heatingType',
    'centralnogrijanje': 'heatingType', 'centralnogrianj': 'heatingType',
    // SR Cyrillic
    'грејање': 'heatingType', 'централногрејање': 'heatingType',
    // SL
    'ogrevanje': 'heatingType', 'sistemogrevanja': 'heatingType',
    // BG
    'отопление': 'heatingType', 'видотопление': 'heatingType',
    // RO
    'incalzire': 'heatingType', 'tipincalzire': 'heatingType', 'sistemincalzire': 'heatingType',
    // AL
    'ngrohje': 'heatingType', 'sistemngrohjes': 'heatingType',
    // GR
    'θέρμανση': 'heatingType', 'θερμανση': 'heatingType',
    // HU
    'fűtés': 'heatingType', 'futes': 'heatingType', 'fűtésmód': 'heatingType',
    // DE
    'heizung': 'heatingType', 'heizungsart': 'heatingType', 'heizungstyp': 'heatingType',
    // FR
    'chauffage': 'heatingType', 'typedechauffage': 'heatingType',
    // IT
    'riscaldamento': 'heatingType', 'tipodiriscaldamento': 'heatingType',
    // EN
    'heating': 'heatingType', 'heatingtype': 'heatingType', 'heatingsystem': 'heatingType',

    // ── Condition / state ─────────────────────────────────────────────────
    // HR/BA/SR Latin
    'stanje': 'condition', 'stanjenekretni': 'condition', 'stanjeuređen': 'condition',
    // SR Cyrillic
    'стање': 'condition', 'стањенекретнине': 'condition',
    // SL
    'stanjepremoženja': 'condition',
    // BG
    'състояние': 'condition', 'видсъстояние': 'condition',
    // RO
    'stare': 'condition', 'stareproprietate': 'condition', 'stareclad': 'condition',
    // AL
    'gjendja': 'condition', 'gjendjaepronesise': 'condition',
    // GR
    'κατάσταση': 'condition', 'κατασταση': 'condition',
    // HU
    'állapot': 'condition', 'allapot': 'condition', 'ingatlanállapota': 'condition',
    // DE
    'zustand': 'condition', 'objektzustand': 'condition', 'zustandsbeschreibung': 'condition',
    // FR
    'état': 'condition', 'etat': 'condition', 'étatdubien': 'condition',
    // IT
    'condizione': 'condition', 'stato': 'condition', 'statoimmobile': 'condition',
    // EN
    'status': 'condition', 'propertystatus': 'condition',
    'condition': 'condition', 'propertycondition': 'condition', 'buildingcondition': 'condition',

    // ── View type ─────────────────────────────────────────────────────────
    // HR/BA/SR Latin
    'pogled': 'viewType', 'poglednamore': 'viewType', 'poglednagore': 'viewType',
    'poglednagrad': 'viewType', 'tipapogleda': 'viewType',
    // SR Cyrillic
    'поглед': 'viewType', 'погледнаморе': 'viewType',
    // BG
    'изглед': 'viewType', 'гледка': 'viewType', 'видизглед': 'viewType',
    // RO
    'vedere': 'viewType', 'tipvedere': 'viewType',
    // DE
    'aussicht': 'viewType', 'ausblick': 'viewType', 'blickrichtung': 'viewType',
    // FR
    'vue': 'viewType', 'typdevue': 'viewType',
    // IT
    'vista': 'viewType', 'tipodivista': 'viewType',
    // EN
    'view': 'viewType', 'viewtype': 'viewType', 'propertyview': 'viewType',

    // ── Energy rating ─────────────────────────────────────────────────────
    // HR/BA/SR Latin
    'energetskirazred': 'energyRating', 'energetskiceptifikat': 'energyRating',
    'energetskaklasa': 'energyRating',
    // SR Cyrillic
    'енергетскиразред': 'energyRating',
    // BG
    'енергийнакласа': 'energyRating', 'енергетиченрейтинг': 'energyRating',
    // RO
    'clasaenergetica': 'energyRating', 'certificatenergetica': 'energyRating',
    // DE
    'energieklasse': 'energyRating', 'energieausweis': 'energyRating', 'effizienzklasse': 'energyRating',
    // FR
    'classeenergetique': 'energyRating', 'diagnosticpe': 'energyRating',
    // IT
    'classeenergetica': 'energyRating', 'certificazioneenergetica': 'energyRating',
    // EN
    'energyrating': 'energyRating', 'energyclass': 'energyRating', 'epcrating': 'energyRating',
    'energyefficiency': 'energyRating',

    // ── Orientation ───────────────────────────────────────────────────────
    // HR/BA/SR Latin
    'orijentacija': 'orientation', 'stransvijetstrane': 'orientation',
    // SR Cyrillic
    'оријентација': 'orientation', 'страна': 'orientation',
    // BG
    'изложение': 'orientation', 'ориентация': 'orientation',
    // DE
    'ausrichtung': 'orientation', 'himmelsrichtung': 'orientation',
    // EN
    'orientation': 'orientation', 'facing': 'orientation', 'aspect': 'orientation',

    // ── Distance to center ────────────────────────────────────────────────
    // HR/BA/SR Latin
    'udaljenostodcentra': 'distanceToCenter', 'udaljenostdocentra': 'distanceToCenter',
    'odcentragrada': 'distanceToCenter',
    // SR Cyrillic
    'удаљеностодцентра': 'distanceToCenter',
    // BG
    'разстояниедоцентъра': 'distanceToCenter',
    // RO
    'distantafatadecentru': 'distanceToCenter',
    // DE
    'distanzzumzentrum': 'distanceToCenter', 'entfernungzumzentrum': 'distanceToCenter',
    // EN
    'distancetocenter': 'distanceToCenter', 'distancetocitycentre': 'distanceToCenter',
    'distancefromcenter': 'distanceToCenter',

    // ── Property / listing ID ─────────────────────────────────────────────
    // EN
    'propertyid': 'propertyId', 'listingid': 'propertyId', 'referenceid': 'propertyId',
    'refid': 'propertyId', 'ref': 'propertyId', 'id': 'propertyId', 'mlsid': 'propertyId',
    // HR/BA/SR
    'šifraoglasa': 'propertyId', 'sifraoglasa': 'propertyId', 'idoglasa': 'propertyId',
    'referenca': 'propertyId', 'oznaka': 'propertyId', 'sifra': 'propertyId',
    // SR Cyrillic
    'шифраогласа': 'propertyId', 'ознака': 'propertyId', 'шифра': 'propertyId',
    // AL
    'idproneesise': 'propertyId',
    // DE
    'objektnummer': 'propertyId', 'immobilienid': 'propertyId', 'referenznummer': 'propertyId',
    // FR
    'referencebien': 'propertyId', 'numerobien': 'propertyId',
    // IT
    'codiceimmobile': 'propertyId', 'riferimento': 'propertyId',

    // ── Listing type (sale vs rent) ───────────────────────────────────────
    // HR/BA/SR
    'vrstaprodaje': 'listingType', 'tipoglasa': 'listingType',
    'transakcija': 'listingType', 'nacinprodaje': 'listingType',
    // SR Cyrillic
    'врстапродаjе': 'listingType', 'трансакциjа': 'listingType',
    // EN
    'dealtype': 'listingType', 'transactiontype': 'listingType', 'offertype': 'listingType',
    'listingtype': 'listingType',
    // DE
    'angebotsart': 'listingType', 'transaktionsart': 'listingType',
    // AL
    'llojioferte': 'listingType', 'transaksion': 'listingType',
  };

  const applyLabelValue = (labelRaw: string, valueRaw: string): void => {
    if (!labelRaw || !valueRaw) return;
    const key = normLabel(labelRaw);
    const field = LABEL_MAP[key];
    if (!field) return;

    const v = valueRaw.trim();
    if (!v) return;

    if (field === 'price') {
      // Override if no price yet, OR if the existing value is a bare integer < 1000
      // (likely a dot-thousands price that JSON already collapsed: "620.000" → 620).
      const existing = target.price;
      const existingIsCollapsed = typeof existing === 'number' && existing < 1000;
      if (!existing || existingIsCollapsed) target.price = v;
    } else if (field === 'sqft' && !target.sqft) {
      // Extract the leading numeric part, using the same separator logic as
      // normalizePriceNumeric so "1.500 m²" → 1500 but "180.5 m²" → 180.5.
      const m = v.match(/(\d[\d.,\s]*\d|\d)/);
      if (m) {
        const raw = m[1].replace(/ /g, ' ').trim();
        // Dot-thousands: "1.500" → if 3 digits after last dot and no comma, strip dot
        const stripped = /^\d{1,3}(\.\d{3})+$/.test(raw)
          ? raw.replace(/\./g, '')
          : raw.replace(/\s/g, '').replace(',', '.');
        const n = parseFloat(stripped);
        if (n >= 10 && n <= 50_000) target.sqft = n;
      }
    } else if (field === 'plotSqm' && !target.plotSqm) {
      const m = v.match(/(\d[\d.,\s]*\d|\d)/);
      if (m) {
        const raw = m[1].replace(/ /g, ' ').trim();
        const stripped = /^\d{1,3}(\.\d{3})+$/.test(raw)
          ? raw.replace(/\./g, '')
          : raw.replace(/\s/g, '').replace(',', '.');
        const n = parseFloat(stripped);
        if (n >= 1 && n <= 500_000) target.plotSqm = n;
      }
    } else if (field === 'beds' && !target.beds) {
      const n = parseInt(v, 10);
      if (n >= 1 && n <= 20) target.beds = n;
    } else if (field === 'baths' && !target.baths) {
      const n = parseInt(v, 10);
      if (n >= 1 && n <= 10) target.baths = n;
    } else if (field === 'city' && !target.city) {
      target.city = v.split(/[,/]/)[0].trim();
      if (!target.address) target.address = v;
    } else if (field === 'propertyType' && !target.propertyType) {
      target.propertyType = v;
    } else if (field === 'yearBuilt' && !target.yearBuilt) {
      const n = parseInt(v, 10);
      if (n >= 1800 && n <= 2100) target.yearBuilt = n;
    } else if (field === 'floor' && !target.floor) {
      target.floor = v;
    } else if (field === 'distanceToSea' && !target.distanceToSea) {
      const n = parseDistanceValue(v);
      if (n != null) target.distanceToSea = n;
    } else if (field === 'livingRooms' && !target.livingRooms) {
      const n = parseInt(v, 10);
      if (n >= 1 && n <= 5) target.livingRooms = n;
    } else if (field === 'totalFloors' && !target.totalFloors) {
      const n = parseInt(v, 10);
      if (n >= 1 && n <= 100) target.totalFloors = n;
    } else if (field === 'parking' && !target.parking) {
      const n = parseInt(v, 10);
      if (n >= 1 && n <= 10) target.parking = n;
    } else if (field === 'furnishing' && !target.furnishing) {
      target.furnishing = mapFurnishingValue(v);
    } else if (field === 'heatingType' && !target.heatingType) {
      target.heatingType = mapHeatingValue(v);
    } else if (field === 'condition' && !target.condition) {
      target.condition = mapConditionValue(v);
    } else if (field === 'viewType' && !target.viewType) {
      target.viewType = mapViewValue(v);
    } else if (field === 'energyRating' && !target.energyRating) {
      const m = v.match(/\b([A-G][+]?)\b/);
      if (m) target.energyRating = m[1].toUpperCase();
    } else if (field === 'orientation' && !target.orientation) {
      target.orientation = mapOrientationValue(v);
    } else if (field === 'distanceToCenter' && !target.distanceToCenter) {
      const n = parseDistanceValue(v);
      if (n != null) target.distanceToCenter = n;
    } else if (field === 'propertyId' && !target.propertyId) {
      // Store the external listing ID if it looks reasonable (not a long URL/hash).
      if (v.length <= 50 && !/^https?:\/\//.test(v)) target.propertyId = v;
    } else if (field === 'listingType' && !target.listingType) {
      const lv = v.toLowerCase();
      if (/\b(sale|prodaj|shitj|vanzar|πωλ|eladó|verkauf|kauf|продаж)\b/i.test(lv)) target.listingType = 'sale';
      else if (/\b(rent|najam|qira|chirie|ενοικ|kiadó|miete|наем|кирија)\b/i.test(lv)) target.listingType = 'rent';
    }
  };

  /** Parse a distance string like "500m", "1.2 km", "800 metara" → number in metres. */
  const parseDistanceValue = (v: string): number | null => {
    const m = v.match(/(\d[\d.,\s]*\d|\d)\s*(km|m\b|mi\b|km\b|kilomet|meter|metar|metre)/i);
    if (!m) {
      const plain = v.match(/(\d[\d.,\s]*\d|\d)/);
      if (plain) {
        const n = parseFloat(plain[1].replace(/[\s.]/g, '').replace(',', '.'));
        if (n >= 1 && n <= 100_000) return n;
      }
      return null;
    }
    const rawNum = parseFloat(m[1].replace(/[\s]/g, '').replace(',', '.'));
    const unit = m[2].toLowerCase();
    const metres = /km|kilomet/i.test(unit) ? rawNum * 1000 : rawNum;
    if (metres >= 1 && metres <= 200_000) return metres;
    return null;
  };

  const mapFurnishingValue = (v: string): string | undefined => {
    const l = v.toLowerCase();
    if (/\b(fully.?furn|kompletno|potpu(no|njen)|namješteno|opreml|vollmöbl|complet|arredato|meublé)\b/i.test(l)) return 'furnished';
    if (/\b(semi|djelomič|teilmöbl|partiel|parzialmente|félbúto)\b/i.test(l)) return 'semi-furnished';
    if (/\b(unfurn|nije|nenamy|bez\s*nam|ohne.?möb|non.?meub|non.?arred|bútorozatlan)\b/i.test(l)) return 'unfurnished';
    if (/\b(furn|namješten|namešten|opremljen|möbliert|meublé|arredato|bútorozot)\b/i.test(l)) return 'furnished';
    return undefined;
  };

  const mapHeatingValue = (v: string): string | undefined => {
    const l = v.toLowerCase();
    if (/\b(central|district|daljinsko|centralno|fernwärme|téléchauf)\b/i.test(l)) return 'central';
    if (/\b(electr|elek|struj|elektr|elektro|électr|eletric)\b/i.test(l)) return 'electric';
    if (/\b(gas|gaz|plin)\b/i.test(l)) return 'gas';
    if (/\b(oil|mazut|loži|heiz[öo]l|fioul|gasoil)\b/i.test(l)) return 'oil';
    if (/\b(heat.?pump|topl[oi]n[sa]\s*pumpa|wärmepumpe|pompe.?chaleur)\b/i.test(l)) return 'heat-pump';
    if (/\b(solar|solarno|solaire)\b/i.test(l)) return 'solar';
    if (/\b(wood|drv[ao]|bois|legna|holz|biomass|peć)\b/i.test(l)) return 'wood';
    return undefined;
  };

  const mapConditionValue = (v: string): string | undefined => {
    const l = v.toLowerCase();
    if (/\b(new|novo|novo?gradnja|neubau|neuf|nuovo)\b/i.test(l)) return 'new';
    if (/\b(excellent|odlič|izvrs|ausgezeich|excell|eccellente|kiváló)\b/i.test(l)) return 'excellent';
    if (/\b(good|dobr[ao]|gut|bon|buono|jó)\b/i.test(l)) return 'good';
    if (/\b(fair|srednje|prihvatl|befriedi|passable|discreto)\b/i.test(l)) return 'fair';
    if (/\b(renovat|needs.?work|za.?renovir|umbaubedürf|rénov|da.?ristruttur|felújítand)\b/i.test(l)) return 'needs-renovation';
    return undefined;
  };

  const mapViewValue = (v: string): string | undefined => {
    const l = v.toLowerCase();
    if (/\b(sea|more|meer|mer|mare|tenger|θάλ|deniz)\b/i.test(l)) return 'sea';
    if (/\b(mountain|planin|berg|montagne|montagna|hegy)\b/i.test(l)) return 'mountain';
    if (/\b(city|grad|stadt|ville|città|città|város)\b/i.test(l)) return 'city';
    if (/\b(park|parque|parc|parco)\b/i.test(l)) return 'park';
    if (/\b(garden|vrt|garten|jardin|giardino|kert)\b/i.test(l)) return 'garden';
    if (/\b(street|ulica|straße|rue|strada|utca)\b/i.test(l)) return 'street';
    return undefined;
  };

  const mapOrientationValue = (v: string): string | undefined => {
    const l = v.toLowerCase().replace(/\s+/g, '');
    if (/\b(northeast|severoistok|nordost|nordest)\b/i.test(l)) return 'northEast';
    if (/\b(northwest|severozapad|nordwest|nordovest)\b/i.test(l)) return 'northWest';
    if (/\b(southeast|jugoistok|südost|sudest)\b/i.test(l)) return 'southEast';
    if (/\b(southwest|jugozapad|südwest|sudovest)\b/i.test(l)) return 'southWest';
    if (/\b(north|sever|sjever|nord|nord|север)\b/i.test(l)) return 'north';
    if (/\b(south|jug|sud|sud|юг)\b/i.test(l)) return 'south';
    if (/\b(east|istok|ost|est|восток)\b/i.test(l)) return 'east';
    if (/\b(west|zapad|west|ovest|запад)\b/i.test(l)) return 'west';
    return undefined;
  };

  // Pattern 1: <dt>Label</dt><dd>Value</dd>
  $('dl dt, dl th').each((_, el) => {
    applyLabelValue($(el).text().trim(), $(el).next('dd, td').text().trim());
  });

  // Pattern 2: table rows <tr><th>Label</th><td>Value</td></tr>
  $('tr').each((_, el) => {
    const cells = $(el).find('th, td');
    if (cells.length >= 2) {
      applyLabelValue($(cells[0]).text().trim(), $(cells[1]).text().trim());
    }
  });

  // Pattern 3: sibling label/value elements
  const labelSelectors = [
    '[class*="label"]:not(label)', '[class*="naziv"]', '[class*="opis-polja"]',
    '[class*="field-label"]', '[class*="prop-label"]', '[class*="info-label"]',
    '[class*="detail-label"]', '[class*="spec-label"]', '[class*="attr-label"]',
    '[class*="feature-label"]', '[class*="property-label"]',
  ];
  for (const sel of labelSelectors) {
    $(sel).each((_, el) => {
      const label = $(el).text().trim();
      const valueEl = $(el).next();
      const value = valueEl.text().trim()
        || $(el).siblings('[class*="value"],[class*="vrijednost"],[class*="field-value"],[class*="prop-value"],[class*="info-value"],[class*="detail-value"]').first().text().trim();
      applyLabelValue(label, value);
    });
  }

  // Pattern 4: icon-box / feature-item grids (label + value as sibling children)
  const boxSelectors = [
    '[class*="info-box"]', '[class*="property-feature"]', '[class*="detail-item"]',
    '[class*="listing-detail"]', '[class*="spec-item"]', '[class*="feature-item"]',
    '[class*="attr-item"]', '[class*="attribute-item"]', '[class*="param-item"]',
    '[class*="characteristic"]', '[class*="property-info"]', '[class*="prop-item"]',
  ];
  for (const sel of boxSelectors) {
    $(sel).each((_, el) => {
      const texts: string[] = [];
      $(el).children().each((__, ch) => {
        const t = $(ch).text().trim();
        if (t) texts.push(t);
      });
      if (texts.length >= 2) {
        // Try both orderings since some sites put label first, others last
        applyLabelValue(texts[texts.length - 1], texts[0]);
        applyLabelValue(texts[0], texts[texts.length - 1]);
      }
    });
  }

  // Pattern 5: scan for "Label: Value" text in spans/divs/paragraphs
  $('span, div, p, li').each((_, el) => {
    const $el = $(el);
    // Skip elements that have children (only look at leaf text)
    if ($el.children().length > 1) return;
    const text = $el.text().trim();
    const colonIdx = text.indexOf(':');
    if (colonIdx > 0 && colonIdx < text.length - 1 && colonIdx < 40) {
      const label = text.slice(0, colonIdx).trim();
      const value = text.slice(colonIdx + 1).trim();
      if (label && value && label.length < 40) applyLabelValue(label, value);
    }
  });

  void baseUrl;
};

/**
 * Extract beds and baths from data-attributes and CSS classes that appear on
 * modern real estate sites where the count is stored in a widget attribute
 * rather than plain text (e.g. <span data-bedrooms="3"> or <div class="rooms">3</div>).
 */
const extractStructuredBedsAndBaths = ($: cheerio.CheerioAPI, target: Mapped): void => {
  // ── Beds ──────────────────────────────────────────────────────────────────
  if (!target.beds) {
    // data-* attributes
    const bedAttrs = ['data-bedrooms', 'data-beds', 'data-rooms', 'data-num-rooms',
      'data-num-bedrooms', 'data-bedroom-count', 'data-room-count'];
    for (const attr of bedAttrs) {
      const el = $(`[${attr}]`).first();
      if (el.length) {
        const n = parseInt(el.attr(attr) ?? '', 10);
        if (n >= 1 && n <= 20) { target.beds = n; break; }
      }
    }
  }
  if (!target.beds) {
    // CSS class selectors — extract the numeric text content
    const bedSelectors = [
      '.bedrooms .count, .bedrooms .value, .bedrooms .num',
      '.rooms .count, .rooms .value, .rooms-count',
      '.property-rooms, .listing-rooms',
      '[class*="bedrooms"] [class*="count"], [class*="bedrooms"] [class*="value"]',
      '[class*="rooms"] [class*="count"], [class*="rooms"] [class*="value"]',
      '[class*="sobe"] [class*="broj"], [class*="sobe"] [class*="count"]',
    ];
    for (const sel of bedSelectors) {
      const el = $(sel).first();
      if (el.length) {
        const n = parseInt(el.text().trim(), 10);
        if (n >= 1 && n <= 20) { target.beds = n; break; }
      }
    }
  }

  // ── Baths ─────────────────────────────────────────────────────────────────
  if (!target.baths) {
    const bathAttrs = ['data-bathrooms', 'data-baths', 'data-num-bathrooms', 'data-bathroom-count'];
    for (const attr of bathAttrs) {
      const el = $(`[${attr}]`).first();
      if (el.length) {
        const n = parseInt(el.attr(attr) ?? '', 10);
        if (n >= 1 && n <= 10) { target.baths = n; break; }
      }
    }
  }
  if (!target.baths) {
    const bathSelectors = [
      '.bathrooms .count, .bathrooms .value, .bathrooms .num',
      '.baths .count, .baths .value, .baths-count',
      '[class*="bathrooms"] [class*="count"], [class*="bathrooms"] [class*="value"]',
      '[class*="kupatilo"] [class*="count"], [class*="kupatilo"] [class*="value"]',
      '[class*="bath"] [class*="count"], [class*="bath"] [class*="value"]',
    ];
    for (const sel of bathSelectors) {
      const el = $(sel).first();
      if (el.length) {
        const n = parseInt(el.text().trim(), 10);
        if (n >= 1 && n <= 10) { target.baths = n; break; }
      }
    }
  }

  // ── Area from data attributes ─────────────────────────────────────────────
  if (!target.sqft) {
    const areaAttrs = ['data-area', 'data-sqm', 'data-size', 'data-floor-area', 'data-surface'];
    for (const attr of areaAttrs) {
      const el = $(`[${attr}]`).first();
      if (el.length) {
        const n = parseFloat(el.attr(attr) ?? '');
        if (n >= 10 && n <= 50_000) { target.sqft = n; break; }
      }
    }
  }
};

/**
 * Smart text extraction with strict context. Only fills target fields that
 * weren't already populated by JSON-LD/OG/microdata (the more reliable sources).
 *
 * Conservative on purpose: we'd rather miss a field than fabricate one. False
 * positives have a real cost — they end up as wrong data in the listings page.
 */
const extractSmartFieldsFromText = ($: cheerio.CheerioAPI, target: Mapped): void => {
  // Strip noise (navigation, scripts, styles, footer) before scanning so we
  // don't pick up "20 results", "5 stars", site-wide phone numbers, etc.
  const $clone = cheerio.load($.html());
  $clone('nav, header, footer, script, style, noscript, .menu, .navigation, .breadcrumb, .header, .footer, .nav, .ads, .advert, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();

  // Prefer the main content area; fall back to body if no main is identified.
  const mainScope = $clone('main, article, [itemtype*="Product"], [itemtype*="Place"], [class*="listing"], [class*="property"], [id*="listing"], [id*="property"]').first();
  const scope = mainScope.length ? mainScope : $clone('body');

  const textContent = scope
    .text()
    .replace(/\s+/g, ' ')
    .trim();

  if (!textContent || textContent.length < 20) return;

  // Helper: parse a numeric string and validate against a sane range.
  const parseRanged = (s: string, min: number, max: number, allowDecimals = false): number | null => {
    const cleaned = allowDecimals ? s.replace(',', '.') : s.replace(/[.,\s]/g, '');
    const n = allowDecimals ? parseFloat(cleaned) : parseInt(cleaned, 10);
    if (!Number.isFinite(n) || n < min || n > max) return null;
    return n;
  };

  // Smart price extraction — currency must be adjacent to a sufficiently large number.
  if (target.price == null || target.price === '') {
    const pricePatterns = [
      /(?:€|EUR|USD|\$|£|GBP|CHF|RSD|HRK|kn|MKD|ден|BAM|KM|RON|BGN|лв\.?|ALL|Lek|HUF|Ft|TRY|TL|PLN|CZK|SEK|NOK|DKK)\s*([\d][\d.,\s]*[\d](?:\s*[KMB])?)(?!\d)/i,
      /(?<!\d)([\d][\d.,\s]*[\d](?:\s*[KMB])?)\s*(?:€|EUR|USD|\$|£|GBP|CHF|RSD|HRK|kn|MKD|ден|BAM|KM|RON|BGN|лв\.?|ALL|Lek|HUF|Ft|TRY|TL|PLN|CZK|SEK|NOK|DKK)\b/i,
    ];
    for (const re of pricePatterns) {
      const m = textContent.match(re);
      if (!m) continue;
      const numStr = m[1].replace(/[^\d.,KMB]/gi, '');
      const num = parseFloat(numStr.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
      if (!Number.isFinite(num) || num < 100 || num > 100_000_000) continue;
      target.price = m[0].trim();
      break;
    }
  }

  // Beds — require word boundary, reject anything outside 1..15.
  // Prefer "spavaće sobe" (sleeping rooms = bedrooms) over bare "sobe" (rooms).
  if (target.beds == null || target.beds === '') {
    const m = textContent.match(
      /(?<![.\d])(\d{1,2})\s*(?:bed(?:room)?s?|spava[cć][ae]\s+sobe?|soba|sobi|sobe|chambre[s]?|habitaci[oó]n(?:es)?|zimmer|schlafzimmer)\b/i
    );
    if (m) {
      const n = parseRanged(m[1], 1, 15);
      if (n != null) target.beds = n;
    }
  }

  // Baths — full words only; `wc` is too prone to false matches.
  if (target.baths == null || target.baths === '') {
    const m = textContent.match(
      /(?<![.\d])(\d{1,2})\s*(?:bath(?:room)?s?|kupatil[ao]?|toilets?|salle\s+de\s+bain|badezimmer|ba[nñ]os?)\b/i
    );
    if (m) {
      const n = parseRanged(m[1], 1, 10);
      if (n != null) target.baths = n;
    }
  }

  // Area — require explicit m² / m2 / sqm unit and avoid letter-prefixed false hits.
  if (target.sqft == null || target.sqft === '') {
    const m = textContent.match(
      /(?<![A-Za-z])(\d{2,5}(?:[.,]\d{1,2})?)\s*(?:m²|m2|sqm|sq\.?\s*m\.?|square\s*meters?|qm|kvadrata?)\b/i
    );
    if (m) {
      const n = parseRanged(m[1], 10, 50_000, true);
      if (n != null) target.sqft = n;
    }
  }

  // Living rooms — explicit phrase only.
  if (target.livingRooms == null || target.livingRooms === '') {
    const m = textContent.match(
      /(?<![.\d])(\d{1,2})\s*(?:living\s+rooms?|sitting\s+rooms?|dnevn[ai]\s+sob[ae]|wohnzimmer|salon)s?\b/i
    );
    if (m) {
      const n = parseRanged(m[1], 1, 5);
      if (n != null) target.livingRooms = n;
    }
  }

  // Parking — explicit "parking" or "garage" with a count, not a free-floating number.
  if (target.parking == null || target.parking === '') {
    const m = textContent.match(
      /(?<![.\d])(\d{1,2})\s*(?:parking\s+(?:spots?|spaces?|places?)|parking\s+lots?|parkir(?:ali[sš]ta?|no\s+mjesto)|garage[s]?|garaž[ae]|stellpl[aä]tze?)\b/i
    );
    if (m) {
      const n = parseRanged(m[1], 1, 10);
      if (n != null) target.parking = n;
    }
  }
};

/**
 * Main entry point. Mutates `target` in-place with any fields it can extract
 * from the supplied detail-page HTML. Returns the same object for chaining.
 */
export const enrichFromDetailHtml = (
  html: string,
  baseUrl: string,
  target: Mapped
): Mapped => {
  if (!html || typeof html !== 'string') return target;
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return target;
  }
  // Order matters: JSON-LD → OG → microdata → label blocks → data-attributes →
  // gallery images → structured CSS patterns → smart text (lowest priority).
  extractJsonLd($, baseUrl, target);
  extractOpenGraph($, baseUrl, target);
  extractMicrodata($, baseUrl, target);
  extractBalkanLabelValues($, baseUrl, target);
  extractStructuredBedsAndBaths($, target);
  extractGalleryImages($, baseUrl, target);
  extractStructuredPriceFromHtml($, target);
  extractStructuredLocationFromHtml($, target, baseUrl);
  extractSmartFieldsFromText($, target);
  return target;
};
