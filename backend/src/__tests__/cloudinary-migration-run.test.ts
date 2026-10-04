/**
 * The Cloudinary → R2 migration end to end, against MongoDB and an in-memory
 * bucket: photos land in their user/listing folders, every reference (URL,
 * publicId, FileRecord, URLs inside text) is rewritten, and a re-run is a no-op.
 */
const bucket = new Map<string, string>();
const downloads: string[] = [];

jest.mock('@aws-sdk/client-s3', () => {
  class Command {
    constructor(public input: any) {}
  }
  class PutObjectCommand extends Command {}
  class DeleteObjectsCommand extends Command {}
  class CopyObjectCommand extends Command {}
  class GetObjectCommand extends Command {}
  class S3Client {
    async send(cmd: Command) {
      const { input } = cmd as any;
      if (cmd instanceof PutObjectCommand) bucket.set(`${input.Bucket}/${input.Key}`, input.ContentType);
      if (cmd instanceof DeleteObjectsCommand) for (const o of input.Delete.Objects) bucket.delete(`${input.Bucket}/${o.Key}`);
      return {};
    }
  }
  return { S3Client, PutObjectCommand, DeleteObjectsCommand, CopyObjectCommand, GetObjectCommand };
});

jest.mock('../services/cloudinaryService', () => {
  const actual = jest.requireActual('../services/cloudinaryService');
  const sharpLib = jest.requireActual('sharp');
  return {
    ...actual,
    downloadImage: jest.fn(async (url: string) => {
      downloads.push(url);
      if (url.includes('gone')) throw new Error('Image download failed: HTTP 404');
      return sharpLib({ create: { width: 800, height: 600, channels: 3, background: '#88a' } }).jpeg().toBuffer();
    }),
  };
});

process.env.R2_ACCOUNT_ID = 'acct';
process.env.R2_ACCESS_KEY_ID = 'key';
process.env.R2_SECRET_ACCESS_KEY = 'secret';
process.env.R2_BUCKET = 'media';
process.env.R2_PRIVATE_BUCKET = 'media-private';
process.env.R2_PUBLIC_URL = 'https://media.example.com';
process.env.BACKEND_URL = 'https://api.example.com';
process.env.CLOUDINARY_CLOUD_NAME = 'demo';
process.env.CLOUDINARY_API_KEY = 'k';
process.env.CLOUDINARY_API_SECRET = 's';

import mongoose from 'mongoose';
import MediaAsset from '../models/MediaAsset';
import { runMigration } from '../scripts/migrateCloudinaryToR2';
import { migratedPhotoId } from '../services/media/cloudinaryMigration';

const CLD = 'https://res.cloudinary.com/demo/image/upload';
const USER = new mongoose.Types.ObjectId();
const LISTING = new mongoose.Types.ObjectId();
const PHOTO_ID = 'balkan-estate/users/j/jane_x/listings/flat_y/photos/p1';
const PLAN_ID = 'balkan-estate/users/j/jane_x/listings/flat_y/floorplans/f1';
const AVATAR_ID = 'balkan-estate/users/j/jane_x/avatar/a1';
const LICENSE_ID = 'balkan-estate/users/j/jane_x/documents/license/l1';
const BLOG_ID = 'balkan-estate/blog/inline';

const db = () => mongoose.connection.db!;
const quiet = { log: () => undefined };

beforeEach(async () => {
  bucket.clear();
  downloads.length = 0;
  await db().collection('properties').insertOne({
    _id: LISTING,
    sellerId: USER,
    imageUrl: `${CLD}/v1/${PHOTO_ID}.jpg`,
    imagePublicId: PHOTO_ID,
    images: [{ url: `${CLD}/t_be_w480/v1/${PHOTO_ID}.jpg`, publicId: PHOTO_ID, tag: 'main' }],
    floorplans: [{ url: `${CLD}/v1/${PLAN_ID}.png`, publicId: PLAN_ID }],
  });
  await db().collection('users').insertOne({
    _id: USER,
    avatarUrl: `${CLD}/v2/${AVATAR_ID}.jpg`,
    avatarPublicId: AVATAR_ID,
    agentLicense: {
      documentUrl: `https://res.cloudinary.com/demo/image/authenticated/s--sig--/v3/${LICENSE_ID}.jpg`,
      documentPublicId: LICENSE_ID,
    },
  });
  await db().collection('filerecords').insertOne({ publicId: AVATAR_ID, url: `${CLD}/v2/${AVATAR_ID}.jpg`, userId: USER, fileType: 'avatar' });
  await db().collection('blogposts').insertOne({ body: `<p>Look <img src="${CLD}/v9/${BLOG_ID}.png"> and <img src="${CLD}/v9/gone.png"></p>` });
});

describe('runMigration', () => {
  it('dry run changes nothing', async () => {
    const stats = await runMigration({ apply: false, skipConventionCities: true, ...quiet });
    // photo (shared by 2 fields), floor plan, avatar, licence, 2 inline blog images
    expect(stats.migrated).toBe(6);
    expect(bucket.size).toBe(0);
    expect(downloads).toHaveLength(0);
    expect(await MediaAsset.countDocuments()).toBe(0);
    expect((await db().collection('users').findOne({ _id: USER }))!.avatarPublicId).toBe(AVATAR_ID);
  });

  it('moves photos into user/listing folders and rewrites every reference', async () => {
    const stats = await runMigration({ apply: true, skipConventionCities: true, ...quiet });

    expect(stats.migrated).toBe(5);
    expect(stats.failed.map((f) => f.publicId)).toEqual(['gone']);
    // shared photo downloaded once, transformations stripped
    expect(downloads.filter((u) => u.includes('/p1'))).toEqual([`${CLD}/${PHOTO_ID}.jpg`]);

    const photoKey = `users/${USER}/listings/${LISTING}/photos/${migratedPhotoId(PHOTO_ID)}`;
    const planKey = `users/${USER}/listings/${LISTING}/floorplans/${migratedPhotoId(PLAN_ID)}`;
    const avatarKey = `users/${USER}/avatar/${migratedPhotoId(AVATAR_ID)}`;
    const licenseKey = `users/${USER}/documents/license/${migratedPhotoId(LICENSE_ID)}`;

    const property = await db().collection('properties').findOne({ _id: LISTING });
    expect(property!.imageUrl).toBe(`https://media.example.com/${photoKey}/original.jpg`);
    expect(property!.imagePublicId).toBe(photoKey);
    expect(property!.images[0]).toMatchObject({ url: `https://media.example.com/${photoKey}/original.jpg`, publicId: photoKey, tag: 'main' });
    expect(property!.floorplans[0].publicId).toBe(planKey);

    const user = await db().collection('users').findOne({ _id: USER });
    expect(user!.avatarPublicId).toBe(avatarKey);
    // the licence stays private: private bucket, opened through the API
    expect(user!.agentLicense.documentUrl).toBe(`https://api.example.com/api/files/open/${licenseKey}`);
    expect(bucket.has(`media-private/${licenseKey}/original.jpg`)).toBe(true);
    expect([...bucket.keys()].some((k) => k.startsWith(`media/${licenseKey}`))).toBe(false);

    // access-control record follows
    const record = await db().collection('filerecords').findOne({ userId: USER });
    expect(record).toMatchObject({ publicId: avatarKey, url: `https://media.example.com/${avatarKey}/original.jpg` });

    // URLs inside text: the owner can't be told → legacy/; the missing one is left alone
    const post = await db().collection('blogposts').findOne({});
    expect(post!.body).toContain(`https://media.example.com/legacy/${BLOG_ID}/original.jpg`);
    expect(post!.body).toContain(`${CLD}/v9/gone.png`);

    const assets = await MediaAsset.find().lean();
    expect(assets.map((a) => a.kind).sort()).toEqual(['avatar', 'floorplan', 'legacy', 'license', 'property']);
    const photo = assets.find((a) => a.key === photoKey)!;
    expect(String(photo.propertyId)).toBe(String(LISTING));
    expect(String(photo.ownerId)).toBe(String(USER));
    expect(photo.source?.cloudinaryPublicId).toBe(PHOTO_ID);
  });

  it('is a no-op the second time', async () => {
    await runMigration({ apply: true, skipConventionCities: true, ...quiet });
    downloads.length = 0;
    const again = await runMigration({ apply: true, skipConventionCities: true, ...quiet });
    expect(again.alreadyMigrated).toBe(5);
    expect(again.migrated).toBe(0);
    expect(downloads).toEqual([`${CLD}/gone.png`]); // only the one that failed is retried
    expect(again.docsUpdated).toBe(0);
  });
});
