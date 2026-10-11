/**
 * R2 media layout: which stored size serves a display request, where each kind
 * of photo lives in the bucket, and which files sharp makes for one photo —
 * only the sizes it needs, nothing stored twice.
 */
process.env.SKIP_TEST_DB = 'true';

import sharp from 'sharp';
import {
  pickVariantFile,
  parseMediaUrl,
  mediaFileUrl,
  snapMediaWidth,
  variantWidthsFor,
  variantFilesFor,
  withSizeCap,
  sizeCapOf,
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
import { cacheControlFor } from '../services/media/r2MediaStore';
import { classifyReference } from '../services/media/cloudinaryMigration';

const USER = '64a1b2c3d4e5f6a7b8c9d0e1';
const LISTING = '6650aa11bb22cc33dd44ee55';
const BASE = 'https://media.example.com';

describe('pickVariantFile', () => {
  it('serves a width request from the stored size at or above it', () => {
    expect(pickVariantFile({ width: 600 })).toBe('w640.webp');
    expect(pickVariantFile({ width: 640 })).toBe('w640.webp');
    expect(pickVariantFile({ width: 900 })).toBe('w1280.webp');
    expect(pickVariantFile({ width: 5000 })).toBe('w1920.webp');
    expect(pickVariantFile({})).toBe('w1920.webp');
  });

  it('serves a box with a width wide enough that a 16:9 photo covers it', () => {
    expect(pickVariantFile({ width: 400, height: 300 })).toBe('w640.webp');
    expect(pickVariantFile({ width: 300, height: 600 })).toBe('w1280.webp');
    expect(pickVariantFile({ width: 1200, height: 300 })).toBe('w1280.webp');
  });

  it('maps blur to the placeholder and jpg to the JPEG master', () => {
    expect(pickVariantFile({ width: 40, blur: true })).toBe('lqip.webp');
    expect(pickVariantFile({ width: 1200, height: 630, format: 'jpg' })).toBe('original.jpg');
  });

  it('never asks for more than the photo has', () => {
    expect(pickVariantFile({ width: 1600 }, `users/${USER}/avatar/abc_w640`)).toBe('w640.webp');
    expect(pickVariantFile({ width: 100 }, `users/${USER}/avatar/abc_w640`)).toBe('w160.webp');
  });

  it('snaps widths up and caps at the largest', () => {
    expect(snapMediaWidth(1)).toBe(160);
    expect(snapMediaWidth(161)).toBe(320);
    expect(snapMediaWidth(99999)).toBe(1920);
  });
});

describe('sizes per photo', () => {
  it('stores every width below the master plus one at its full width', () => {
    expect(variantWidthsFor(1920)).toEqual([160, 320, 640, 1280, 1920]);
    expect(variantWidthsFor(1536)).toEqual([160, 320, 640, 1280, 1920]);
    expect(variantWidthsFor(1280)).toEqual([160, 320, 640, 1280]);
    expect(variantWidthsFor(400)).toEqual([160, 320, 640]);
    expect(variantWidthsFor(100)).toEqual([160]);
    expect(variantFilesFor(400)).toEqual(['original.jpg', 'w160.webp', 'w320.webp', 'w640.webp', 'lqip.webp']);
  });

  it('records the largest stored size in the folder name', () => {
    expect(withSizeCap('users/u/avatar/abc', 640)).toBe('users/u/avatar/abc_w640');
    expect(withSizeCap('users/u/listings/l/photos/abc', 1920)).toBe('users/u/listings/l/photos/abc');
    expect(sizeCapOf('users/u/avatar/abc_w640')).toBe(640);
    expect(sizeCapOf('users/u/listings/l/photos/abc')).toBe(1920);
  });
});

describe('parseMediaUrl', () => {
  const key = `users/zani_${USER}/listings/flat_${LISTING}/photos/abc123`;

  it('splits a URL on our origin into photo key and file', () => {
    expect(parseMediaUrl(`${BASE}/${key}/w640.webp`, BASE)).toEqual({ photoKey: key, file: 'w640.webp' });
    expect(parseMediaUrl(`${BASE}/${key}/original.jpg?x=1`, `${BASE}/`)).toEqual({ photoKey: key, file: 'original.jpg' });
  });

  it('refuses other hosts, unknown files and lookalike origins', () => {
    expect(parseMediaUrl(`https://elsewhere.com/${key}/w640.webp`, BASE)).toBeNull();
    expect(parseMediaUrl(`${BASE}/${key}/evil.svg`, BASE)).toBeNull();
    expect(parseMediaUrl(`${BASE}.attacker.io/${key}/w640.webp`, BASE)).toBeNull();
    expect(parseMediaUrl(`${BASE}/original.jpg`, BASE)).toBeNull();
    expect(parseMediaUrl(`${BASE}/${key}/w640.webp`, '')).toBeNull();
  });

  it('round-trips with mediaFileUrl', () => {
    const url = mediaFileUrl(`${BASE}/`, key, 'w320.webp');
    expect(url).toBe(`${BASE}/${key}/w320.webp`);
    expect(parseMediaUrl(url, BASE)?.photoKey).toBe(key);
  });
});

describe('mediaFolder — named folders per user and listing', () => {
  it('files listing photos under the user and the listing, by name and id', () => {
    const ctx = { userId: USER, userName: 'Zani Dalipi', propertyId: LISTING, propertyTitle: 'House in Split', propertyRef: 'AB-123' };
    expect(mediaFolder('property', ctx)).toBe(`users/zani-dalipi_${USER}/listings/house-in-split-ab-123_${LISTING}/photos`);
    expect(mediaFolder('floorplan', ctx)).toBe(`users/zani-dalipi_${USER}/listings/house-in-split-ab-123_${LISTING}/floorplans`);
  });

  it('falls back to ids when no names are known', () => {
    expect(mediaFolder('property', { userId: USER, propertyId: LISTING })).toBe(`users/${USER}/listings/${LISTING}/photos`);
  });

  it('puts uploads made before the listing exists in the user\'s drafts', () => {
    expect(mediaFolder('property', { userId: USER, userName: 'Zani' })).toBe(`users/zani_${USER}/listings/drafts/photos`);
    expect(listingMediaFolder({ userId: USER }, 'floorplans')).toBe(`users/${USER}/listings/drafts/floorplans`);
    expect(isDraftListingKey(`users/zani_${USER}/listings/drafts/photos/x1`)).toBe(true);
    expect(isDraftListingKey(`users/zani_${USER}/listings/flat_${LISTING}/photos/x1`)).toBe(false);
  });

  it('places every other kind by its owner', () => {
    expect(mediaFolder('avatar', { userId: USER, userName: 'Zani' })).toBe(`users/zani_${USER}/avatar`);
    expect(mediaFolder('license', { userId: USER })).toBe(`users/${USER}/documents/license`);
    expect(mediaFolder('credential', { userId: USER, credentialId: 'c1' })).toBe(`users/${USER}/documents/credentials/c1`);
    expect(mediaFolder('agency-logo', { agencyId: 'a1', agencyName: 'Kranje Agency' })).toBe('agencies/kranje-agency_a1/logo');
    expect(mediaFolder('business-banner', { businessListingId: 'b1' })).toBe('businesses/b1/banner');
    expect(mediaFolder('message', { conversationId: 'conv1' })).toBe('messages/conv1');
    expect(mediaFolder('city', { country: 'North Macedonia', city: 'Ohër' })).toBe('cities/north-macedonia/oher');
    expect(mediaFolder('destination', { country: 'Albania', city: 'Theth' })).toBe('destinations/albania/theth');
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

describe('cacheControlFor', () => {
  it('caches photos forever, except the overwritable convention city photos and private files', () => {
    expect(cacheControlFor(`users/${USER}/avatar/x1`, 'public')).toBe('public, max-age=31536000, immutable');
    expect(cacheControlFor('cities/convention/city-albania-tirana', 'public')).toBe('public, max-age=86400');
    expect(cacheControlFor(`users/${USER}/documents/license/x1`, 'private')).toBe('private, no-store');
  });
});

describe('villa destinations in the migration', () => {
  it('go to destinations/{country}/{name}', () => {
    expect(classifyReference('VillaDestination', { _id: 'd1', name: 'Theth', country: 'Albania' }, 'imageUrl')).toEqual({
      kind: 'destination',
      context: { country: 'Albania', city: 'Theth' },
    });
  });
});

describe('generatePhotoFiles', () => {
  const photo = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } }).png().toBuffer();

  it('stores the master, every needed width and the placeholder', async () => {
    const master = await buildMaster(await photo(3000, 2000));
    expect([master.width, master.height]).toEqual([1920, 1280]);

    const result = await generatePhotoFiles(master);
    expect(result.files.map((f) => f.file)).toEqual(variantFilesFor(1920));
    expect(result.largestWidth).toBe(1920);
    expect(result.totalBytes).toBe(result.files.reduce((n, f) => n + f.body.length, 0));
    expect(result.contentHash).toMatch(/^[a-f0-9]{40}$/);

    const w640 = await sharp(result.files.find((f) => f.file === 'w640.webp')!.body).metadata();
    expect([w640.width, w640.height, w640.format]).toEqual([640, 427, 'webp']);
  });

  it('stores a small photo once — no copies at sizes it does not have', async () => {
    const result = await generatePhotoFiles(await buildMaster(await photo(400, 400)));
    expect(result.files.map((f) => f.file)).toEqual(['original.jpg', 'w160.webp', 'w320.webp', 'w640.webp', 'lqip.webp']);
    expect(result.largestWidth).toBe(640);
    const full = await sharp(result.files.find((f) => f.file === 'w640.webp')!.body).metadata();
    expect(full.width).toBe(400); // the photo at its own width, never enlarged
  });

  it('stores only the master for private documents', async () => {
    const result = await generatePhotoFiles(await buildMaster(await photo(800, 600)), { masterOnly: true });
    expect(result.files.map((f) => f.file)).toEqual(['original.jpg']);
  });

  it('rejects things that are not images', async () => {
    await expect(buildMaster(Buffer.from('not an image'))).rejects.toThrow();
    await expect(buildMaster(Buffer.alloc(0))).rejects.toThrow('Empty');
  });
});
