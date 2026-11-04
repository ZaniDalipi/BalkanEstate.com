import { describe, expect, it } from 'vitest';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { businessJsonLd } from './businessJsonLd';
import { checkImageFile } from '../hooks/useBusinessImageUploads';
import { clampPercent } from '../hooks/useBannerReposition';

const listing = {
  name: 'Regina', contactPhone: '+3550686060190', city: 'Vlore', country: 'Albania', address: 'Rruga 1',
  latitude: 40.45, longitude: 19.48, website: 'reginaconstruction.al', socialMedia: { facebook: 'https://fb.com/r', instagram: '' },
  businessHours: { monday: '08:00 - 17:00', sunday: 'Closed', tuesday: 'By appointment' },
} as unknown as BusinessListing;

describe('businessJsonLd', () => {
  it('describes the business for search engines, leaving out what is unknown', () => {
    const ld = businessJsonLd(listing, 'https://x/b/regina');
    expect(ld).toMatchObject({
      '@type': 'LocalBusiness', name: 'Regina', telephone: '+355686060190',
      geo: { latitude: 40.45, longitude: 19.48 },
      sameAs: ['https://reginaconstruction.al', 'https://fb.com/r'],
      openingHoursSpecification: [{ dayOfWeek: 'Monday', opens: '08:00', closes: '17:00' }],
    });
    expect(ld).not.toHaveProperty('email');
    expect(ld).not.toHaveProperty('priceRange');
  });
});

describe('owner image tools', () => {
  it('accepts JPEG/PNG/WebP up to 5 MB, and says why it refuses', () => {
    expect(checkImageFile({ type: 'image/png', size: 1000 })).toEqual({ ok: true });
    expect(checkImageFile({ type: 'image/gif', size: 1000 })).toEqual({ ok: false, reason: 'type' });
    expect(checkImageFile({ type: 'image/jpeg', size: 6 * 1024 * 1024 })).toEqual({ ok: false, reason: 'size' });
  });

  it('keeps the banner position inside 0–100 %', () => {
    expect(clampPercent(-20)).toBe(0);
    expect(clampPercent(140)).toBe(100);
    expect(clampPercent(42)).toBe(42);
  });
});
