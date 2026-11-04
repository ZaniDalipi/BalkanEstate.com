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
import { CARD_H, CARD_W, buildBusinessCard, categoryText, type Box } from './businessShareLayout';

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
  services: string[];
  /** Short facts for the card's bottom row. */
  facts: string[];
}

const FIELDS =
  'name category customCategory city country logoUrl bannerUrl bannerPosition isVerified isActive updatedAt services yearEstablished licenseNumber priceRange languages';

/** "Verified", "4 years in business", "Licensed", "$$", "3 languages" — whatever the listing has. */
export function cardFacts(
  l: { isVerified?: boolean; yearEstablished?: number; licenseNumber?: string; priceRange?: string; languages?: string[] },
  now = new Date(),
): string[] {
  const years = l.yearEstablished ? now.getFullYear() - l.yearEstablished : null;
  return [
    l.isVerified ? 'Verified' : '',
    years !== null && years >= 1 ? `${years} year${years > 1 ? 's' : ''} in business` : l.yearEstablished ? `Est. ${l.yearEstablished}` : '',
    l.licenseNumber ? 'Licensed' : '',
    l.priceRange || '',
    l.languages?.length ? `${l.languages.length} language${l.languages.length > 1 ? 's' : ''}` : '',
  ].filter(Boolean);
}

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
    services: (doc.services ?? []).filter(Boolean),
    facts: cardFacts(doc),
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

const roundedMask = (w: number, h: number, r: number) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);

/**
 * Frosted glass: the background inside `box`, blurred, a touch brighter and
 * more saturated, lightly tinted, clipped to the rounded shape.
 */
export async function frost(background: Buffer, box: Box): Promise<Buffer> {
  const tint = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${box.w}" height="${box.h}">`
      + `<rect width="${box.w}" height="${box.h}" fill="#ffffff" fill-opacity="0.12"/>`
      + `<rect width="${box.w}" height="${box.h}" fill="#020617" fill-opacity="0.2"/></svg>`,
  );
  const blurred = await sharp(background)
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .blur(26)
    .modulate({ brightness: 1.08, saturation: 1.3 })
    .composite([{ input: tint }])
    .png()
    .toBuffer();
  return sharp(blurred).composite([{ input: roundedMask(box.w, box.h, box.r), blend: 'dest-in' }]).png().toBuffer();
}

/** The logo on a small white rounded square, to sit in its glass tile. */
async function logoChip(raw: Buffer, size: number): Promise<Buffer | null> {
  try {
    const logo = await sharp(raw, { limitInputPixels: 40_000_000 })
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize(size - 12, size - 12, { fit: 'contain', background: '#ffffff' })
      .extend({ top: 6, bottom: 6, left: 6, right: 6, background: '#ffffff' })
      .png()
      .toBuffer();
    return sharp(logo).composite([{ input: roundedMask(size, size, 20), blend: 'dest-in' }]).png().toBuffer();
  } catch {
    return null;
  }
}

/** Draw the card from the photos' bytes (null when missing or unreadable). */
export async function renderBusinessCard(f: BusinessShareFacts, coverRaw: Buffer | null, logoRaw: Buffer | null): Promise<Buffer> {
  const cover = coverRaw ? await cropCover(coverRaw, f.coverPosition).catch(() => null) : null;
  const layout = buildBusinessCard({
    name: f.name,
    category: f.category,
    place: f.place,
    hasCover: !!cover,
    hasLogo: !!logoRaw,
    isVerified: f.isVerified,
    services: f.services,
    facts: f.facts,
  });

  // Background (photo or brand gradient) with its vignettes and the panel's shadow.
  const raw = cover ?? (await sharp(Buffer.from(layout.backgroundSvg as string)).png().toBuffer());
  const background = await sharp(raw).composite([{ input: Buffer.from(layout.underSvg) }]).png().toBuffer();

  const layers: Array<{ input: Buffer; top: number; left: number }> = [];
  for (const box of layout.glass) layers.push({ input: await frost(background, box), top: box.y, left: box.x });
  layers.push({ input: Buffer.from(layout.overSvg), top: 0, left: 0 });
  if (layout.logo && logoRaw) {
    const chip = await logoChip(logoRaw, layout.logo.size);
    if (chip) layers.push({ input: chip, top: layout.logo.top, left: layout.logo.left });
  }
  return sharp(background).composite(layers).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

async function render(f: BusinessShareFacts): Promise<Buffer> {
  const [coverRaw, logoRaw] = await Promise.all([
    f.coverUrl ? loadPhoto(f.coverUrl) : Promise.resolve(null),
    f.logoUrl ? loadPhoto(f.logoUrl) : Promise.resolve(null),
  ]);
  return renderBusinessCard(f, coverRaw, logoRaw);
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
