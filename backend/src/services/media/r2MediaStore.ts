import {
  PutObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as presign } from '@aws-sdk/s3-request-presigner';
import mongoose from 'mongoose';
import { getR2Client, getR2Config } from '../../config/r2';
import { mediaFileUrl, MEDIA_MASTER_FILE } from '../../config/mediaVariants';
import MediaAsset, { IMediaAsset, MediaAssetKind } from '../../models/MediaAsset';
import { mediaLogger } from '../../utils/logger';
import { buildMaster, generatePhotoFiles, MasterOptions } from './imageVariants';
import {
  MediaKeyContext,
  PRIVATE_MEDIA_KINDS,
  mediaFolder,
  newPhotoId,
  photoKey,
  photoIdOf,
} from './mediaKeys';

/**
 * R2 media store — puts photos in the bucket and keeps MediaAsset (MongoDB)
 * in step with what's there. Every write to the bucket goes through here.
 */

/** Photo folders are never reused, so every file can be cached forever. */
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
const PRIVATE_CACHE = 'private, no-store';
const UPLOAD_CONCURRENCY = 6;
const PRESIGN_SECONDS = 3600;

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const asObjectId = (id: string | undefined): mongoose.Types.ObjectId | undefined =>
  id && OBJECT_ID.test(id) ? new mongoose.Types.ObjectId(id) : undefined;

/** Run `fn` over `items` with at most `limit` in flight. */
const mapLimit = async <T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
};

const bucketName = (bucket: 'public' | 'private'): string => {
  const config = getR2Config();
  if (!config) throw new Error('R2 is not configured');
  return bucket === 'private' ? config.privateBucket : config.publicBucket;
};

/**
 * The URL stored for a photo. Public photos: their master on the CDN.
 * Private documents: our own `/api/files/open/…` route, which checks who's
 * asking and redirects to a short-lived presigned link.
 */
export const storedUrlFor = (key: string, bucket: 'public' | 'private'): string => {
  const config = getR2Config();
  if (!config) throw new Error('R2 is not configured');
  if (bucket === 'private') {
    const api = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
    return `${api}/api/files/open/${key}`;
  }
  return mediaFileUrl(config.publicUrl, key, MEDIA_MASTER_FILE);
};

export interface StoreImageOptions {
  kind: MediaAssetKind;
  context: MediaKeyContext;
  master?: MasterOptions;
  status?: 'draft' | 'active';
  /** Use this exact key instead of a new one under the kind's folder (migration, deterministic re-hosts). */
  key?: string;
  source?: { cloudinaryPublicId?: string; url?: string };
  /** Force the bucket (migration: anything Cloudinary kept private stays private). Default: by kind. */
  bucket?: 'public' | 'private';
}

export interface StoredImage {
  key: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  format: 'jpg';
  bucket: 'public' | 'private';
}

const toStored = (asset: Pick<IMediaAsset, 'key' | 'bucket' | 'width' | 'height' | 'bytes'>): StoredImage => ({
  key: asset.key,
  url: storedUrlFor(asset.key, asset.bucket),
  width: asset.width,
  height: asset.height,
  bytes: asset.bytes,
  format: 'jpg',
  bucket: asset.bucket,
});

const deleteObjects = async (bucket: 'public' | 'private', objectKeys: string[]): Promise<void> => {
  const client = getR2Client();
  const name = bucketName(bucket);
  for (let i = 0; i < objectKeys.length; i += 1000) {
    const batch = objectKeys.slice(i, i + 1000);
    const result = await client.send(
      new DeleteObjectsCommand({ Bucket: name, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } })
    );
    if (result.Errors && result.Errors.length > 0) {
      throw new Error(`R2 refused to delete ${result.Errors.length} objects (first: ${result.Errors[0].Key} ${result.Errors[0].Message})`);
    }
  }
};

/**
 * Process an image and store every file of it in R2, then record it in
 * MediaAsset. If any upload fails, files already written are removed so the
 * bucket never holds a half-stored photo.
 */
export const storeImage = async (input: Buffer, options: StoreImageOptions): Promise<StoredImage> => {
  const bucket: 'public' | 'private' = options.bucket ?? (PRIVATE_MEDIA_KINDS.has(options.kind) ? 'private' : 'public');
  const master = await buildMaster(input, options.master);
  const photo = await generatePhotoFiles(master, { masterOnly: bucket === 'private' });
  const key = options.key || photoKey(mediaFolder(options.kind, options.context), newPhotoId());

  const client = getR2Client();
  const name = bucketName(bucket);
  const written: string[] = [];
  try {
    await mapLimit(photo.files, UPLOAD_CONCURRENCY, async (f) => {
      const objectKey = `${key}/${f.file}`;
      await client.send(
        new PutObjectCommand({
          Bucket: name,
          Key: objectKey,
          Body: f.body,
          ContentType: f.contentType,
          CacheControl: bucket === 'private' ? PRIVATE_CACHE : IMMUTABLE_CACHE,
        })
      );
      written.push(objectKey);
    });
  } catch (error) {
    await deleteObjects(bucket, written).catch(() => undefined);
    throw error;
  }

  const ctx = options.context;
  const asset = await MediaAsset.findOneAndUpdate(
    { key },
    {
      key,
      bucket,
      kind: options.kind,
      status: options.status ?? 'active',
      ownerId: asObjectId(ctx.userId),
      propertyId: asObjectId(ctx.propertyId),
      agencyId: asObjectId(ctx.agencyId),
      businessListingId: asObjectId(ctx.businessListingId),
      conversationId: asObjectId(ctx.conversationId),
      credentialId: ctx.credentialId,
      files: photo.files.map((f) => f.file),
      width: photo.width,
      height: photo.height,
      bytes: photo.bytes,
      totalBytes: photo.totalBytes,
      contentHash: photo.contentHash,
      ...(options.source ? { source: options.source } : {}),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  mediaLogger.info(
    `✅ Stored ${options.kind} in R2: ${key} (${photo.files.length} files, ${Math.round(photo.totalBytes / 1024)}KB)`
  );
  return toStored(asset);
};

/** The MediaAsset for a key, or null when the key isn't one of ours (e.g. still on Cloudinary). */
export const findAsset = (key: string) => MediaAsset.findOne({ key });

/** Remove every file of the given photos from R2 and their MediaAsset records. */
export const deleteAssets = async (assets: Array<Pick<IMediaAsset, 'key' | 'bucket' | 'files'>>): Promise<void> => {
  if (assets.length === 0) return;
  for (const bucket of ['public', 'private'] as const) {
    const objectKeys = assets
      .filter((a) => a.bucket === bucket)
      .flatMap((a) => (a.files.length ? a.files : [MEDIA_MASTER_FILE]).map((f) => `${a.key}/${f}`));
    if (objectKeys.length) await deleteObjects(bucket, objectKeys);
  }
  await MediaAsset.deleteMany({ key: { $in: assets.map((a) => a.key) } });
  mediaLogger.info(`🗑️  Deleted ${assets.length} photos from R2`);
};

/**
 * Delete the photos stored under `keys`. Returns the keys that were ours, so
 * the caller can hand the rest to Cloudinary (not yet migrated).
 */
export const deleteKeys = async (keys: string[]): Promise<Set<string>> => {
  const clean = [...new Set(keys.filter(Boolean))];
  if (clean.length === 0) return new Set();
  const assets = await MediaAsset.find({ key: { $in: clean } }).select('key bucket files').lean();
  await deleteAssets(assets);
  return new Set(assets.map((a) => a.key));
};

/** Delete every photo matching a MediaAsset filter (by owner, listing, agency…). */
export const deleteWhere = async (filter: Record<string, unknown>, exceptKeys: string[] = []): Promise<number> => {
  // $and, not a spread: the filter may itself constrain `key` (a folder prefix).
  const query = exceptKeys.length ? { $and: [filter, { key: { $nin: exceptKeys } }] } : filter;
  const assets = await MediaAsset.find(query).select('key bucket files').lean();
  await deleteAssets(assets);
  return assets.length;
};

/**
 * Move a photo to a new folder (copy every file, then remove the old ones).
 * Used to file listing-form drafts under their listing once it exists.
 */
export const moveAsset = async (asset: IMediaAsset, newFolder: string, updates: Partial<IMediaAsset> = {}): Promise<StoredImage> => {
  const newKey = photoKey(newFolder, photoIdOf(asset.key));
  if (newKey === asset.key) {
    Object.assign(asset, updates);
    await asset.save();
    return toStored(asset);
  }
  const client = getR2Client();
  const name = bucketName(asset.bucket);
  const files = asset.files.length ? asset.files : [MEDIA_MASTER_FILE];
  await mapLimit(files, UPLOAD_CONCURRENCY, (file) =>
    client.send(
      new CopyObjectCommand({
        Bucket: name,
        Key: `${newKey}/${file}`,
        CopySource: `${name}/${asset.key}/${file}`,
      })
    )
  );
  const oldKey = asset.key;
  Object.assign(asset, updates, { key: newKey });
  await asset.save();
  await deleteObjects(asset.bucket, files.map((f) => `${oldKey}/${f}`)).catch((error) =>
    mediaLogger.warn(`⚠️  Moved ${oldKey} but could not remove the old files: ${error.message}`)
  );
  mediaLogger.info(`📁 Moved ${oldKey} → ${newKey}`);
  return toStored(asset);
};

/** A short-lived link to a photo's master (private documents, or any key). */
export const presignedMasterUrl = async (
  asset: Pick<IMediaAsset, 'key' | 'bucket'>,
  expiresIn: number = PRESIGN_SECONDS
): Promise<string> =>
  presign(
    getR2Client(),
    new GetObjectCommand({ Bucket: bucketName(asset.bucket), Key: `${asset.key}/${MEDIA_MASTER_FILE}` }),
    { expiresIn }
  );
