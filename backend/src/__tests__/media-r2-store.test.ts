/**
 * R2 media lifecycle against an in-memory bucket and MongoDB:
 * upload → draft → filed under its listing → deleted with the listing, plus
 * the abandoned-draft sweep and private-document links.
 */

// In-memory stand-in for R2: object key → content type.
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
      if (cmd instanceof CopyObjectCommand) {
        const from = bucket.get(input.CopySource);
        if (!from) throw new Error(`NoSuchKey ${input.CopySource}`);
        bucket.set(`${input.Bucket}/${input.Key}`, from);
      }
      if (cmd instanceof DeleteObjectsCommand) {
        for (const o of input.Delete.Objects) bucket.delete(`${input.Bucket}/${o.Key}`);
      }
      return {};
    }
  }
  return { S3Client, PutObjectCommand, DeleteObjectsCommand, CopyObjectCommand, GetObjectCommand };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async (_client: unknown, cmd: any) => `https://signed.example/${cmd.input.Bucket}/${cmd.input.Key}?X-Amz-Expires=3600`,
}));

process.env.R2_ACCOUNT_ID = 'acct';
process.env.R2_ACCESS_KEY_ID = 'key';
process.env.R2_SECRET_ACCESS_KEY = 'secret';
process.env.R2_BUCKET = 'media';
process.env.R2_PRIVATE_BUCKET = 'media-private';
process.env.R2_PUBLIC_URL = 'https://media.example.com';
process.env.BACKEND_URL = 'https://api.example.com';
delete process.env.CLOUDINARY_API_SECRET;

import mongoose from 'mongoose';
import sharp from 'sharp';
import MediaAsset from '../models/MediaAsset';
import Property from '../models/Property';
import FileRecord from '../models/FileRecord';
import { ALL_VARIANT_FILES } from '../config/mediaVariants';
import {
  uploadImage,
  organizeListingMedia,
  deleteListingMedia,
  deleteImage,
  cleanupOrphanedTempImages,
  deleteUserPersonalMedia,
} from '../services/cloudinaryService';
import { getSignedUrlIfAuthorized } from '../services/storageAccessPolicy';

const USER = new mongoose.Types.ObjectId().toString();
const LISTING = new mongoose.Types.ObjectId().toString();

const photo = () => sharp({ create: { width: 1200, height: 900, channels: 3, background: '#4a7' } }).jpeg().toBuffer();
const objectsUnder = (prefix: string) => [...bucket.keys()].filter((k) => k.startsWith(prefix));

beforeEach(() => bucket.clear());

describe('R2 media store', () => {
  it('stores a listing-form upload as a draft with every size, then files it under the listing', async () => {
    const uploaded = await uploadImage(await photo(), { userId: USER, type: 'property' });

    expect(uploaded.publicId).toMatch(new RegExp(`^users/${USER}/listings/drafts/photos/[a-z0-9]+$`));
    expect(uploaded.url).toBe(`https://media.example.com/${uploaded.publicId}/original.jpg`);
    expect(objectsUnder(`media/${uploaded.publicId}/`)).toHaveLength(ALL_VARIANT_FILES.length);

    const draft = await MediaAsset.findOne({ key: uploaded.publicId }).lean();
    expect(draft).toMatchObject({ kind: 'property', status: 'draft', bucket: 'public', width: 1200, height: 900 });
    expect(String(draft!.ownerId)).toBe(USER);
    expect(await FileRecord.countDocuments({ publicId: uploaded.publicId })).toBe(1);

    const [filed] = await organizeListingMedia([{ url: uploaded.url, publicId: uploaded.publicId, tag: 'main' }], USER, LISTING);

    expect(filed.publicId).toMatch(new RegExp(`^users/${USER}/listings/${LISTING}/photos/[a-z0-9]+$`));
    expect(filed.url).toBe(`https://media.example.com/${filed.publicId}/original.jpg`);
    expect(objectsUnder(`media/${uploaded.publicId}/`)).toHaveLength(0);
    expect(objectsUnder(`media/${filed.publicId}/`)).toHaveLength(ALL_VARIANT_FILES.length);

    const active = await MediaAsset.findOne({ key: filed.publicId }).lean();
    expect(active).toMatchObject({ status: 'active' });
    expect(String(active!.propertyId)).toBe(LISTING);
    // access-control record follows the move
    expect(await FileRecord.countDocuments({ publicId: uploaded.publicId })).toBe(0);
    expect(await FileRecord.countDocuments({ publicId: filed.publicId })).toBe(1);
  });

  it('files floor plans in the listing\'s floorplans folder', async () => {
    const uploaded = await uploadImage(await photo(), { userId: USER, type: 'floorplan' });
    const [filed] = await organizeListingMedia([{ url: uploaded.url, publicId: uploaded.publicId, tag: 'floorplan' }], USER, LISTING);
    expect(filed.publicId).toMatch(new RegExp(`^users/${USER}/listings/${LISTING}/floorplans/`));
  });

  it('deletes every photo of a listing, keeping the archive thumbnail', async () => {
    const a = await uploadImage(await photo(), { userId: USER, propertyId: LISTING, type: 'property' });
    const b = await uploadImage(await photo(), { userId: USER, propertyId: LISTING, type: 'property' });
    const other = await uploadImage(await photo(), { userId: USER, type: 'avatar' });

    await deleteListingMedia(USER, LISTING, { keepPublicIds: [b.publicId] });

    expect(await MediaAsset.exists({ key: a.publicId })).toBeNull();
    expect(objectsUnder(`media/${a.publicId}/`)).toHaveLength(0);
    expect(await MediaAsset.exists({ key: b.publicId })).not.toBeNull();
    expect(objectsUnder(`media/${b.publicId}/`)).toHaveLength(ALL_VARIANT_FILES.length);
    expect(await MediaAsset.exists({ key: other.publicId })).not.toBeNull();
  });

  it('deletes a single photo and its file record', async () => {
    const a = await uploadImage(await photo(), { userId: USER, type: 'avatar' });
    await deleteImage(a.publicId);
    expect(await MediaAsset.exists({ key: a.publicId })).toBeNull();
    expect(await FileRecord.exists({ publicId: a.publicId })).toBeNull();
    expect(bucket.size).toBe(0);
  });

  it('sweeps abandoned drafts but spares one a listing still uses', async () => {
    const abandoned = await uploadImage(await photo(), { userId: USER, type: 'property' });
    const used = await uploadImage(await photo(), { userId: USER, type: 'property' });
    const fresh = await uploadImage(await photo(), { userId: USER, type: 'property' });
    const old = new Date(Date.now() - 72 * 3600 * 1000);
    await MediaAsset.collection.updateMany({ key: { $in: [abandoned.publicId, used.publicId] } }, { $set: { createdAt: old } });
    await Property.collection.insertOne({ sellerId: new mongoose.Types.ObjectId(USER), imagePublicId: used.publicId });

    const removed = await cleanupOrphanedTempImages(48);

    expect(removed).toBe(1);
    expect(await MediaAsset.exists({ key: abandoned.publicId })).toBeNull();
    expect(await MediaAsset.findOne({ key: used.publicId }).lean()).toMatchObject({ status: 'active' });
    expect(await MediaAsset.findOne({ key: fresh.publicId }).lean()).toMatchObject({ status: 'draft' });
  });

  it('keeps licences in the private bucket and hands out expiring links only to the owner', async () => {
    const doc = await uploadImage(await photo(), { userId: USER, type: 'license' });

    expect(doc.publicId).toMatch(new RegExp(`^users/${USER}/documents/license/`));
    expect(doc.url).toBe(`https://api.example.com/api/files/open/${doc.publicId}`);
    expect(objectsUnder('media/')).toHaveLength(0);
    expect(objectsUnder(`media-private/${doc.publicId}/`)).toEqual([`media-private/${doc.publicId}/original.jpg`]);

    const owner = await getSignedUrlIfAuthorized(USER, doc.publicId);
    expect(owner?.url).toBe(`https://signed.example/media-private/${doc.publicId}/original.jpg?X-Amz-Expires=3600`);
    expect(await getSignedUrlIfAuthorized(new mongoose.Types.ObjectId().toString(), doc.publicId)).toBeNull();

    await deleteUserPersonalMedia(USER);
    expect(bucket.size).toBe(0);
    expect(await MediaAsset.countDocuments({ ownerId: USER })).toBe(0);
  });
});
