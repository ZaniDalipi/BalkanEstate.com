/**
 * An individual's link preview: their badge (the app's design), the same
 * colour as in the app, and a QR code that opens their profile.
 */
process.env.SKIP_TEST_DB = 'true';

import sharp from 'sharp';
import { BADGE_TONES, buildIndividualCard, fitSize, initials, toneIndex } from '../services/businessShare/individualShareLayout';
import { profileUrl, qrPath, renderIndividualCard } from '../services/businessShare/individualShareImage';

const input = {
  name: 'Z360VirtualTours', category: '360virtualtours', place: 'Resen, North Macedonia', tone: BADGE_TONES[2],
  hasPhoto: false, facts: ['Verified', 'Est. 2021'], qr: qrPath('https://balkanestateai.com/business-directory/abc'), site: 'balkanestateai.com',
};

describe('toneIndex', () => {
  it('matches the app: same hash of the public id, five colours', () => {
    // The app's toneIndex('abc') in shareCardData.ts: ((97*31+98)*31+99) % 5 = 96354 % 5 = 4
    expect(toneIndex('abc')).toBe(4);
    for (const id of ['qkgXEcz8pju5tAbC', 'Ab_-xyz', '']) expect(toneIndex(id)).toBeGreaterThanOrEqual(0);
  });
});

describe('buildIndividualCard', () => {
  it('draws the badge with the category engraved, initials without a photo, and the facts', () => {
    const { svg } = buildIndividualCard(input);
    expect(svg).toContain('360VIRTUALTOURS');
    expect(svg).toContain('>ZV<'.replace('ZV', initials('Z360VirtualTours')));
    expect(svg).toContain('Est. 2021');
    expect(svg).toContain(`fill="${BADGE_TONES[2]}"`);
  });

  it('leaves room for the photo instead of initials when there is one', () => {
    const { svg, photo } = buildIndividualCard({ ...input, hasPhoto: true });
    expect(svg).not.toContain(`>${initials(input.name)}<`);
    expect(photo.size).toBeGreaterThan(100);
  });

  it('escapes names', () => {
    expect(buildIndividualCard({ ...input, name: 'A & B <tours>' }).svg).toContain('A &amp; B &lt;tours&gt;');
  });
});

describe('fitSize', () => {
  it('shrinks a long name before cutting it', () => {
    const fitted = fitSize('Z360VirtualTours', 64, 40, 600);
    expect(fitted.text).toBe('Z360VirtualTours');
    expect(fitted.size).toBeLessThan(64);
    expect(fitSize('Short', 64, 40, 600).size).toBe(64);
    expect(fitSize('A very very long professional name indeed', 64, 40, 600).text.endsWith('…')).toBe(true);
  });
});

describe('profile link and QR code', () => {
  it('links the bare public id on the site', () => {
    expect(profileUrl('qkgX_Ecz8pju5tAb', 'https://site.test/')).toBe('https://site.test/business-directory/qkgX_Ecz8pju5tAb');
  });
  it('turns the link into modules', () => {
    const qr = qrPath('https://site.test/business-directory/x');
    expect(qr.size).toBeGreaterThanOrEqual(21);
    expect(qr.path).toMatch(/^M\d+ \d+h1v1h-1z/);
  });
});

describe('renderIndividualCard', () => {
  it('renders a 1200×630 JPEG, with or without a usable photo', async () => {
    const facts = { publicId: 'qkgXEcz8pju5tAbC', name: 'Ana Kovač', category: 'Cleaning', place: 'Pula, Croatia', facts: ['Verified'] };
    const photo = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#88aacc' } }).png().toBuffer();
    for (const raw of [photo, Buffer.from('not an image'), null]) {
      const meta = await sharp(await renderIndividualCard(facts, raw)).metadata();
      expect([meta.width, meta.height, meta.format]).toEqual([1200, 630, 'jpeg']);
    }
  });
});
