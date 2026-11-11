/**
 * The share card a business link shows on Facebook, WhatsApp, LinkedIn…:
 * which look is used for which uploads, text that fits, and the cover crop.
 */
process.env.SKIP_TEST_DB = 'true';

import sharp from 'sharp';
import {
  CARD_H,
  CARD_W,
  buildBusinessCard,
  cardMode,
  categoryText,
  fitWidth,
  wrapTwoLines,
} from '../services/businessShare/businessShareLayout';
import { cardFacts, cropCover, frost } from '../services/businessShare/businessShareImage';
import { textWidth } from '../services/developments/share/shareCardLayout';

const base = { name: 'Regina Group Construction', category: 'Construction', place: 'Vlore, Albania' };

describe('which look', () => {
  it('uses the cover photo when there is one, else the brand background (logo, or initial)', () => {
    expect(cardMode({ hasCover: true, hasLogo: true })).toBe('cover');
    expect(cardMode({ hasCover: true, hasLogo: false })).toBe('cover');
    expect(cardMode({ hasCover: false, hasLogo: true })).toBe('logo');
    expect(cardMode({ hasCover: false, hasLogo: false })).toBe('plain');
  });

  it('draws its own background only when there is no cover photo', () => {
    expect(buildBusinessCard({ ...base, hasCover: true, hasLogo: true }).backgroundSvg).toBeNull();
    expect(buildBusinessCard({ ...base, hasCover: false, hasLogo: true }).backgroundSvg).toContain(`width="${CARD_W}" height="${CARD_H}"`);
  });

  it('frosts the brand pill, the logo tile and the panel, all inside the card', () => {
    const card = buildBusinessCard({ ...base, hasCover: true, hasLogo: true });
    expect(card.glass).toHaveLength(3);
    for (const g of card.glass) {
      expect(g.x).toBeGreaterThanOrEqual(0);
      expect(g.y).toBeGreaterThanOrEqual(0);
      expect(g.x + g.w).toBeLessThanOrEqual(CARD_W);
      expect(g.y + g.h).toBeLessThanOrEqual(CARD_H);
    }
    const tile = card.glass[1];
    expect(card.logo!.left).toBeGreaterThan(tile.x);
    expect(card.logo!.left + card.logo!.size).toBeLessThan(tile.x + tile.w);
  });

  it('shows the initial on the tile when there is no logo', () => {
    const plain = buildBusinessCard({ ...base, hasCover: false, hasLogo: false });
    expect(plain.logo).toBeNull();
    expect(plain.overSvg).toContain('>R</text>');
  });

  it('writes the label, name, services, facts and the call to action — escaped', () => {
    const card = buildBusinessCard({
      ...base, name: 'Smith & <Sons>', hasCover: true, hasLogo: false,
      services: ['Renovation', 'Roofing'], facts: ['Verified', '4 years in business'],
    });
    expect(card.overSvg).toContain('CONSTRUCTION · VLORE, ALBANIA');
    expect(card.overSvg).toContain('Smith &amp; &lt;Sons&gt;');
    expect(card.overSvg).not.toContain('<Sons>');
    expect(card.overSvg).toContain('Renovation  ·  Roofing');
    expect(card.overSvg).toContain('Verified  ·  4 years in business');
    expect(card.overSvg).toContain('View business');
    expect(card.overSvg).toContain('balkanestateai.com');
  });

  it('shows the verified tick only for verified businesses', () => {
    const tick = (svg: string) => (svg.match(/stroke-linecap="round" stroke-linejoin="round"\/>/g) ?? []).length;
    const verified = buildBusinessCard({ ...base, hasCover: true, hasLogo: true, isVerified: true }).overSvg;
    const plain = buildBusinessCard({ ...base, hasCover: true, hasLogo: true }).overSvg;
    expect(tick(verified)).toBeGreaterThan(tick(plain));
  });
});

describe('facts row', () => {
  it('lists what the listing has, in order', () => {
    const now = new Date(2026, 10, 4);
    expect(cardFacts({ isVerified: true, yearEstablished: 2022, licenseNumber: 'L1', priceRange: '$$', languages: ['sq', 'en'] }, now))
      .toEqual(['Verified', '4 years in business', 'Licensed', '$$', '2 languages']);
    expect(cardFacts({ yearEstablished: 2026 }, now)).toEqual(['Est. 2026']);
    expect(cardFacts({}, now)).toEqual([]);
  });
});

describe('text', () => {
  it('names the category as people read it', () => {
    expect(categoryText('real_estate_law')).toBe('Real estate law');
    expect(categoryText('other', 'Solar panels')).toBe('Solar panels');
  });

  it('cuts text to the width it has, with an ellipsis', () => {
    const long = 'A very long business name that will never fit on one line of the card';
    const cut = fitWidth(long, 52, 600, true);
    expect(cut.endsWith('…')).toBe(true);
    expect(textWidth(cut, 52, true)).toBeLessThanOrEqual(600);
    expect(fitWidth('Short', 52, 600, true)).toBe('Short');
  });

  it('wraps a name onto at most two lines', () => {
    expect(wrapTwoLines('Regina Group Construction', 56, 600, true)).toEqual(['Regina Group', 'Construction']);
    expect(wrapTwoLines('One two three four five six seven eight nine ten eleven', 56, 400, true)).toHaveLength(2);
  });
});

describe('frosted glass', () => {
  it('blurs the background inside the box and rounds its corners', async () => {
    // Sharp black/white stripes: after frosting, neighbouring pixels are close in value.
    const stripes = await sharp({ create: { width: 400, height: 200, channels: 3, background: '#000' } })
      .composite(Array.from({ length: 20 }, (_, n) => ({ input: { create: { width: 10, height: 200, channels: 3 as const, background: '#fff' } }, left: n * 20, top: 0 })))
      .png()
      .toBuffer();
    const glass = await frost(stripes, { x: 50, y: 20, w: 300, h: 160, r: 30 });
    const { data, info } = await sharp(glass).raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height, info.channels]).toEqual([300, 160, 4]);
    const px = (x: number, y: number) => data[(y * info.width + x) * 4];
    expect(Math.abs(px(150, 80) - px(160, 80))).toBeLessThan(60);
    expect(data[3]).toBe(0); // the corner is cut away
  });
});

describe('cropCover', () => {
  const stripes = () =>
    sharp({ create: { width: 1000, height: 2000, channels: 3, background: '#ff0000' } })
      .composite([{ input: { create: { width: 1000, height: 1000, channels: 3, background: '#0000ff' } }, top: 1000, left: 0 }])
      .png()
      .toBuffer();

  it('fills 1200×630 and keeps the strip the owner chose', async () => {
    const top = await sharp(await cropCover(await stripes(), 0)).raw().toBuffer({ resolveWithObject: true });
    const bottom = await sharp(await cropCover(await stripes(), 100)).raw().toBuffer({ resolveWithObject: true });
    expect([top.info.width, top.info.height]).toEqual([CARD_W, CARD_H]);
    expect(top.data[0]).toBeGreaterThan(200); // red — the top of the photo
    expect(bottom.data[2]).toBeGreaterThan(200); // blue — the bottom
  });
});
