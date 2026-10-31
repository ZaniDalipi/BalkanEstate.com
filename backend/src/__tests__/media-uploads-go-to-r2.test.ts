/**
 * Every image the app stores goes to R2 — every upload path, every kind —
 * and nothing in the code can still send one to Cloudinary.
 *
 * Runs each upload entry point against an in-memory R2 bucket and MongoDB,
 * then checks that the files landed in the bucket, that a MediaAsset records
 * them and that the URL handed back is on the media domain.
 */

const bucket = new Map<string, string>();
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
      if (cmd instanceof CopyObjectCommand) bucket.set(`${input.Bucket}/${input.Key}`, bucket.get(input.CopySource) || '');
      if (cmd instanceof DeleteObjectsCommand) for (const o of input.Delete.Objects) bucket.delete(`${input.Bucket}/${o.Key}`);
      return {};
    }
  }
  return { S3Client, PutObjectCommand, DeleteObjectsCommand, CopyObjectCommand, GetObjectCommand };
});

process.env.R2_ACCOUNT_ID = 'acct';
process.env.R2_ACCESS_KEY_ID = 'key';
process.env.R2_SECRET_ACCESS_KEY = 'secret';
process.env.R2_BUCKET = 'media';
process.env.R2_PRIVATE_BUCKET = 'media-private';
process.env.R2_PUBLIC_URL = 'https://media.example.com';
process.env.BACKEND_URL = 'https://api.example.com';

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import MediaAsset from '../models/MediaAsset';
import User from '../models/User';
import {
  uploadImage,
  uploadMedia,
  uploadPropertyImages,
  uploadFromUrl,
  type UploadType,
} from '../services/mediaService';

const USER = new mongoose.Types.ObjectId().toString();
const LISTING = new mongoose.Types.ObjectId().toString();
const AGENCY = new mongoose.Types.ObjectId().toString();
const BUSINESS = new mongoose.Types.ObjectId().toString();
const CONVERSATION = new mongoose.Types.ObjectId().toString();

const photo = (width = 1600, height = 1000) =>
  sharp({ create: { width, height, channels: 3, background: '#3a7' } }).jpeg().toBuffer();

/** The upload landed in R2: files in the right bucket, a MediaAsset, a media-domain URL. */
const expectInR2 = async (result: { url: string; publicId: string }, bucketName = 'media') => {
  expect(result.url).not.toMatch(/cloudinary/i);
  const asset = await MediaAsset.findOne({ key: result.publicId }).lean();
  expect(asset).not.toBeNull();
  const files = [...bucket.keys()].filter((k) => k.startsWith(`${bucketName}/${result.publicId}/`));
  expect(files.length).toBe(asset!.files.length);
  expect(files).toContain(`${bucketName}/${result.publicId}/original.jpg`);
  return asset!;
};

beforeEach(() => bucket.clear());

describe('every upload goes to R2', () => {
  const publicTypes: Array<[UploadType, Record<string, string>]> = [
    ['property', { propertyId: LISTING }],
    ['floorplan', { propertyId: LISTING }],
    ['avatar', {}],
    ['agency-logo', { agencyId: AGENCY }],
    ['agency-cover', { agencyId: AGENCY }],
    ['business-logo', { businessListingId: BUSINESS }],
    ['business-banner', { businessListingId: BUSINESS }],
    ['site-logo', {}],
    ['site-email-logo', {}],
    ['ad-banner', {}],
  ];

  it.each(publicTypes)('%s uploads land in the public bucket with every size', async (type, ids) => {
    const result = await uploadImage(await photo(), { userId: USER, type, ...ids });
    expect(result.url.startsWith('https://media.example.com/')).toBe(true);
    const asset = await expectInR2(result);
    expect(asset.kind).toBe(type);
    expect(asset.files).toEqual(expect.arrayContaining(['original.jpg', 'w640.webp', 'lqip.webp']));
  });

  it.each([['license'], ['credential']] as Array<[UploadType]>)('%s documents land in the private bucket only', async (type) => {
    const result = await uploadImage(await photo(), { userId: USER, type });
    expect(result.url).toBe(`https://api.example.com/api/files/open/${result.publicId}`);
    await expectInR2(result, 'media-private');
    expect([...bucket.keys()].some((k) => k.startsWith(`media/${result.publicId}`))).toBe(false);
  });

  it('listing photos uploaded together (with watermark-free path) all land in R2', async () => {
    const files = await Promise.all([photo(), photo(1200, 800), photo(800, 1200)]);
    const uploaded = await uploadPropertyImages(
      files.map((buffer) => ({ buffer } as Express.Multer.File)),
      USER,
      LISTING
    );
    expect(uploaded).toHaveLength(3);
    for (const img of uploaded) await expectInR2(img);
  });

  it.each([
    ['message', { conversationId: CONVERSATION, userId: USER }],
    ['city', { country: 'Albania', city: 'Tirana' }],
    ['destination', { country: 'Albania', city: 'Theth' }],
    ['news', {}],
    ['site-content', {}],
  ] as const)('%s images land in R2', async (kind, context) => {
    const result = await uploadMedia(await photo(), kind, { ...context });
    await expectInR2(result);
  });

  it('external feed images are re-hosted into R2 in production', async () => {
    const realFetch = global.fetch;
    const previousEnv = process.env.NODE_ENV;
    const body = await photo();
    global.fetch = jest.fn(async () => new Response(body, { status: 200, headers: { 'content-length': String(body.length) } })) as any;
    process.env.NODE_ENV = 'production';
    try {
      const result = await uploadFromUrl('https://feeds.example.com/listing/1.jpg', { sourceSlug: 'feed', listingId: 'L1' });
      const asset = await expectInR2(result);
      expect(asset.kind).toBe('external');
      expect(result.publicId.startsWith('external/feed/L1/')).toBe(true);
    } finally {
      process.env.NODE_ENV = previousEnv;
      global.fetch = realFetch;
    }
  });

  it('names folders after the user and listing', async () => {
    await User.collection.insertOne({ _id: new mongoose.Types.ObjectId(USER), name: 'Zani Dalipi' });
    const { default: Property } = await import('../models/Property');
    await Property.collection.insertOne({ _id: new mongoose.Types.ObjectId(LISTING), title: 'House in Split', propertyId: 'AB-123' });
    const { clearMediaNameCache } = await import('../services/media/mediaNames');
    clearMediaNameCache();

    const result = await uploadImage(await photo(), { userId: USER, propertyId: LISTING, type: 'property' });
    expect(result.publicId.startsWith(`users/zani-dalipi_${USER}/listings/house-in-split-ab-123_${LISTING}/photos/`)).toBe(true);
  });
});

describe('no Cloudinary left in the code', () => {
  const repo = path.resolve(__dirname, '../../..');
  /**
   * Files allowed to mention Cloudinary's image domain: the read-only display
   * of images that stay there (and the hosts allowed to show them), the
   * optional migration that reads from it, and the check that lists them.
   * None of them can upload to Cloudinary (see the upload API test below).
   */
  const allowed = [
    'config/legacyCloudinary.ts',
    'backend/src/config/imageHosts.ts',
    'src/shared/utils/validation.ts',
    'backend/src/scripts/migrateCloudinaryToR2.ts',
    'backend/src/services/media/cloudinaryMigration.ts',
    'backend/src/scripts/checkMediaLinks.ts',
  ];

  const sourceFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return ['node_modules', '__tests__', 'tests', 'dist', '.git'].includes(entry.name) ? [] : sourceFiles(full);
      }
      return /\.(ts|tsx|js|html)$/.test(entry.name) ? [full] : [];
    });

  it('has no Cloudinary SDK dependency', () => {
    const backendPkg = JSON.parse(fs.readFileSync(path.join(repo, 'backend/package.json'), 'utf8'));
    const frontendPkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
    for (const pkg of [backendPkg, frontendPkg]) {
      expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })).not.toContain('cloudinary');
    }
  });

  it('never calls the Cloudinary upload API, anywhere', () => {
    const offenders: string[] = [];
    for (const root of ['backend/src', 'src', 'components', 'config', 'functions', 'hooks', 'utils', 'services', 'context']) {
      const dir = path.join(repo, root);
      if (!fs.existsSync(dir)) continue;
      for (const file of sourceFiles(dir)) {
        // The migration may use the read-only download endpoint; no upload endpoint anywhere.
        if (/api\.cloudinary\.com\/v1_1\/[^\s'"`]*\/(upload|destroy|explicit|rename)|\/image\/upload['"`]\s*,\s*\{\s*method:\s*['"]POST/i.test(fs.readFileSync(file, 'utf8'))) {
          offenders.push(path.relative(repo, file));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never imports the SDK or points at res.cloudinary.com', () => {
    const offenders: string[] = [];
    for (const root of ['backend/src', 'src', 'components', 'config', 'functions', 'hooks', 'utils', 'services', 'context']) {
      const dir = path.join(repo, root);
      if (!fs.existsSync(dir)) continue;
      for (const file of sourceFiles(dir)) {
        const rel = path.relative(repo, file);
        if (allowed.includes(rel)) continue;
        const text = fs.readFileSync(file, 'utf8');
        if (/from ['"]cloudinary['"]|require\(['"]cloudinary['"]\)|res\.cloudinary\.com/.test(text)) offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });
});
