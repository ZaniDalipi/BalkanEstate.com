/**
 * Cloudinary → R2 migration: finding Cloudinary URLs in documents and
 * deciding which user / listing folder each photo moves to.
 */
process.env.SKIP_TEST_DB = 'true';

import {
  parseCloudinaryUrl,
  findCloudinaryUrls,
  classifyReference,
  planMigration,
  migratedPhotoId,
} from '../services/media/cloudinaryMigration';

const USER = '64a1b2c3d4e5f6a7b8c9d0e1';
const LISTING = '6650aa11bb22cc33dd44ee55';

describe('parseCloudinaryUrl', () => {
  it('reads public id and format from a versioned URL', () => {
    expect(parseCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/v1712/balkan-estate/users/a/x_1/photo.jpg')).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/v1712/balkan-estate/users/a/x_1/photo.jpg',
      cloud: 'demo',
      deliveryType: 'upload',
      publicId: 'balkan-estate/users/a/x_1/photo',
      format: 'jpg',
    });
  });

  it('strips transformations and query strings', () => {
    const ref = parseCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/t_be_w480/v1/city.webp?_a=1');
    expect(ref?.publicId).toBe('city');
    expect(ref?.format).toBe('webp');
    expect(parseCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/c_fill,w_200/city-albania-durres')?.publicId).toBe(
      'city-albania-durres'
    );
  });

  it('keeps the delivery type so private files stay private', () => {
    expect(parseCloudinaryUrl('https://res.cloudinary.com/demo/image/authenticated/s--abc--/v1/doc.jpg')?.deliveryType).toBe(
      'authenticated'
    );
  });

  it('ignores non-image and foreign URLs', () => {
    expect(parseCloudinaryUrl('https://res.cloudinary.com/demo/video/upload/v1/clip.mp4')).toBeNull();
    expect(parseCloudinaryUrl('https://example.com/image/upload/v1/a.jpg')).toBeNull();
  });
});

describe('findCloudinaryUrls', () => {
  it('finds every image URL inside HTML', () => {
    const html =
      '<p><img src="https://res.cloudinary.com/demo/image/upload/v1/a.jpg"> and ' +
      "<img src='https://res.cloudinary.com/demo/image/upload/v2/news/b.png'></p>";
    expect(findCloudinaryUrls(html).map((r) => r.publicId)).toEqual(['a', 'news/b']);
  });
});

describe('classifyReference', () => {
  it('files listing photos and floor plans under seller and listing', () => {
    const property = { _id: LISTING, sellerId: USER };
    expect(classifyReference('Property', property, 'images.2.url')).toEqual({
      kind: 'property',
      context: { userId: USER, propertyId: LISTING },
    });
    expect(classifyReference('Property', property, 'imageUrl')?.kind).toBe('property');
    expect(classifyReference('Property', property, 'floorplans.0.url')?.kind).toBe('floorplan');
    expect(classifyReference('Property', property, 'floorplanUrl')?.kind).toBe('floorplan');
  });

  it('files an archive thumbnail with the listing it came from', () => {
    expect(classifyReference('ArchivedListing', { _id: 'arch', sellerId: USER, originalPropertyId: LISTING }, 'thumbnailUrl')).toEqual({
      kind: 'property',
      context: { userId: USER, propertyId: LISTING },
    });
  });

  it('knows avatars, licences, credentials, agencies and chats', () => {
    expect(classifyReference('User', { _id: USER }, 'avatarUrl')?.kind).toBe('avatar');
    expect(classifyReference('User', { _id: USER }, 'agentLicense.documentUrl')?.kind).toBe('license');
    expect(
      classifyReference('Agent', { _id: 'ag', userId: USER, credentials: [{ _id: 'c1' }] }, 'credentials.0.documentUrl')
    ).toEqual({ kind: 'credential', context: { userId: USER, credentialId: 'c1' } });
    expect(classifyReference('Agency', { _id: 'a1', ownerId: USER }, 'logo')?.kind).toBe('agency-logo');
    expect(classifyReference('Agency', { _id: 'a1', ownerId: USER }, 'coverImage')?.kind).toBe('agency-cover');
    expect(classifyReference('Message', { _id: 'm', conversationId: 'conv', senderId: USER }, 'imageUrl')).toEqual({
      kind: 'message',
      context: { conversationId: 'conv', userId: USER },
    });
  });

  it('returns null when it cannot tell whose a photo is', () => {
    expect(classifyReference('Property', { _id: LISTING }, 'description')).toBeNull();
    expect(classifyReference('SomethingElse', { _id: 'x' }, 'pic')).toBeNull();
  });
});

describe('planMigration', () => {
  it('puts a listing photo in its user/listing folder under a deterministic id', () => {
    const plan = planMigration(
      { publicId: 'balkan-estate/users/a/x/listings/y/photos/p1', deliveryType: 'upload' },
      { kind: 'property', context: { userId: USER, propertyId: LISTING } }
    );
    expect(plan.key).toBe(`users/${USER}/listings/${LISTING}/photos/${migratedPhotoId('balkan-estate/users/a/x/listings/y/photos/p1')}`);
    expect(plan.bucket).toBe('public');
    // same input → same key, so a re-run overwrites instead of duplicating
    expect(migratedPhotoId('a')).toBe(migratedPhotoId('a'));
    expect(migratedPhotoId('a')).not.toBe(migratedPhotoId('b'));
  });

  it('keeps documents and anything Cloudinary served privately in the private bucket', () => {
    expect(planMigration({ publicId: 'doc', deliveryType: 'upload' }, { kind: 'license', context: { userId: USER } }).bucket).toBe('private');
    expect(planMigration({ publicId: 'doc', deliveryType: 'authenticated' }, null).bucket).toBe('private');
  });

  it('sends convention city photos to their fixed folder and the rest to legacy/', () => {
    expect(planMigration({ publicId: 'city-albania-durres', deliveryType: 'upload' }, null)).toMatchObject({
      key: 'cities/convention/city-albania-durres',
      kind: 'city',
    });
    expect(planMigration({ publicId: 'balkan-estate/site/promo', deliveryType: 'upload' }, null)).toMatchObject({
      key: 'legacy/balkan-estate/site/promo',
      kind: 'legacy',
    });
  });
});
