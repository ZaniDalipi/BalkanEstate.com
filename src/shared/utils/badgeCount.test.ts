import { describe, it, expect } from 'vitest';
import { formatBadgeCount } from './badgeCount';

describe('formatBadgeCount', () => {
  it('hides zero, negatives and non-numbers', () => {
    expect(formatBadgeCount(0)).toBeNull();
    expect(formatBadgeCount(-2)).toBeNull();
    expect(formatBadgeCount(NaN)).toBeNull();
    expect(formatBadgeCount('3')).toBeNull();
  });
  it('shows whole counts and caps large ones', () => {
    expect(formatBadgeCount(3.7)).toBe('3');
    expect(formatBadgeCount(150)).toBe('99+');
  });
});
