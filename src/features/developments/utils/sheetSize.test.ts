import { describe, it, expect } from 'vitest';
import { SHEET_DRAG_THRESHOLD, sheetAfterDrag } from './sheetSize';

describe('sheetAfterDrag', () => {
  it('dragging up opens it fully', () => {
    expect(sheetAfterDrag('half', -SHEET_DRAG_THRESHOLD)).toBe('full');
    expect(sheetAfterDrag('full', -200)).toBe('full');
  });

  it('dragging down shrinks a full sheet, and closes a half one', () => {
    expect(sheetAfterDrag('full', SHEET_DRAG_THRESHOLD)).toBe('half');
    expect(sheetAfterDrag('half', 120)).toBe('close');
  });

  it('a small drag keeps the size', () => {
    expect(sheetAfterDrag('half', 20)).toBe('half');
    expect(sheetAfterDrag('full', -20)).toBe('full');
  });
});
