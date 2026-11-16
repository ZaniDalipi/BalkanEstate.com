/**
 * Renders an individual's link-preview card (individualShareLayout) as a
 * 1200×630 JPEG: the badge with their portrait (or initials), a QR code to
 * their profile, and their name, trade and place beside it. Like the
 * business card, a photo that can't be loaded never fails the card.
 */
import QRCode from 'qrcode';
import sharp from 'sharp';
import { OG_BASE_URL } from '../../config/ogConstants';
import { BADGE_TONES, PORTRAIT_SIZE, buildIndividualCard, toneIndex } from './individualShareLayout';

export interface IndividualShareFacts {
  /** The public (encoded) id: the profile link and the colour come from it. */
  publicId: string;
  name: string;
  category: string;
  place: string;
  facts: string[];
}

/** The QR code's dark modules as one SVG path in a size×size box. */
export function qrPath(text: string): { path: string; size: number } {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  let path = '';
  for (let y = 0; y < modules.size; y++) {
    for (let x = 0; x < modules.size; x++) if (modules.get(x, y)) path += `M${x} ${y}h1v1h-1z`;
  }
  return { path, size: modules.size };
}

/** The profile a scan opens: a bare public id resolves like the full slug. */
export const profileUrl = (publicId: string, base = OG_BASE_URL): string =>
  `${base.replace(/\/+$/, '')}/business-directory/${encodeURIComponent(publicId)}`;

async function roundPortrait(raw: Buffer, size: number): Promise<Buffer | null> {
  try {
    const square = await sharp(raw, { limitInputPixels: 40_000_000 }).rotate().resize(size, size, { fit: 'cover' }).png().toBuffer();
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);
    return await sharp(square).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  } catch {
    return null;
  }
}

export async function renderIndividualCard(f: IndividualShareFacts, photoRaw: Buffer | null): Promise<Buffer> {
  const url = profileUrl(f.publicId);
  const portrait = photoRaw ? await roundPortrait(photoRaw, PORTRAIT_SIZE) : null;
  const layout = buildIndividualCard({
    name: f.name,
    category: f.category,
    place: f.place,
    facts: f.facts,
    tone: BADGE_TONES[toneIndex(f.publicId)],
    hasPhoto: !!portrait,
    qr: qrPath(url),
    site: new URL(url).host,
  });
  const layers = portrait ? [{ input: portrait, top: layout.photo.top, left: layout.photo.left }] : [];
  return sharp(Buffer.from(layout.svg)).composite(layers).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
