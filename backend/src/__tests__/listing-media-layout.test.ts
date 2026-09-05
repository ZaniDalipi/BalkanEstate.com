/**
 * Where a listing's images actually live, and whether deleting the listing
 * finds them again.
 *
 * The layout is load-bearing in two directions. Uploads write into it, and
 * cleanup has to address the same folder later — and cleanup failing is silent:
 * the property row disappears, the request succeeds, and the images stay in the
 * zone being paid for month after month with nothing pointing at them.
 *
 * The subtle part is the slug. A listing folder is `{propertyId}-{slug}`, so
 * the id alone does not name a directory. Cloudinary's `api.resources({prefix})`
 * was a genuine prefix search and papered over that; Bunny's list endpoint
 * returns the contents of one exact directory, so the id has to be matched
 * against the parent's entries instead.
 */

// No collection is touched — every model below is mocked.
process.env.SKIP_TEST_DB = 'true';
process.env.BUNNY_PULL_ZONE_HOST = 'test-zone.b-cdn.net';
process.env.BUNNY_STORAGE_ZONE = 'test-zone';
process.env.BUNNY_STORAGE_PASSWORD = 'test-password';

const storage = {
  putObject: jest.fn().mockResolvedValue(undefined),
  getObject: jest.fn().mockResolvedValue(Buffer.from('bytes')),
  deleteObject: jest.fn().mockResolvedValue(true),
  objectExists: jest.fn().mockResolvedValue(true),
  listObjects: jest.fn().mockResolvedValue([]),
  deleteFolderRecursive: jest.fn().mockResolvedValue([]),
  deleteFoldersMatching: jest.fn().mockResolvedValue([]),
  moveObject: jest.fn().mockResolvedValue(true),
};
jest.mock('../services/bunnyStorageService', () => ({ __esModule: true, ...storage }));

jest.mock('../services/storageAccessPolicy', () => ({
  __esModule: true,
  registerFileUpload: jest.fn().mockResolvedValue(undefined),
  removeFileRecord: jest.fn().mockResolvedValue(undefined),
  removeAllUserFileRecords: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/watermarkService', () => ({
  __esModule: true,
  applyWatermark: jest.fn(async (buffer: Buffer) => buffer),
}));

import sharp from 'sharp';
import { uploadImage, organizeListingMedia, deleteListingImages } from '../services/imageStorageService';

const USER = '68f2a1c4d9e0b7a3f1c2d3e4';
const LISTING = '691b7c55aa11bb22cc33dd44';

/** A real, tiny JPEG — the upload path runs it through sharp for real. */
const probe = async (): Promise<Buffer> =>
  sharp({ create: { width: 20, height: 20, channels: 3, background: { r: 10, g: 20, b: 30 } } })
    .jpeg()
    .toBuffer();

beforeEach(() => {
  Object.values(storage).forEach(fn => fn.mockClear());
  storage.moveObject.mockResolvedValue(true);
  storage.deleteFoldersMatching.mockResolvedValue([]);
});

describe('where an upload lands', () => {
  it('puts a listing photo in the user temp folder before the listing exists', async () => {
    // The form uploads before the property row is created, so there is no id
    // to file under yet.
    const result = await uploadImage(await probe(), { userId: USER, type: 'property' });

    expect(result.publicId).toMatch(
      new RegExp(`^balkan-estate/users/${USER}/listings/temp/[a-z0-9-]+\\.webp$`),
    );
    expect(storage.putObject).toHaveBeenCalledWith(result.publicId, expect.any(Buffer), 'image/webp');
  });

  it('files it under the listing directly when the id is already known', async () => {
    const result = await uploadImage(await probe(), {
      userId: USER,
      propertyId: LISTING,
      propertyTitle: 'Cozy 2BR in Tëtovo!',
      type: 'property',
    });

    expect(result.publicId.startsWith(
      `balkan-estate/users/${USER}/listings/${LISTING}-cozy-2br-in-tetovo/photos/`,
    )).toBe(true);
  });

  it('keeps floorplans in their own subfolder, beside the photos', async () => {
    const result = await uploadImage(await probe(), {
      userId: USER,
      propertyId: LISTING,
      propertyTitle: 'Cozy 2BR',
      type: 'floorplan',
    });

    expect(result.publicId.startsWith(
      `balkan-estate/users/${USER}/listings/${LISTING}-cozy-2br/floorplans/`,
    )).toBe(true);
  });

  it('returns a CDN URL the browser can render', async () => {
    const result = await uploadImage(await probe(), { userId: USER, type: 'property' });
    expect(result.url).toBe(`https://test-zone.b-cdn.net/${result.publicId}`);
  });
});

describe('moving temp uploads into the listing on create', () => {
  const tempPhoto = `balkan-estate/users/${USER}/listings/temp/aa11.webp`;
  const tempPlan = `balkan-estate/users/${USER}/listings/temp/bb22.webp`;

  it('relocates photos and floorplans into the listing folder', async () => {
    const out = await organizeListingMedia(
      [
        { url: 'https://test-zone.b-cdn.net/' + tempPhoto, publicId: tempPhoto, tag: 'main' },
        { url: 'https://test-zone.b-cdn.net/' + tempPlan, publicId: tempPlan, tag: 'floorplan' },
      ],
      USER,
      LISTING,
      'Cozy 2BR in Tëtovo!',
    );

    const base = `balkan-estate/users/${USER}/listings/${LISTING}-cozy-2br-in-tetovo`;
    expect(out[0].publicId).toBe(`${base}/photos/aa11.webp`);
    expect(out[1].publicId).toBe(`${base}/floorplans/bb22.webp`);
    // The stored URL has to move with the object, or the listing renders a 404.
    expect(out[0].url).toBe(`https://test-zone.b-cdn.net/${base}/photos/aa11.webp`);
  });

  it('leaves an external URL where it is', async () => {
    const external = { url: 'https://images.example/house.jpg', tag: 'other' };
    const [out] = await organizeListingMedia([external], USER, LISTING, 'Cozy 2BR');

    expect(out).toEqual(external);
    expect(storage.moveObject).not.toHaveBeenCalled();
  });

  it('keeps the original reference when a move fails, rather than losing the photo', async () => {
    storage.moveObject.mockResolvedValue(false);

    const ref = { url: 'https://test-zone.b-cdn.net/' + tempPhoto, publicId: tempPhoto, tag: 'main' };
    const [out] = await organizeListingMedia([ref], USER, LISTING, 'Cozy 2BR');

    expect(out).toEqual(ref);
  });

  it('moves a shared publicId once, not once per reference', async () => {
    // The main image usually repeats images[0]; moving twice would fail the
    // second time, the object having already gone.
    const ref = { url: 'https://test-zone.b-cdn.net/' + tempPhoto, publicId: tempPhoto };
    await organizeListingMedia(
      [{ ...ref, tag: 'main' }, { ...ref, tag: 'other' }],
      USER,
      LISTING,
      'Cozy 2BR',
    );

    expect(storage.moveObject).toHaveBeenCalledTimes(1);
  });
});

describe('deleting a listing finds the folder again', () => {
  it('matches the listing by id against the parent, not by naming the folder', async () => {
    // The regression this guards: the folder is `{id}-{slug}`, so addressing
    // `.../listings/{id}` lists a directory that does not exist, reports it
    // empty, and leaves every image in the zone.
    await deleteListingImages(USER, LISTING);

    expect(storage.deleteFoldersMatching).toHaveBeenCalledWith(
      `balkan-estate/users/${USER}/listings`,
      LISTING,
    );
    expect(storage.deleteFolderRecursive).not.toHaveBeenCalled();
  });

  it('forgets the ownership record of everything it removed', async () => {
    const removed = [
      `balkan-estate/users/${USER}/listings/${LISTING}-cozy/photos/a.webp`,
      `balkan-estate/users/${USER}/listings/${LISTING}-cozy/photos/b.webp`,
    ];
    storage.deleteFoldersMatching.mockResolvedValue(removed);

    const { removeFileRecord } = require('../services/storageAccessPolicy');
    await deleteListingImages(USER, LISTING);

    removed.forEach(path => expect(removeFileRecord).toHaveBeenCalledWith(path));
  });
});
