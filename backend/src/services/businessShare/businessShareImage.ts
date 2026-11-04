/**
 * Renders a business's share card (see businessShareLayout) as a 1200×630
 * JPEG: their cover photo cropped where the owner positioned it, their logo
 * on its tile, the text overlay on top. A photo that can't be loaded simply
 * drops the card to the next look (cover → logo → plain) — a share card
 * should never fail. Cached per listing version.
 */
import crypto from 'crypto';
import sharp from 'sharp';
import BusinessListing from '../../models/BusinessListing';
import { resolveId } from '../../utils/idObfuscation';
import { loadPhoto } from '../developments/share/residenceShareImage';
import { CARD_H, CARD_W, buildBusinessCard, categoryText } from './businessShareLayout';

const CACHE_MAX = 200;
const cache = new Map<string, Buffer>();

export class BusinessNotFoundError extends Error {}

export interface BusinessShareFacts {
  id: string;
  version: string;
  name: string;
  category: string;
  place: string;
  coverUrl: string | null;
  coverPosition: number;
  logoUrl: string | null;
  isVerified: boolean;
}

const FIELDS = 'name category customCategory city country logoUrl bannerUrl bannerPosition isVerified isActive updatedAt';

/** The business behind an id, encoded id, SEO slug or slug field — public listings only. */
export async function businessShareFacts(idOrSlug: string): Promise<BusinessShareFacts> {
  const id = resolveId(idOrSlug);
  const doc =
    (id && (await BusinessListing.findById(id).select(FIELDS).lean())) ||
    (await BusinessListing.findOne({ slug: idOrSlug.toLowerCase() }).select(FIELDS).lean());
  if (!doc || doc.isActive === false) throw new BusinessNotFoundError(idOrSlug);
  return {
    id: String(doc._id),
    version: doc.updatedAt ? new Date(doc.updatedAt).getTime().toString(36) : '0',
    name: doc.name,
    category: categoryText(doc.category, doc.customCategory),
    place: [doc.city, doc.country].filter(Boolean).join(', '),
    coverUrl: doc.bannerUrl || null,
    coverPosition: typeof doc.bannerPosition === 'number' ? doc.bannerPosition : 50,
    logoUrl: doc.logoUrl || null,
    isVerified: !!doc.isVerified,
  };
}

/** Fill 1200×630 from the photo, keeping the strip the owner chose (0 = top, 100 = bottom). */
export async function cropCover(photo: Buffer, positionPct: number): Promise<Buffer> {
  const { data, info } = await sharp(photo, { limitInputPixels: 40_000_000 }).rotate().toBuffer({ resolveWithObject: true });
  const scale = Math.max(CARD_W / info.width, CARD_H / info.height);
  const width = Math.max(CARD_W, Math.ceil(info.width * scale));
  const height = Math.max(CARD_H, Math.ceil(info.height * scale));
  const pos = Math.min(100, Math.max(0, positionPct)) / 100;
  return sharp(data)
    .resize(width, height)
    .extract({ left: Math.round((width - CARD_W) / 2), top: Math.round((height - CARD_H) * pos), width: CARD_W, height: CARD_H })
    .toBuffer();
}

async function render(f: BusinessShareFacts): Promise<Buffer> {
  const [coverRaw, logoRaw] = await Promise.all([
    f.coverUrl ? loadPhoto(f.coverUrl) : Promise.resolve(null),
    f.logoUrl ? loadPhoto(f.logoUrl) : Promise.resolve(null),
  ]);
  const cover = coverRaw ? await cropCover(coverRaw, f.coverPosition).catch(() => null) : null;
  const layout = buildBusinessCard({
    name: f.name,
    category: f.category,
    place: f.place,
    hasCover: !!cover,
    hasLogo: !!logoRaw,
    isVerified: f.isVerified,
  });

  const layers: Array<{ input: Buffer; top: number; left: number }> = [{ input: Buffer.from(layout.svg), top: 0, left: 0 }];
  if (layout.logo && logoRaw) {
    const logo = await sharp(logoRaw, { limitInputPixels: 40_000_000 })
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize(layout.logo.size, layout.logo.size, { fit: 'contain', background: '#ffffff' })
      .png()
      .toBuffer()
      .catch(() => null);
    if (logo) layers.push({ input: logo, top: layout.logo.top, left: layout.logo.left });
  }

  const base = cover ? sharp(cover) : sharp({ create: { width: CARD_W, height: CARD_H, channels: 3, background: '#0252CD' } });
  return base.composite(layers).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}

/** The card as JPEG, with an ETag. Throws BusinessNotFoundError for a listing that isn't public. */
export async function businessShareImage(idOrSlug: string): Promise<{ body: Buffer; etag: string }> {
  const facts = await businessShareFacts(idOrSlug);
  const key = `${facts.id}|${facts.version}`;
  let body = cache.get(key);
  if (!body) {
    body = await render(facts);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, body);
  }
  return { body, etag: `"${crypto.createHash('sha1').update(body).digest('hex').slice(0, 16)}"` };
}
