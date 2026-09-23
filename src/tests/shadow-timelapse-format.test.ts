import { describe, it, expect } from 'vitest';
import { formatTime } from '../features/map/hooks/useShadowTimelapse';

describe('formatTime', () => {
  it('carries rounded minutes into the hour instead of printing ":60"', () => {
    expect(formatTime(6 + 59.7 / 60)).toBe('7:00 AM');
    expect(formatTime(11 + 59.9 / 60)).toBe('12:00 PM');
    expect(formatTime(23 + 59.9 / 60)).toBe('12:00 AM');
  });

  it('formats ordinary times', () => {
    expect(formatTime(0)).toBe('12:00 AM');
    expect(formatTime(9.5)).toBe('9:30 AM');
    expect(formatTime(17.9)).toBe('5:54 PM');
  });
});
