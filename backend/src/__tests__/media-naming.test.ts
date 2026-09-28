/**
 * Cloudinary folder names must be readable (name first, filed A–Z) and still
 * unique (id always present), and every asset must carry the id tags cleanup
 * deletes by.
 */
process.env.SKIP_TEST_DB = 'true';

import {
  buildMediaFolder,
  letterBucket,
  mediaTags,
  namedSegment,
  slugify,
} from '../services/media/mediaNaming';

const USER_ID = '64a1b2c3d4e5f6a7b8c9d0e1';
const PROPERTY_ID = '6650aa11bb22cc33dd44ee55';

describe('slugify', () => {
  it('strips accents and punctuation', () => {
    expect(slugify('Ëndrit Hoxha')).toBe('endrit-hoxha');
    expect(slugify('Cozy 2BR in Tëtovo!')).toBe('cozy-2br-in-tetovo');
  });

  it('returns empty for nothing usable', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify(undefined)).toBe('');
  });
});

describe('letterBucket', () => {
  it('files by first letter, digits and symbols together', () => {
    expect(letterBucket('john-doe_1')).toBe('j');
    expect(letterBucket('2br-flat_1')).toBe('0-9');
    expect(letterBucket('')).toBe('_');
  });
});

describe('namedSegment', () => {
  it('puts the name first and keeps the id', () => {
    expect(namedSegment('John Doe', USER_ID)).toBe(`john-doe_${USER_ID}`);
  });

  it('falls back to the id alone', () => {
    expect(namedSegment(undefined, USER_ID)).toBe(USER_ID);
  });
});

describe('buildMediaFolder', () => {
  const owner = { userId: USER_ID, userName: 'John Doe', propertyId: PROPERTY_ID, propertyTitle: 'Sea View Villa' };

  it('files listing photos under the user letter, name and listing title', () => {
    expect(buildMediaFolder('property', owner)).toBe(
      `balkan-estate/users/j/john-doe_${USER_ID}/listings/sea-view-villa_${PROPERTY_ID}/photos`
    );
  });

  it('keeps floor plans and videos beside the photos', () => {
    expect(buildMediaFolder('floorplan', owner)).toMatch(/\/listings\/sea-view-villa_[a-f0-9]+\/floorplans$/);
    expect(buildMediaFolder('video', owner)).toMatch(/\/listings\/sea-view-villa_[a-f0-9]+\/videos$/);
  });

  it('uploads before the listing exists go to temp (swept after 48h)', () => {
    expect(buildMediaFolder('property', { userId: USER_ID, userName: 'John Doe' })).toBe(
      `balkan-estate/users/j/john-doe_${USER_ID}/listings/temp`
    );
  });

  it('files agencies and businesses A–Z too', () => {
    expect(buildMediaFolder('agency-logo', { userId: USER_ID, agencyId: 'a1', agencyName: 'Adriatic Homes' })).toBe(
      'balkan-estate/agencies/a/adriatic-homes_a1/logo'
    );
    expect(buildMediaFolder('business-banner', { userId: USER_ID, businessListingId: 'b1', businessName: 'Zen Movers' })).toBe(
      'balkan-estate/businesses/z/zen-movers_b1/banner'
    );
  });

  it('never lets a name escape its folder', () => {
    const folder = buildMediaFolder('avatar', { userId: USER_ID, userName: '../../etc/passwd' });
    expect(folder).toBe(`balkan-estate/users/e/etc-passwd_${USER_ID}/avatar`);
  });
});

describe('mediaTags', () => {
  it('tags owner, listing and kind so cleanup can find them after renames', () => {
    expect(mediaTags('property', { userId: USER_ID, propertyId: PROPERTY_ID })).toEqual([
      'kind_property',
      `owner_${USER_ID}`,
      `listing_${PROPERTY_ID}`,
    ]);
  });

  it('skips placeholder owners that are not real users', () => {
    expect(mediaTags('ad-banner', { userId: 'public-advertising' })).toEqual(['kind_ad-banner']);
  });
});
