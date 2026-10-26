/** The residence share card's layout (pure): crop maths, outlines, labels, wording. */
import { SUPPORTED_LANG_CODES } from '../../config/ogConstants';
import {
  buildShareCardSvg,
  CARD_H,
  CARD_W,
  coverTransform,
  placeLabels,
  projectRegion,
  type CardRegion,
} from '../../services/developments/share/shareCardLayout';
import { SHARE_CARD_WORDS, fill, formatEuro, shareLang } from '../../services/developments/share/shareCardText';

const words = SHARE_CARD_WORDS.en;
const tower: CardRegion = { shape: 'rect', points: [[0.4, 0.1], [0.6, 0.9]], label: 'Tower', available: 3, units: 10 };

describe('cover crop', () => {
  it('fills the card and centres the crop, like sharp', () => {
    // A square photo is scaled to the card width and cropped top and bottom.
    expect(coverTransform(1000, 1000)).toEqual({ scale: 1.2, dx: 0, dy: (1200 - CARD_H) / 2 });
    // A wide photo is scaled to the card height and cropped left and right.
    const wide = coverTransform(4000, 1000);
    expect(wide.scale).toBeCloseTo(0.63);
    expect(wide.dx).toBeCloseTo((4000 * 0.63 - CARD_W) / 2);
  });

  it('maps a building outline onto the cropped card', () => {
    const pts = projectRegion(tower, { width: 1000, height: 1000 });
    expect(pts).toHaveLength(4);
    expect(pts[0][0]).toBeCloseTo(480);
    expect(pts[0][1]).toBeCloseTo(0.1 * 1200 - 285);
  });
});

describe('the card', () => {
  const base = { name: 'Sea <View>', place: 'Budva, Montenegro', stats: { total: 98, available: 44, priceMin: 86000 }, words };

  it('outlines every building with what is left, and states the totals', () => {
    const svg = buildShareCardSvg({ ...base, photo: { width: 1000, height: 1000 }, regions: [tower, { ...tower, label: 'Villa', points: [[0.05, 0.3], [0.3, 0.5]], available: 0 }] });
    expect(svg.match(/<polygon /g)).toHaveLength(4); // two layers per building
    expect(svg).toContain('3 available');
    expect(svg).toContain('Sold out');
    expect(svg).toContain('44 of 98 homes available');
    expect(svg).toContain('from 86.000 €');
    expect(svg).toContain('Sea &lt;View&gt;');
    expect(svg).not.toContain('<View>');
  });

  it('without a photo draws no outlines and still has name and numbers', () => {
    const svg = buildShareCardSvg({ ...base, regions: [tower] });
    expect(svg).not.toContain('<polygon');
    expect(svg).toContain('Budva, Montenegro');
  });

  it('leaves out the price when no home has a public price', () => {
    const svg = buildShareCardSvg({ ...base, stats: { total: 5, available: 0, priceMin: null }, regions: [] });
    expect(svg).toContain('0 of 5 homes available');
    expect(svg).not.toContain('from ');
  });

  it('keeps labels apart, inside the card and clear of the brand and bottom band', () => {
    const shape = (x: number): Array<[number, number]> => [[x, 120], [x + 60, 120], [x + 60, 300], [x, 300]];
    const boxes = placeLabels([0, 40, 80, 120].map((x) => ({ pts: shape(400 + x), title: 'Building', sub: '2 available' })));
    expect(boxes.length).toBeGreaterThan(1);
    for (const [i, a] of boxes.entries()) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + a.w).toBeLessThanOrEqual(CARD_W);
      expect(a.y + a.h).toBeLessThanOrEqual(400);
      for (const b of boxes.slice(i + 1)) {
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart).toBe(true);
      }
    }
  });
});

describe('wording', () => {
  it('has every phrase in every site language', () => {
    for (const lang of SUPPORTED_LANG_CODES) {
      const w = SHARE_CARD_WORDS[lang];
      expect(fill(w.available, { a: 1, t: 2 })).toMatch(/1.*2/);
      expect(fill(w.from, { p: 'X' })).toContain('X');
      expect(fill(w.buildingAvailable, { n: 7 })).toContain('7');
      expect(w.soldOut.length).toBeGreaterThan(0);
    }
  });

  it('falls back to English for an unknown language, and prints euros the site way', () => {
    expect(shareLang('xx')).toBe('en');
    expect(shareLang('sq')).toBe('sq');
    expect(formatEuro(86000)).toBe('86.000 €');
  });
});
