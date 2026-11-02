import { describe, expect, it } from 'vitest';
import { shouldDismissSheet } from './sheetDismiss';

describe('shouldDismissSheet', () => {
  it('closes on a long pull or a quick flick down, and springs back otherwise', () => {
    expect(shouldDismissSheet(160, 0)).toBe(true);
    expect(shouldDismissSheet(60, 900)).toBe(true);
    expect(shouldDismissSheet(60, 100)).toBe(false);
    // A flick that has not really moved yet (a tap) stays open; so does pulling up.
    expect(shouldDismissSheet(10, 900)).toBe(false);
    expect(shouldDismissSheet(-40, -900)).toBe(false);
  });
});
