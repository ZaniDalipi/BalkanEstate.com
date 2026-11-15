import { describe, it, expect } from 'vitest';
import { toLanyardMembers, shortBio, MAX_LANYARDS } from './lanyardMembers';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';

const listing = (over: Partial<BusinessListing>): BusinessListing => ({
  id: 'id1', owner: {}, listingType: 'individual', name: 'Ana', slug: 'ana', category: 'cleaning',
  services: [], contactPhone: '', city: 'Pula', country: 'Croatia', isVerified: false,
  ...over,
} as BusinessListing);

const map = {
  roleOf: (l: BusinessListing) => `role:${l.category}`,
  imageOf: (l: BusinessListing) => `img:${l.id}`,
  profileHrefOf: (l: BusinessListing) => `/en/business-directory/${l.slug}`,
  labels: { profile: 'Profile', email: 'Email', call: 'Call', verified: 'Verified' },
};

describe('toLanyardMembers', () => {
  it('keeps individuals only, up to the rail limit', () => {
    const many = Array.from({ length: 12 }, (_, i) => listing({ id: `p${i}` }));
    const out = toLanyardMembers([listing({ id: 'b', listingType: 'business' }), ...many], map);
    expect(out).toHaveLength(MAX_LANYARDS);
    expect(out.every((m) => m.id.startsWith('p'))).toBe(true);
  });

  it('maps a listing to a badge with its contact links', () => {
    const [m] = toLanyardMembers([listing({
      contactEmail: 'ana@example.com', contactPhone: '+385 91 234 5678', isVerified: true,
      services: ['Deep clean', 'Windows', 'Moves'], description: 'Tidy homes.',
    })], map);
    expect(m).toMatchObject({
      id: 'id1', name: 'Ana', role: 'role:cleaning', team: 'Pula, Croatia', image: 'img:id1', bio: 'Tidy homes.',
      tags: ['Verified', 'Deep clean', 'Windows'], tone: 1,
    });
    expect(m?.links).toEqual([
      { label: 'Profile', href: '/en/business-directory/ana' },
      { label: 'Email', href: 'mailto:ana@example.com' },
      { label: 'Call', href: 'tel:+385912345678' },
    ]);
  });

  it('leaves out contact links it has no data for', () => {
    const [m] = toLanyardMembers([listing({})], map);
    expect(m?.links).toEqual([{ label: 'Profile', href: '/en/business-directory/ana' }]);
    expect(m?.bio).toBeUndefined();
  });

  it('cycles the five tones', () => {
    const out = toLanyardMembers(Array.from({ length: 6 }, (_, i) => listing({ id: `p${i}` })), map);
    expect(out.map((m) => m.tone)).toEqual([1, 2, 3, 4, 5, 1]);
  });
});

describe('shortBio', () => {
  it('collapses whitespace and trims long text at a word', () => {
    expect(shortBio('  a   b ')).toBe('a b');
    expect(shortBio('one two three four five', 16)).toBe('one two three…');
    expect(shortBio('')).toBeUndefined();
  });
});
