// cheerio is an optional peer dependency — install it when needed:
// npm install cheerio
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cheerio: any | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  cheerio = require('cheerio');
} catch {
  // not installed
}

/** Structured property data extracted from raw HTML. */
export interface EnrichedListing {
  title?: string;
  price?: number;
  currency?: string;
  address?: string;
  city?: string;
  country?: string;
  description?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  imageUrls?: string[];
  lat?: number;
  lng?: number;
}

/**
 * Extract structured listing data from raw HTML using CSS selectors (via cheerio)
 * or basic regex fallback. Throws if cheerio is not installed and no selectors are provided.
 */
export const enrichHtml = (
  html: string,
  selectors?: Partial<Record<keyof EnrichedListing, string>>
): EnrichedListing => {
  if (!cheerio && !selectors) {
    throw new Error(
      'cheerio is not installed and no selectors provided. Run: npm install cheerio'
    );
  }

  const result: EnrichedListing = {};

  if (cheerio && selectors) {
    const $ = cheerio.load(html);

    if (selectors.title) {
      result.title = $(selectors.title).first().text().trim() || undefined;
    }
    if (selectors.price) {
      const raw = $(selectors.price).first().text().trim();
      const num = parseFloat(raw.replace(/[^\d.]/g, ''));
      if (!isNaN(num)) result.price = num;
    }
    if (selectors.address) {
      result.address = $(selectors.address).first().text().trim() || undefined;
    }
    if (selectors.city) {
      result.city = $(selectors.city).first().text().trim() || undefined;
    }
    if (selectors.country) {
      result.country = $(selectors.country).first().text().trim() || undefined;
    }
    if (selectors.description) {
      result.description = $(selectors.description).first().text().trim() || undefined;
    }
    if (selectors.beds) {
      const raw = $(selectors.beds).first().text().trim();
      const num = parseInt(raw, 10);
      if (!isNaN(num)) result.beds = num;
    }
    if (selectors.baths) {
      const raw = $(selectors.baths).first().text().trim();
      const num = parseInt(raw, 10);
      if (!isNaN(num)) result.baths = num;
    }
    if (selectors.sqft) {
      const raw = $(selectors.sqft).first().text().trim();
      const num = parseFloat(raw.replace(/[^\d.]/g, ''));
      if (!isNaN(num)) result.sqft = num;
    }
    if (selectors.imageUrls) {
      const urls: string[] = [];
      $(selectors.imageUrls).each((_: number, el: unknown) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) urls.push(src);
      });
      if (urls.length > 0) result.imageUrls = urls;
    }
  } else {
    // Regex-based fallback — best-effort extraction from raw HTML
    const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    if (titleMatch) result.title = titleMatch[1].trim();

    const priceMatch = /(\d[\d\s.,]*)\s*(EUR|USD|BAM|KM|RSD|HRK|€|\$)/i.exec(html);
    if (priceMatch) {
      const num = parseFloat(priceMatch[1].replace(/[\s,]/g, '').replace('.', '.'));
      if (!isNaN(num)) {
        result.price = num;
        result.currency = priceMatch[2];
      }
    }

    const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
    const imgUrls: string[] = [];
    for (const m of imgMatches) {
      if (m[1] && !m[1].startsWith('data:')) imgUrls.push(m[1]);
    }
    if (imgUrls.length > 0) result.imageUrls = imgUrls;
  }

  return result;
};

/**
 * Extract structured listing data from a property detail-page HTML.
 * Accepts a fieldMap (CSS selector per field key) and an optional base URL for resolving
 * relative image/link paths. Falls back to enrichHtml when fieldMap is empty.
 */
export const enrichFromDetailHtml = (
  html: string,
  fieldMap?: Record<string, string>,
  _baseUrl?: string
): EnrichedListing => enrichHtml(html, fieldMap as Partial<Record<keyof EnrichedListing, string>>);
