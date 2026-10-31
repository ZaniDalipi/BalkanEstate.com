import { describe, expect, it } from 'vitest';
import { DRAG_SLOP, SHEET_SHARE, backdropStrength, clampSheetY, dragIntent, sheetGeometry, snapAfterRelease, snapY } from './sheetSnap';

const g = sheetGeometry(800); // sheet 720 tall, half → 360 down, closed → 720

describe('sheetGeometry', () => {
  it('is as tall as full, and half leaves the share the building needs', () => {
    expect(g).toEqual({ sheetHeight: 720, halfY: 280, closedY: 720 });
    expect(g.sheetHeight - g.halfY).toBe(Math.round(800 * SHEET_SHARE.half));
  });
  it('maps each snap to an offset', () => {
    expect([snapY('full', g), snapY('half', g), snapY('closed', g)]).toEqual([0, 280, 720]);
  });
});

describe('clampSheetY', () => {
  it('never goes above full or below the closed position', () => {
    expect(clampSheetY(-40, g)).toBe(0);
    expect(clampSheetY(900, g)).toBe(720);
    expect(clampSheetY(300, g)).toBe(300);
  });
});

describe('snapAfterRelease', () => {
  it('lets go near half and it stays half', () => expect(snapAfterRelease(300, 0, g)).toBe('half'));
  it('pulled well up it goes full, and a flick up does too', () => {
    expect(snapAfterRelease(100, 0, g)).toBe('full');
    expect(snapAfterRelease(250, -900, g)).toBe('full');
  });
  it('pulled well down from half it closes, and a flick down does too', () => {
    expect(snapAfterRelease(520, 0, g)).toBe('closed');
    expect(snapAfterRelease(320, 900, g)).toBe('closed');
  });
  it('a short pull down from half does not close it', () => expect(snapAfterRelease(340, 0, g)).toBe('half'));
  it('from full, a short pull down goes back to half, a long one closes', () => {
    expect(snapAfterRelease(200, 0, g)).toBe('half');
    expect(snapAfterRelease(600, 300, g)).toBe('closed');
  });
});

describe('dragIntent', () => {
  const base = { inContent: true, size: 'half' as const, scrollTop: 0 };
  it('waits until the finger has really moved, so a tap stays a tap', () => {
    expect(dragIntent({ ...base, dy: DRAG_SLOP - 1 })).toBe('wait');
    expect(dragIntent({ ...base, dy: -(DRAG_SLOP - 1) })).toBe('wait');
  });
  it('the handle always drags, either way', () => {
    expect(dragIntent({ inContent: false, size: 'full', scrollTop: 400, dy: 20 })).toBe('drag');
    expect(dragIntent({ inContent: false, size: 'half', scrollTop: 0, dy: -20 })).toBe('drag');
  });
  it('at half height the content does not scroll: any vertical move drags the sheet', () => {
    expect(dragIntent({ ...base, dy: -30 })).toBe('drag');
    expect(dragIntent({ ...base, dy: 30 })).toBe('drag');
  });
  it('at full height the content scrolls, and only a pull down from its top drags the sheet', () => {
    expect(dragIntent({ inContent: true, size: 'full', scrollTop: 0, dy: 30 })).toBe('drag');
    expect(dragIntent({ inContent: true, size: 'full', scrollTop: 0, dy: -30 })).toBe('scroll');
    expect(dragIntent({ inContent: true, size: 'full', scrollTop: 120, dy: 30 })).toBe('scroll');
  });
});

describe('dragIntent — sideways', () => {
  it('leaves a mostly horizontal swipe (the photo gallery) to the content', () => {
    expect(dragIntent({ inContent: true, size: 'half', scrollTop: 0, dy: 10, dx: 40 })).toBe('scroll');
    expect(dragIntent({ inContent: false, size: 'half', scrollTop: 0, dy: 10, dx: 40 })).toBe('scroll');
    expect(dragIntent({ inContent: true, size: 'half', scrollTop: 0, dy: 40, dx: 10 })).toBe('drag');
  });
});

describe('backdropStrength', () => {
  it('is strongest at full, light at half and gone when closed, in step with the sheet', () => {
    expect(backdropStrength(0, g)).toBe(1);
    expect(backdropStrength(g.halfY, g)).toBeCloseTo(0.2);
    expect(backdropStrength(g.closedY, g)).toBe(0);
    expect(backdropStrength(g.halfY / 2, g)).toBeGreaterThan(0.2);
    expect(backdropStrength(500, g)).toBeLessThan(0.2);
  });
});
