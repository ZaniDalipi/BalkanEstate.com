import { describe, it, expect } from 'vitest';
import { formatMarkerPrice } from './formatMarkerPrice';

describe('formatMarkerPrice', () => {
  it('shows thousands with one decimal, never rounding up', () => {
    expect(formatMarkerPrice(223_972)).toBe('€223.9K');
    expect(formatMarkerPrice(189_999)).toBe('€189.9K');
    expect(formatMarkerPrice(85_550)).toBe('€85.5K');
  });

  it('drops a zero decimal', () => {
    expect(formatMarkerPrice(150_000)).toBe('€150K');
    expect(formatMarkerPrice(150_040)).toBe('€150K');
  });

  it('shows millions with up to two decimals, never rounding up', () => {
    expect(formatMarkerPrice(1_000_000)).toBe('€1M');
    expect(formatMarkerPrice(1_249_000)).toBe('€1.24M');
    expect(formatMarkerPrice(1_150_000)).toBe('€1.15M');
    expect(formatMarkerPrice(1_500_000)).toBe('€1.5M');
    expect(formatMarkerPrice(12_345_678)).toBe('€12.34M');
  });

  it('shows small prices in full', () => {
    expect(formatMarkerPrice(450)).toBe('€450');
  });

  it('labels negotiable and missing prices', () => {
    expect(formatMarkerPrice({ price: 300_000, isNegotiable: true })).toBe('Negotiable');
    expect(formatMarkerPrice({ price: 0 })).toBe('Negotiable');
    expect(formatMarkerPrice({})).toBe('Negotiable');
  });

  it('accepts a property', () => {
    expect(formatMarkerPrice({ price: 564_300 })).toBe('€564.3K');
  });
});
