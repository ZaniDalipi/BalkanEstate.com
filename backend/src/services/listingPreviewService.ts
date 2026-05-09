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
  const raws = await adapter.fetchListings(source, { limit });

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
