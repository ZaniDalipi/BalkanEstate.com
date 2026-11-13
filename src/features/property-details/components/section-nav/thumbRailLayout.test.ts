import { describe, expect, it } from 'vitest';
import { MAX_ROW_PX, MIN_ROW_PX, PANEL_CHROME_PX, isSlide, panelLayout, rowIndexAt } from './thumbRailLayout';

const phone = { viewportHeight: 844, topInset: 80, bottomInset: 100 };

describe('panelLayout', () => {
  it('centres a short list on the rail with roomy rows', () => {
    const l = panelLayout({ ...phone, rowCount: 4, anchorY: 480 });
    expect(l.rowHeight).toBe(MAX_ROW_PX);
    expect(l.height).toBe(PANEL_CHROME_PX + 4 * MAX_ROW_PX);
    expect(l.top).toBe(Math.round(480 - l.height / 2));
  });

  it('shrinks the rows so all sections fit between the header and the contact bar', () => {
    const l = panelLayout({ ...phone, viewportHeight: 760, rowCount: 13, anchorY: 440 });
    expect(l.rowHeight).toBeGreaterThanOrEqual(MIN_ROW_PX);
    expect(l.rowHeight).toBeLessThan(MAX_ROW_PX);
    expect(l.top).toBeGreaterThanOrEqual(phone.topInset);
    expect(l.top + l.height).toBeLessThanOrEqual(760 - phone.bottomInset);
  });

  it('keeps the panel on screen when the rail sits low', () => {
    const l = panelLayout({ ...phone, rowCount: 6, anchorY: 820 });
    expect(l.top + l.height).toBe(phone.viewportHeight - phone.bottomInset);
  });

  it('caps the height on a very short screen (the list scrolls) and never goes above the top inset', () => {
    const l = panelLayout({ viewportHeight: 400, topInset: 60, bottomInset: 60, rowCount: 13, anchorY: 200 });
    expect(l.rowHeight).toBe(MIN_ROW_PX);
    expect(l.height).toBe(400 - 60 - 60);
    expect(l.top).toBe(60);
  });
});

describe('rowIndexAt', () => {
  it('finds the row under the thumb', () => {
    expect(rowIndexAt(100, 100, 40, 5)).toBe(0);
    expect(rowIndexAt(139, 100, 40, 5)).toBe(0);
    expect(rowIndexAt(140, 100, 40, 5)).toBe(1);
    expect(rowIndexAt(299, 100, 40, 5)).toBe(4);
  });

  it('picks the first or last row just outside the list', () => {
    expect(rowIndexAt(90, 100, 40, 5)).toBe(0);
    expect(rowIndexAt(310, 100, 40, 5)).toBe(4);
  });

  it('returns -1 when the thumb is well clear of the list', () => {
    expect(rowIndexAt(40, 100, 40, 5)).toBe(-1);
    expect(rowIndexAt(400, 100, 40, 5)).toBe(-1);
    expect(rowIndexAt(120, 100, 40, 0)).toBe(-1);
  });
});

describe('isSlide', () => {
  it('treats a small wobble as a tap and a real move as a slide', () => {
    expect(isSlide(2, 3)).toBe(false);
    expect(isSlide(0, 12)).toBe(true);
  });
});
