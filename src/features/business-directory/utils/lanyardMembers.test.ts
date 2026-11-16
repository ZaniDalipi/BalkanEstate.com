import { describe, it, expect } from 'vitest';
import { toLanyardMembers, shortBio, factsBio, badgeTags, MAX_LANYARDS } from './lanyardMembers';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { CARD_TONES, toneFor, toneIndex } from './shareCard/shareCardData';

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
  facts: {
    locatedIn: (role: string, place: string) => `${role} in ${place}.`,
    serves: (areas: string) => `Serves ${areas}.`,
    speaks: (languages: string) => `Speaks ${languages}.`,
    established: (year: number) => `Est. ${year}`,
    memberSince: (year: number) => `Member since ${year}`,
  },
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
      tags: ['Verified', 'Deep clean'], tone: toneIndex('id1') + 1,
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
    // No description: the back says what and where instead of staying empty.
    expect(m?.bio).toBe('role:cleaning in Pula, Croatia.');
  });

  it('gives each professional their own colour, the one their share card uses', () => {
    const out = toLanyardMembers([listing({ id: 'abc' }), listing({ id: 'p1' })], map);
    expect(out.map((m) => m.tone)).toEqual([toneIndex('abc') + 1, toneIndex('p1') + 1]);
    expect(toneIndex('abc')).toBe(4); // the backend's toneIndex('abc') is 4 too (individual-share-card.test.ts)
    expect(toneFor('abc')).toBe(CARD_TONES[4]);
  });
});

describe('shortBio', () => {
  it('collapses whitespace and trims long text at a word', () => {
    expect(shortBio('  a   b ')).toBe('a b');
    expect(shortBio('one two three four five', 16)).toBe('one two three…');
    expect(shortBio('Tours, hotels, and more. Captivate everyone', 25)).toBe('Tours, hotels, and more…');
    expect(shortBio('')).toBeUndefined();
  });
});

describe('factsBio', () => {
  it('summarises place, other areas served, languages and founding year', () => {
    const l = listing({ serviceAreas: ['Pula', 'Rovinj', 'Poreč', 'Umag'], languages: ['Croatian', 'English', 'Italian', 'German'], yearEstablished: 2019 });
    expect(factsBio(l, 'Cleaning', map.facts)).toBe('Cleaning in Pula, Croatia. Serves Rovinj, Poreč. Speaks Croatian, English, Italian. Est. 2019');
  });
  it('is just the role when there is no place', () => {
    expect(factsBio(listing({ city: '', country: '' }), 'Cleaning', map.facts)).toBe('Cleaning');
  });
});

describe('badgeTags', () => {
  it('fills free slots with price, founding year, a language and member since', () => {
    const l = listing({ priceRange: '$$', yearEstablished: 2019, languages: ['English'], createdAt: '2024-05-01T00:00:00Z' });
    expect(badgeTags(l, map)).toEqual(['$$', 'Est. 2019']);
    expect(badgeTags(listing({ createdAt: '2024-05-01T00:00:00Z' }), map)).toEqual(['Member since 2024']);
  });
  it('keeps Verified and services first, without duplicates, at most two', () => {
    const l = listing({ isVerified: true, services: ['Windows', 'Windows', ' '], priceRange: '$' });
    expect(badgeTags(l, map)).toEqual(['Verified', 'Windows']);
  });
});
