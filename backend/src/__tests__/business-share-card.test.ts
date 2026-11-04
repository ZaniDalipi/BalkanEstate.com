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
import { cropCover } from '../services/businessShare/businessShareImage';
import { textWidth } from '../services/developments/share/shareCardLayout';

const base = { name: 'Regina Group Construction', category: 'Construction', place: 'Vlore, Albania' };

describe('which look', () => {
  it('uses the cover photo when there is one, else the logo, else the initial', () => {
    expect(cardMode({ hasCover: true, hasLogo: true })).toBe('cover');
    expect(cardMode({ hasCover: true, hasLogo: false })).toBe('cover');
    expect(cardMode({ hasCover: false, hasLogo: true })).toBe('logo');
    expect(cardMode({ hasCover: false, hasLogo: false })).toBe('plain');
  });

  it('places the logo on its tile in both photo looks, and not on the plain card', () => {
    const cover = buildBusinessCard({ ...base, hasCover: true, hasLogo: true });
    const logo = buildBusinessCard({ ...base, hasCover: false, hasLogo: true });
    const plain = buildBusinessCard({ ...base, hasCover: false, hasLogo: false });
    for (const box of [cover.logo!, logo.logo!]) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.top + box.size).toBeLessThanOrEqual(CARD_H);
      expect(box.left + box.size).toBeLessThanOrEqual(CARD_W);
    }
    expect(logo.logo!.size).toBeGreaterThan(cover.logo!.size);
    expect(plain.logo).toBeNull();
    expect(plain.svg).toContain('>R</text>');
  });

  it('writes the name, trade and place, escaped, on a 1200×630 card', () => {
    const card = buildBusinessCard({ ...base, name: 'Smith & <Sons>', hasCover: true, hasLogo: false });
    expect(card.svg).toContain(`width="${CARD_W}" height="${CARD_H}"`);
    expect(card.svg).toContain('Smith &amp; &lt;Sons&gt;');
    expect(card.svg).toContain('Construction · Vlore, Albania');
    expect(card.svg).not.toContain('<Sons>');
  });

  it('shows the verified tick only for verified businesses', () => {
    expect(buildBusinessCard({ ...base, hasCover: true, hasLogo: true, isVerified: true }).svg).toContain('<path');
    expect(buildBusinessCard({ ...base, hasCover: true, hasLogo: true }).svg).not.toContain('<path');
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
