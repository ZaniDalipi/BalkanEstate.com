import { describe, it, expect } from 'vitest';
import { regionPaint } from './regionPaint';

describe('regionPaint', () => {
  it('clean mode: invisible at rest, translucent fill + light outline when active', () => {
    expect(regionPaint({ mode: 'clean', state: 'available', active: false }).stroke).toBe('transparent');
    const on = regionPaint({ mode: 'clean', state: 'available', active: true });
    expect(on.fill).toBe('rgba(20,184,166,0.5)');
    expect(on.stroke).toBe('rgba(255,255,255,0.92)');
  });
  it('non-unit regions highlight in the brand teal', () => {
    expect(regionPaint({ mode: 'clean', active: true }).fill).toBe('rgba(13,148,136,0.5)');
  });
  it('availability mode colours at rest with a pattern for non-solid states', () => {
    const p = regionPaint({ mode: 'availability', state: 'reserved', active: false });
    expect(p.fill).toBe('rgba(245,158,11,0.3)');
    expect(p.pattern).toBe(true);
  });
  it('filtered-out units stay hidden even in availability mode', () => {
    expect(regionPaint({ mode: 'availability', state: 'available', active: false, matched: false }).stroke).toBe('transparent');
  });
});
