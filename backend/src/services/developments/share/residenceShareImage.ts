/**
 * The image a shared residence link shows in a feed: the residence's main
 * picture (its published explorer view, else its cover) cropped to 1200×630,
 * every building outlined and labelled with what is still available, and the
 * name, place and prices along the bottom. Rendered on demand and cached; the
 * hour is part of the cache key so availability is never more than an hour old.
 */
import crypto from 'crypto';
import sharp from 'sharp';
import { getPublicDevelopmentDetail, listPublicUnits } from '../developmentPublicService';
import { getPublishedScene } from '../developmentSceneService';
import { getProxiedImage } from '../../imageProxy/imageProxyService';
import { apiLogger } from '../../../utils/logger';
import { buildShareCardSvg, CARD_H, CARD_W, type CardRegion } from './shareCardLayout';
import { SHARE_CARD_WORDS, fill, formatEuro } from './shareCardText';
import type { SupportedLangCode } from '../../../config/ogConstants';

const CACHE_MAX = 100;
const HOUR_MS = 3_600_000;
const cache = new Map<string, Buffer>();

/** The facts shown on the card and in the link preview's text. */
export interface ResidenceShareFacts {
  slug: string;
  name: string;
  place: string;
  description: string;
  stats: { total: number; available: number; priceMin: number | null };
  photoUrl: string | null;
  regions: CardRegion[];
}

export async function residenceShareFacts(slug: string): Promise<ResidenceShareFacts> {
  const [detail, units, scene] = await Promise.all([
    getPublicDevelopmentDetail(slug),
    listPublicUnits(slug),
    getPublishedScene(slug, {}).catch(() => null),
  ]);
  const dev = detail.development as Record<string, unknown>;
  const buildings = new Map(
    (detail.buildings as Array<Record<string, unknown>>).map((b) => [String(b.id), b])
  );
  const regions: CardRegion[] = (scene?.hotspots ?? [])
    .filter((h) => h.linkType === 'building' && buildings.has(h.linkId))
    .map((h) => {
      const b = buildings.get(h.linkId) as { name?: string; stats?: { units: number; available: number } };
      return {
        shape: h.shape,
        points: h.points,
        label: h.label || b.name || '',
        available: b.stats?.available ?? 0,
        units: b.stats?.units ?? 0,
      };
    });
  return {
    slug,
    name: String(dev.name ?? ''),
    place: [dev.city, dev.country].filter(Boolean).join(', '),
    description: String(dev.description ?? ''),
    stats: { total: units.summary.total, available: units.summary.available, priceMin: units.summary.priceMin },
    photoUrl: scene?.imageUrl || (typeof dev.coverImage === 'string' ? dev.coverImage : null),
    regions: scene ? regions : [],
  };
}

const isLocalUrl = (url: string) => {
  try {
    return ['localhost', '127.0.0.1'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

/**
 * The photo's bytes through the image proxy (SSRF-guarded, cached). Outside
 * production, demo pictures served by the local dev server are read directly.
 */
async function loadPhoto(url: string): Promise<Buffer | null> {
  try {
    if (process.env.NODE_ENV !== 'production' && isLocalUrl(url)) {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    }
    return (await getProxiedImage({ url, width: 1920 })).body;
  } catch (error) {
    apiLogger.warn(`Share card: photo not loaded (${url}): ${(error as Error).message}`);
    return null;
  }
}

async function render(facts: ResidenceShareFacts, lang: SupportedLangCode): Promise<Buffer> {
  const photo = facts.photoUrl ? await loadPhoto(facts.photoUrl) : null;
  let base: sharp.Sharp;
  let size: { width: number; height: number } | undefined;
  if (photo) {
    const { data, info } = await sharp(photo, { limitInputPixels: 40_000_000 }).rotate().toBuffer({ resolveWithObject: true });
    size = { width: info.width, height: info.height };
    base = sharp(data).resize(CARD_W, CARD_H, { fit: 'cover', position: 'centre' });
  } else {
    base = sharp({ create: { width: CARD_W, height: CARD_H, channels: 3, background: '#0f172a' } });
  }
  const svg = buildShareCardSvg({
    photo: size,
    regions: size ? facts.regions : [],
    name: facts.name,
    place: facts.place,
    stats: facts.stats,
    words: SHARE_CARD_WORDS[lang],
  });
  return base.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

/** The card as JPEG, with an ETag. Throws NotFoundError for a residence that isn't public. */
export async function residenceShareImage(slug: string, lang: SupportedLangCode): Promise<{ body: Buffer; etag: string }> {
  const facts = await residenceShareFacts(slug);
  const key = `${slug}|${lang}|${Math.floor(Date.now() / HOUR_MS)}|${facts.stats.available}|${facts.photoUrl ?? ''}`;
  let body = cache.get(key);
  if (!body) {
    body = await render(facts, lang);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, body);
  }
  return { body, etag: `"${crypto.createHash('sha1').update(body).digest('hex').slice(0, 16)}"` };
}

/** One line for the preview text: "44 of 98 homes available · from 78.000 €". */
export function shareSummary(facts: ResidenceShareFacts, lang: SupportedLangCode): string {
  const w = SHARE_CARD_WORDS[lang];
  return [
    facts.stats.total ? fill(w.available, { a: facts.stats.available, t: facts.stats.total }) : '',
    facts.stats.priceMin ? fill(w.from, { p: formatEuro(facts.stats.priceMin) }) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
