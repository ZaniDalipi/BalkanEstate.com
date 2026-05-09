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
  // Also <source srcset> inside <picture>
  $('picture source').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      const first = srcset.split(',')[0]?.trim().split(/\s+/)[0];
      if (first) found.push(resolveUrl(base, first));
    }
  });

  // Extract from common gallery container patterns (div with data-image, background-image, etc.)
  const gallerySelectors = [
    '[data-image]',
    '[data-src]',
    '[data-original]',
    '[data-image-url]',
    '[data-gallery-image]',
    '[data-photo]',
  ];
  for (const selector of gallerySelectors) {
    $(selector).each((_, el) => {
      const $el = $(el);
      let url = $el.attr('data-image') ?? $el.attr('data-src') ?? $el.attr('data-original') ?? $el.attr('data-image-url');
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

  pushImages(target, found);
};

const extractStructuredPriceFromHtml = ($: cheerio.CheerioAPI, target: Mapped): void => {
  if (target.price) return;
  // Look for common price displays in HTML
  const selectors = ['[data-price]', '[data-list-price]', '[data-asking-price]', '.price', '.listing-price', '[itemprop="price"]'];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const val = el.attr('data-price') ?? el.attr('data-list-price') ?? el.attr('data-asking-price') ?? el.text();
      if (val) {
        target.price = val.trim();
        return;
      }
    }
  }
};

const extractStructuredLocationFromHtml = ($: cheerio.CheerioAPI, target: Mapped): void => {
  // Extract address/city/country from structured elements if not already present
  if (!target.address) {
    const addrEl = $('[itemprop="streetAddress"]').first();
    if (addrEl.length) target.address = addrEl.text().trim();
  }
  if (!target.city) {
    const cityEl = $('[itemprop="addressLocality"]').first();
    if (cityEl.length) target.city = cityEl.text().trim();
  }
  if (!target.country) {
    const countryEl = $('[itemprop="addressCountry"]').first();
    if (countryEl.length) target.country = countryEl.text().trim();
  }
};

/**
 * Smart text extraction: Look for beds, baths, sqft, and price patterns
 * in the page text. Useful for sites without structured data.
 */
const extractSmartFieldsFromText = ($: cheerio.CheerioAPI, target: Mapped): void => {
  // Collect all text from the page, prioritizing visible content
  const textContent = $('h1, h2, h3, .price, .info, .details, [data-price], [data-beds], [data-baths], [data-area], body')
    .text()
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ');

  // Only scan if we have reasonable text content
  if (!textContent || textContent.length < 20) return;

  // Smart price extraction
  if (!target.price) {
    const priceMatch = textContent.match(
      /(?:price|cost|asking|€|EUR|\$|USD|RSD|kn|HRK)[:\s]*\s*([€$]?\s*[\d.,]+\s*(?:€|EUR|USD|RSD|kn|HRK)?)/i
    );
    if (priceMatch && priceMatch[1]) {
      target.price = priceMatch[1].trim();
    }
  }

  // Smart beds extraction
  if (!target.beds) {
    const bedsMatch = textContent.match(
      /(\d+)\s*(?:bed(?:room)?s?|soba|sobi|sobe|chambre|habitación|zimmer|chambers)/i
    );
    if (bedsMatch && bedsMatch[1]) {
      const num = parseInt(bedsMatch[1], 10);
      if (num > 0 && num <= 20) target.beds = num;
    }
  }

  // Smart baths extraction
  if (!target.baths) {
    const bathsMatch = textContent.match(
      /(\d+)\s*(?:bath(?:room)?s?|kupatil|wc|bathroom|salle\s+de\s+bain|badezimmer|toilets?)/i
    );
    if (bathsMatch && bathsMatch[1]) {
      const num = parseInt(bathsMatch[1], 10);
      if (num > 0 && num <= 10) target.baths = num;
    }
  }

  // Smart sqft/area extraction
  if (!target.sqft) {
    const areaMatch = textContent.match(
      /(\d+(?:[.,]\d+)?)\s*(?:m²|m2|sqm|sq\s*m|square\s*meter|quadrat|qm|superficie|površina)/i
    );
    if (areaMatch && areaMatch[1]) {
      const num = parseFloat(areaMatch[1].replace(',', '.'));
      if (num > 0 && num < 100000) target.sqft = num;
    }
  }

  // Smart living rooms extraction
  if (!target.livingRooms) {
    const roomsMatch = textContent.match(
      /(\d+)\s*(?:living\s+room|salon|dnevna|dnevni|sitting\s+room|wohnzimmer)/i
    );
    if (roomsMatch && roomsMatch[1]) {
      const num = parseInt(roomsMatch[1], 10);
      if (num > 0 && num <= 10) target.livingRooms = num;
    }
  }

  // Smart parking extraction
  if (!target.parking) {
    const parkingMatch = textContent.match(
      /(\d+)\s*(?:parking\s+(?:spot|space)?|parkirali?ste|garage|garaza|space)/i
    );
    if (parkingMatch && parkingMatch[1]) {
      const num = parseInt(parkingMatch[1], 10);
      if (num > 0 && num <= 10) target.parking = num;
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
  // Order matters: JSON-LD is most authoritative, then OG, then microdata, then gallery,
  // then structured patterns, finally smart text extraction (lowest priority fallback).
  extractJsonLd($, baseUrl, target);
  extractOpenGraph($, baseUrl, target);
  extractMicrodata($, baseUrl, target);
  extractGalleryImages($, baseUrl, target);
  extractStructuredPriceFromHtml($, target);
  extractStructuredLocationFromHtml($, target);
  extractSmartFieldsFromText($, target);
  return target;
};
