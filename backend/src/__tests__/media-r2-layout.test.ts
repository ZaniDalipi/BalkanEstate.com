/**
 * R2 media layout: which file serves a display request, where each kind of
 * photo lives in the bucket, and what sharp generates for one photo.
 */
process.env.SKIP_TEST_DB = 'true';

import sharp from 'sharp';
import {
  pickVariantFile,
  parseMediaUrl,
  mediaFileUrl,
  snapMediaWidth,
  ALL_VARIANT_FILES,
  MEDIA_WIDTHS,
} from '../config/mediaVariants';
import {
  mediaFolder,
  listingMediaFolder,
  isDraftListingKey,
  newPhotoId,
  photoIdOf,
  legacyKey,
} from '../services/media/mediaKeys';
import { buildMaster, generatePhotoFiles } from '../services/media/imageVariants';
import { tagToAssetFilter } from '../services/cloudinaryService';

const USER = '64a1b2c3d4e5f6a7b8c9d0e1';
const LISTING = '6650aa11bb22cc33dd44ee55';
const BASE = 'https://media.example.com';

describe('pickVariantFile', () => {
  it('serves a width request from the full-photo size at or above it', () => {
    expect(pickVariantFile({ width: 600 })).toBe('w640.webp');
    expect(pickVariantFile({ width: 640 })).toBe('w640.webp');
    expect(pickVariantFile({ width: 5000 })).toBe('w1920.webp');
    expect(pickVariantFile({})).toBe('w1920.webp');
  });

  it('serves a box from a 4:3 crop wide enough to cover it without upscaling', () => {
    // 400×300 is already 4:3
    expect(pickVariantFile({ width: 400, height: 300 })).toBe('c640.webp');
    // a square 300 box needs a 4:3 crop at least 400 wide to cover its height
    expect(pickVariantFile({ width: 300, height: 300 })).toBe('c640.webp');
    // a wide banner only needs its width
    expect(pickVariantFile({ width: 1200, height: 300 })).toBe('c1280.webp');
  });

  it('maps blur to the placeholder and jpg to the share card', () => {
    expect(pickVariantFile({ width: 40, blur: true })).toBe('lqip.webp');
    expect(pickVariantFile({ width: 1200, height: 630, format: 'jpg' })).toBe('og.jpg');
  });

  it('snaps widths up and caps at the largest', () => {
    expect(snapMediaWidth(1)).toBe(160);
    expect(snapMediaWidth(161)).toBe(320);
    expect(snapMediaWidth(99999)).toBe(1920);
  });
});

describe('parseMediaUrl', () => {
  const key = `users/${USER}/listings/${LISTING}/photos/abc123`;

  it('splits a URL on our origin into photo key and file', () => {
    expect(parseMediaUrl(`${BASE}/${key}/c640.webp`, BASE)).toEqual({ photoKey: key, file: 'c640.webp' });
    expect(parseMediaUrl(`${BASE}/${key}/original.jpg?x=1`, `${BASE}/`)).toEqual({ photoKey: key, file: 'original.jpg' });
  });

  it('refuses other hosts, unknown files and lookalike origins', () => {
    expect(parseMediaUrl(`https://elsewhere.com/${key}/c640.webp`, BASE)).toBeNull();
    expect(parseMediaUrl(`${BASE}/${key}/evil.svg`, BASE)).toBeNull();
    expect(parseMediaUrl(`${BASE}.attacker.io/${key}/c640.webp`, BASE)).toBeNull();
    expect(parseMediaUrl(`${BASE}/original.jpg`, BASE)).toBeNull();
    expect(parseMediaUrl(`${BASE}/${key}/c640.webp`, '')).toBeNull();
  });

  it('round-trips with mediaFileUrl', () => {
    const url = mediaFileUrl(`${BASE}/`, key, 'w320.webp');
    expect(url).toBe(`${BASE}/${key}/w320.webp`);
    expect(parseMediaUrl(url, BASE)?.photoKey).toBe(key);
  });
});

describe('mediaFolder — one folder per user, per listing', () => {
  it('files listing photos and floor plans under the user and the listing', () => {
    expect(mediaFolder('property', { userId: USER, propertyId: LISTING })).toBe(`users/${USER}/listings/${LISTING}/photos`);
    expect(mediaFolder('floorplan', { userId: USER, propertyId: LISTING })).toBe(`users/${USER}/listings/${LISTING}/floorplans`);
  });

  it('puts uploads made before the listing exists in the user\'s drafts', () => {
    expect(mediaFolder('property', { userId: USER })).toBe(`users/${USER}/listings/drafts/photos`);
    expect(listingMediaFolder(USER, undefined, 'floorplans')).toBe(`users/${USER}/listings/drafts/floorplans`);
    expect(isDraftListingKey(`users/${USER}/listings/drafts/photos/x1`)).toBe(true);
    expect(isDraftListingKey(`users/${USER}/listings/${LISTING}/photos/x1`)).toBe(false);
  });

  it('places every other kind by its owner id', () => {
    expect(mediaFolder('avatar', { userId: USER })).toBe(`users/${USER}/avatar`);
    expect(mediaFolder('license', { userId: USER })).toBe(`users/${USER}/documents/license`);
    expect(mediaFolder('credential', { userId: USER, credentialId: 'c1' })).toBe(`users/${USER}/documents/credentials/c1`);
    expect(mediaFolder('agency-logo', { agencyId: 'a1' })).toBe('agencies/a1/logo');
    expect(mediaFolder('business-banner', { businessListingId: 'b1' })).toBe('businesses/b1/banner');
    expect(mediaFolder('message', { conversationId: 'conv1' })).toBe('messages/conv1');
    expect(mediaFolder('city', { country: 'North Macedonia', city: 'Ohër' })).toBe('cities/north-macedonia/oher');
    expect(mediaFolder('external', { sourceSlug: 'My Feed', sourceListingId: 'L-9' })).toBe('external/my-feed/L-9');
    expect(mediaFolder('ad-banner', {})).toBe('site/ad-banners');
  });

  it('never lets an id escape its folder', () => {
    expect(mediaFolder('avatar', { userId: '../../etc' })).toBe('users/______etc/avatar');
  });

  it('makes unique, time-sortable photo ids', () => {
    const a = newPhotoId(1_000);
    const b = newPhotoId(2_000_000);
    expect(a).not.toBe(newPhotoId(1_000));
    expect(a < b).toBe(true);
    expect(photoIdOf(`users/${USER}/avatar/${a}`)).toBe(a);
  });

  it('keeps a legacy Cloudinary path readable but safe', () => {
    expect(legacyKey('balkan-estate/site/x y.png')).toBe('legacy/balkan-estate/site/x_y_png');
  });
});

describe('tagToAssetFilter', () => {
  it('maps cleanup tags onto MediaAsset fields', () => {
    expect(tagToAssetFilter(`listing_${LISTING}`)).toEqual({ propertyId: LISTING });
    expect(tagToAssetFilter(`owner_${USER}`)).toEqual({ ownerId: USER });
    expect(tagToAssetFilter('agency_6650aa11bb22cc33dd44ee56')).toEqual({ agencyId: '6650aa11bb22cc33dd44ee56' });
    expect(tagToAssetFilter('kind_avatar')).toEqual({ kind: 'avatar' });
  });

  it('refuses anything that would widen the delete', () => {
    expect(tagToAssetFilter('listing_not-an-id')).toBeNull();
    expect(tagToAssetFilter('something_else')).toBeNull();
  });
});

describe('generatePhotoFiles', () => {
  const photo = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } }).png().toBuffer();

  it('stores the master plus every size, crop, placeholder and share card', async () => {
    const master = await buildMaster(await photo(3000, 2000));
    expect(master.width).toBe(1920);
    expect(master.height).toBe(1280);

    const result = await generatePhotoFiles(master);
    expect(result.files.map((f) => f.file).sort()).toEqual([...ALL_VARIANT_FILES].sort());
    expect(result.totalBytes).toBe(result.files.reduce((n, f) => n + f.body.length, 0));
    expect(result.contentHash).toMatch(/^[a-f0-9]{40}$/);

    const byName = new Map(result.files.map((f) => [f.file, f.body]));
    const w640 = await sharp(byName.get('w640.webp')!).metadata();
    expect([w640.width, w640.height, w640.format]).toEqual([640, 427, 'webp']);
    const c640 = await sharp(byName.get('c640.webp')!).metadata();
    expect([c640.width, c640.height]).toEqual([640, 480]);
    const og = await sharp(byName.get('og.jpg')!).metadata();
    expect([og.width, og.height, og.format]).toEqual([1200, 630, 'jpeg']);
  });

  it('never enlarges a small photo', async () => {
    const result = await generatePhotoFiles(await buildMaster(await photo(500, 500)));
    const byName = new Map(result.files.map((f) => [f.file, f.body]));
    const w1920 = await sharp(byName.get('w1920.webp')!).metadata();
    expect(w1920.width).toBe(500);
    const c1920 = await sharp(byName.get('c1920.webp')!).metadata();
    expect([c1920.width, c1920.height]).toEqual([500, 375]);
  });

  it('stores only the master for private documents', async () => {
    const result = await generatePhotoFiles(await buildMaster(await photo(800, 600)), { masterOnly: true });
    expect(result.files.map((f) => f.file)).toEqual(['original.jpg']);
  });

  it('rejects things that are not images', async () => {
    await expect(buildMaster(Buffer.from('not an image'))).rejects.toThrow();
    await expect(buildMaster(Buffer.alloc(0))).rejects.toThrow('Empty');
  });

  it('generates one webp per width for both families', () => {
    expect(ALL_VARIANT_FILES.filter((f) => f.startsWith('w'))).toHaveLength(MEDIA_WIDTHS.length);
    expect(ALL_VARIANT_FILES.filter((f) => f.startsWith('c'))).toHaveLength(MEDIA_WIDTHS.length);
  });
});
