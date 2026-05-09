import Property from '../models/Property';
import { getAdapter } from './listingAdapters';
import type { IListingSource } from '../models/ListingSource';
import type { RawListing } from './listingAdapters/types';

export interface PreviewListing {
  rawId: string;
  title?: string;
  price?: number;
  city?: string;
  country?: string;
  propertyType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  imageUrl?: string;
  sourceUrl?: string;
  isNew: boolean;
}

interface PreviewSession {
  sourceId: string;
  items: PreviewListing[];
  rawMap: Record<string, RawListing>;
  createdAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000;
const sessions = new Map<string, PreviewSession>();

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
}, 5 * 60 * 1000).unref();

const createSession = (sourceId: string, items: PreviewListing[], raws: RawListing[]): string => {
  const rawMap: Record<string, RawListing> = {};
  for (const r of raws) rawMap[r.id] = r;
  const previewId = `prev-${sourceId.slice(-6)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  sessions.set(previewId, { sourceId, items, rawMap, createdAt: Date.now() });
  return previewId;
};

export const getPreviewSession = (previewId: string): PreviewSession | undefined => {
  const s = sessions.get(previewId);
  if (!s) return undefined;
  if (Date.now() - s.createdAt > SESSION_TTL_MS) {
    sessions.delete(previewId);
    return undefined;
  }
  return s;
};

export const deletePreviewSession = (previewId: string): void => {
  sessions.delete(previewId);
};

const str = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
};

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

// Match both attribute-order variants of <meta property="og:image">
const OG_IMAGE_RE =
  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i;

const PRICE_HTML_RE =
  /(?:€|\bEUR\b|\bUSD\b|\$|\bGBP\b|£|\bRSD\b|\bHRK\b|\bkn\b|\bMKD\b|\bBAM\b|\bRON\b|\bBGN\b|\bALL\b|\bHUF\b)\s*[\d.,]{2,}|[\d.,]{2,}\s*(?:€|\bEUR\b|\bUSD\b|\$|\bGBP\b|£|\bRSD\b|\bHRK\b|\bkn\b|\bMKD\b|\bBAM\b|\bRON\b|\bBGN\b|\bALL\b|\bHUF\b)/i;

const AREA_HTML_RE = /\b\d+(?:[.,]\d+)?\s*(?:m²|m2|sqm|sq\s*ft|square\s*meters)\b/i;

const LISTING_JSONLD_RE =
  /"@type"\s*:\s*"(?:RealEstateListing|Residence|Apartment|House|SingleFamilyResidence|Product|Place)"/i;

/**
 * Heuristic: does this fetched detail page actually look like a real estate
 * listing? We require at least one of:
 * - Structured JSON-LD schema (most authoritative)
 * - Visible price or area in the HTML (common patterns)
 * - A title extracted from the index card (trusts the adapter's URL filtering)
 *
 * This is permissive by design. We'd rather let a non-listing through the
 * preview (user can reject it) than drop a real listing because its detail
 * page doesn't display price/area prominently.
 */
const isLikelyListingHtml = (html: string, hasTitle: boolean): boolean => {
  if (!html) return true; // No detail HTML to check — trust the adapter.
  if (LISTING_JSONLD_RE.test(html)) return true; // JSON-LD is authoritative.
  if (PRICE_HTML_RE.test(html)) return true; // Price visible.
  if (AREA_HTML_RE.test(html)) return true; // Area visible.
  // If we have a title from the index card, trust the adapter's URL filter.
  if (hasTitle) return true;
  // No signals at all — probably not a listing.
  return false;
};

const extractPreviewItem = (raw: RawListing): Omit<PreviewListing, 'isNew'> => {
  const r = raw.raw;
  const loc = r.location as Record<string, unknown> | undefined;

  const title = str(r.title ?? r.name ?? r.naslov ?? r.naziv);
  const price = num(r.price ?? r.Price ?? r.asking_price ?? r.priceEur ?? r.price_eur);
  const city = str(r.city ?? r.grad ?? loc?.city ?? (typeof r.location === 'string' ? r.location : undefined));
  const country = str(r.country ?? r.zemlja ?? r.drzava);
  const propertyType = str(r.propertyType ?? r.property_type ?? r.type ?? r.tip);
  const beds = num(r.beds ?? r.bedrooms ?? r.sobe);
  const baths = num(r.baths ?? r.bathrooms ?? r.kupatila);
  const sqft = num(r.sqft ?? r.sqm ?? r.m2 ?? r.area ?? r.surface);
  const imgs = Array.isArray(r.images) ? (r.images as unknown[]) : [];

  let imageUrl = str(r.imageUrl ?? r.image_url ?? r.image ?? r.photo ?? r.thumbnail ?? imgs[0]);

  // For HTML-scraped items the raw fields may be absent; fall back to the
  // OpenGraph image tag embedded in the fetched detail page HTML.
  if (!imageUrl && typeof r.detailHtml === 'string') {
    const m = (r.detailHtml as string).match(OG_IMAGE_RE);
    if (m) imageUrl = str(m[1] ?? m[2]);
  }

  return { rawId: raw.id, title, price, city, country, propertyType, beds, baths, sqft, imageUrl, sourceUrl: raw.url };
};

export const previewSource = async (
  source: IListingSource,
  limit: number
): Promise<{ previewId: string; items: PreviewListing[]; fetched: number }> => {
  const adapter = getAdapter(source);
  const allRaws = await adapter.fetchListings(source, { limit });

  // Drop items whose fetched detail page has no real-estate content signals.
  // Items without detailHtml pass through (URL-based filtering already applied
  // upstream in the adapter). If the index card already extracted a title,
  // trust the adapter's filtering and don't drop it just because the detail
  // page doesn't display price/area visibly.
  const raws = allRaws.filter((raw) => {
    const html = (raw.raw as Record<string, unknown> | undefined)?.detailHtml;
    const hasTitle = Boolean(raw.raw?.title ?? raw.raw?.name ?? raw.raw?.naslov ?? raw.raw?.naziv);
    return typeof html === 'string' ? isLikelyListingHtml(html, hasTitle) : true;
  });

  const existingIds = new Set<string>();
  if (raws.length > 0) {
    const existing = await Property.find({
      source: source.slug,
      sourceListingId: { $in: raws.map((r) => r.id) },
    })
      .select('sourceListingId')
      .lean();
    for (const e of existing) existingIds.add(e.sourceListingId as string);
  }

  const items: PreviewListing[] = raws.map((raw) => ({
    ...extractPreviewItem(raw),
    isNew: !existingIds.has(raw.id),
  }));

  const previewId = createSession(String(source._id), items, raws);
  return { previewId, items, fetched: raws.length };
};
