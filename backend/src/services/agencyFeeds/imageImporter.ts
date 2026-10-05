import http from 'http';
import https from 'https';
import { createHash } from 'crypto';
import axios from 'axios';
import sharp from 'sharp';
import type { Types } from 'mongoose';
import AgencyFeedAsset, { type IAgencyFeedAsset } from '../../models/AgencyFeedAsset';
import Property from '../../models/Property';
import { resolvePublicUrl, SsrfError } from '../../utils/ssrfGuard';
import { deleteImage, uploadImage } from '../cloudinaryService';
import { feedLogger } from './feedAudit';

/**
 * Imports a feed's photos and floor plans through the existing image storage.
 *
 * - Each URL is fetched at most once per feed: a stored asset is reused on
 *   every later sync, and identical bytes behind two URLs share one upload.
 * - The real content is checked with sharp (not the Content-Type header):
 *   only decodable raster formats, within size and pixel bounds.
 * - Downloads are SSRF-guarded on every redirect hop, time-boxed and size-capped,
 *   and run with bounded concurrency.
 * - A failed image is recorded and skipped; it never removes a listing's
 *   existing photos, and it is retried after a cool-down rather than every run.
 *
 * Storage modes (AGENCY_FEED_IMAGE_MODE):
 *   rehost    (default) — upload through `uploadImage`, the same sharp-compressed,
 *                         tagged, per-listing Cloudinary pipeline manual uploads use,
 *                         so delivery and transformations are unchanged.
 *   reference           — validate only and keep the agency's URL; the frontend
 *                         already serves external photos via /api/image-proxy.
 *                         No storage cost, but photos break if the agency's
 *                         site removes them.
 */

export const IMAGE_LIMITS = {
  maxBytes: 15 * 1024 * 1024,
  maxPixels: 50_000_000,
  minWidth: 200,
  minHeight: 150,
  timeoutMs: 20_000,
  maxRedirects: 3,
  concurrency: 4,
  /** Failed URLs are retried at most this often. */
  retryCooldownMs: 6 * 60 * 60 * 1000,
  /** After this many failures a URL is only retried once a day. */
  maxQuickRetries: 3,
};

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'heif', 'tiff']);

export type ImageKind = 'photo' | 'floorplan';

export interface ImageContext {
  feedId: Types.ObjectId;
  agencyId: Types.ObjectId;
  sellerId: Types.ObjectId;
  sellerName?: string;
  propertyId: Types.ObjectId;
  propertyTitle?: string;
}

export interface ImageStore {
  readonly mode: 'rehost' | 'reference';
  save(buffer: Buffer, sourceUrl: string, kind: ImageKind, ctx: ImageContext): Promise<{ url: string; publicId?: string }>;
  remove(publicId: string): Promise<void>;
}

export const cloudinaryImageStore: ImageStore = {
  mode: 'rehost',
  async save(buffer, _sourceUrl, kind, ctx) {
    const result = await uploadImage(buffer, {
      userId: String(ctx.sellerId),
      userName: ctx.sellerName,
      propertyId: String(ctx.propertyId),
      propertyTitle: ctx.propertyTitle,
      type: kind === 'floorplan' ? 'floorplan' : 'property',
      maxWidth: kind === 'floorplan' ? 2400 : 1920,
      maxHeight: kind === 'floorplan' ? 2400 : 1080,
      preserveQuality: kind === 'floorplan',
    });
    return { url: result.url, publicId: result.publicId };
  },
  async remove(publicId) {
    await deleteImage(publicId);
  },
};

export const referenceImageStore: ImageStore = {
  mode: 'reference',
  async save(_buffer, sourceUrl) {
    return { url: sourceUrl };
  },
  async remove() {
    /* nothing stored */
  },
};

export const defaultImageStore = (): ImageStore =>
  process.env.AGENCY_FEED_IMAGE_MODE === 'reference' ? referenceImageStore : cloudinaryImageStore;

export type ImageDownloader = (url: string) => Promise<Buffer>;

export class ImageImportError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'ImageImportError';
  }
}

/** SSRF-guarded, size- and time-limited download. Re-validates every redirect hop. */
export const guardedImageDownload: ImageDownloader = async (rawUrl) => {
  let current = rawUrl;
  for (let hop = 0; hop <= IMAGE_LIMITS.maxRedirects; hop++) {
    let vetted;
    try {
      vetted = await resolvePublicUrl(current);
    } catch (err) {
      throw new ImageImportError(err instanceof SsrfError ? `Blocked URL: ${err.message}` : 'Invalid URL');
    }
    const agentOptions = { lookup: vetted.lookup, keepAlive: false };
    let response;
    try {
      response = await axios.get<ArrayBuffer>(vetted.url.toString(), {
        responseType: 'arraybuffer',
        timeout: IMAGE_LIMITS.timeoutMs,
        maxContentLength: IMAGE_LIMITS.maxBytes,
        maxBodyLength: IMAGE_LIMITS.maxBytes,
        maxRedirects: 0,
        proxy: false,
        httpAgent: new http.Agent(agentOptions),
        httpsAgent: new https.Agent(agentOptions),
        headers: {
          'User-Agent': 'BalkanEstateAI-FeedImporter/1.0 (+https://balkanestateai.com/agency-feeds)',
          Accept: 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8',
        },
        validateStatus: () => true,
      });
    } catch (err) {
      const message = (err as Error).message ?? '';
      if (/maxContentLength/i.test(message)) throw new ImageImportError('Image is larger than 15 MB');
      if ((err as { code?: string }).code === 'ECONNABORTED') throw new ImageImportError('Download timed out');
      throw new ImageImportError('Download failed');
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (typeof location !== 'string' || !location) throw new ImageImportError('Redirect without location');
      current = new URL(location, vetted.url).toString();
      continue;
    }
    if (response.status < 200 || response.status >= 300) throw new ImageImportError(`HTTP ${response.status}`);
    return Buffer.from(response.data);
  }
  throw new ImageImportError('Too many redirects');
};

export interface ValidatedImage {
  width: number;
  height: number;
  format: string;
  bytes: number;
  contentHash: string;
}

/** Inspect the actual bytes. Throws ImageImportError with an agency-readable reason. */
export const validateImageBuffer = async (buffer: Buffer): Promise<ValidatedImage> => {
  if (buffer.length === 0) throw new ImageImportError('Empty file');
  if (buffer.length > IMAGE_LIMITS.maxBytes) throw new ImageImportError('Image is larger than 15 MB');
  let meta;
  try {
    meta = await sharp(buffer, { limitInputPixels: IMAGE_LIMITS.maxPixels }).metadata();
  } catch {
    throw new ImageImportError('File is not a readable image (or exceeds 50 megapixels)');
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) {
    throw new ImageImportError(`Unsupported image format${meta.format ? ` (${meta.format})` : ''}`);
  }
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < IMAGE_LIMITS.minWidth || height < IMAGE_LIMITS.minHeight) {
    throw new ImageImportError(`Image is too small (${width}×${height}, minimum ${IMAGE_LIMITS.minWidth}×${IMAGE_LIMITS.minHeight})`);
  }
  return {
    width,
    height,
    format: meta.format,
    bytes: buffer.length,
    contentHash: createHash('sha256').update(buffer).digest('hex'),
  };
};

export const hashUrl = (url: string): string => createHash('sha256').update(url).digest('hex');

/** Run `worker` over `items` with at most `limit` in flight, preserving result order. */
export const mapWithConcurrency = async <T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(lanes);
  return results;
};

export interface ImageImportOutcome {
  sourceUrl: string;
  ok: boolean;
  url?: string;
  publicId?: string;
  reused: boolean;
  downloaded: boolean;
  reason?: string;
}

export interface ImageImporterDeps {
  store: ImageStore;
  download: ImageDownloader;
  now?: () => Date;
}

const shouldRetry = (asset: IAgencyFeedAsset, now: Date): boolean => {
  const since = now.getTime() - asset.lastAttemptAt.getTime();
  const cooldown = asset.failures < IMAGE_LIMITS.maxQuickRetries ? IMAGE_LIMITS.retryCooldownMs : 24 * 60 * 60 * 1000;
  return since >= cooldown;
};

/** Upsert keyed by (feed, URL hash); retried once if a parallel upsert of the same URL won the insert. */
const upsertAsset = async (filter: Record<string, unknown>, update: Record<string, unknown>): Promise<void> => {
  try {
    await AgencyFeedAsset.updateOne(filter, update, { upsert: true });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    await AgencyFeedAsset.updateOne(filter, update, { upsert: true });
  }
};

/** Uploads in progress in one batch, by content hash: identical photos are stored once even when fetched in parallel. */
type PendingSaves = Map<string, Promise<{ url: string; publicId?: string; reused: boolean }>>;

const storeOnce = (
  pending: PendingSaves,
  buffer: Buffer,
  info: ValidatedImage,
  sourceUrl: string,
  kind: ImageKind,
  ctx: ImageContext,
  deps: ImageImporterDeps
) => {
  const inFlight = pending.get(info.contentHash);
  if (inFlight) return inFlight.then((stored) => ({ ...stored, reused: true }));
  const save = (async () => {
    const twin = await AgencyFeedAsset.findOne({ feedId: ctx.feedId, contentHash: info.contentHash, status: 'stored' });
    if (twin?.url) return { url: twin.url, publicId: twin.publicId, reused: true };
    return { ...(await deps.store.save(buffer, sourceUrl, kind, ctx)), reused: false };
  })();
  pending.set(info.contentHash, save);
  return save;
};

const importOne = async (
  sourceUrl: string,
  kind: ImageKind,
  ctx: ImageContext,
  deps: ImageImporterDeps,
  pending: PendingSaves
): Promise<ImageImportOutcome> => {
  const now = deps.now?.() ?? new Date();
  const urlHash = hashUrl(sourceUrl);
  const existing = await AgencyFeedAsset.findOne({ feedId: ctx.feedId, urlHash });

  if (existing?.status === 'stored' && existing.url) {
    existing.lastReferencedAt = now;
    await existing.save();
    return { sourceUrl, ok: true, url: existing.url, publicId: existing.publicId, reused: true, downloaded: false };
  }
  if (existing?.status === 'failed' && !shouldRetry(existing, now)) {
    existing.lastReferencedAt = now;
    await existing.save();
    return { sourceUrl, ok: false, reused: false, downloaded: false, reason: existing.failureReason };
  }

  try {
    const buffer = await deps.download(sourceUrl);
    const info = await validateImageBuffer(buffer);
    const stored = await storeOnce(pending, buffer, info, sourceUrl, kind, ctx, deps);
    await upsertAsset(
      { feedId: ctx.feedId, urlHash },
      {
        $set: {
          agencyId: ctx.agencyId,
          sourceUrl,
          status: 'stored',
          url: stored.url,
          publicId: stored.publicId,
          contentHash: info.contentHash,
          width: info.width,
          height: info.height,
          bytes: info.bytes,
          mimeType: `image/${info.format}`,
          lastAttemptAt: now,
          lastReferencedAt: now,
        },
        $unset: { failureReason: '' },
      }
    );
    return { sourceUrl, ok: true, url: stored.url, publicId: stored.publicId, reused: stored.reused, downloaded: true };
  } catch (err) {
    const reason = err instanceof ImageImportError ? err.reason : 'Upload to image storage failed';
    if (!(err instanceof ImageImportError)) {
      feedLogger.warn('image store failed', { feedId: String(ctx.feedId), error: (err as Error).message });
    }
    await upsertAsset(
      { feedId: ctx.feedId, urlHash },
      {
        $set: {
          agencyId: ctx.agencyId,
          sourceUrl,
          status: 'failed',
          failureReason: reason.slice(0, 300),
          lastAttemptAt: now,
          lastReferencedAt: now,
        },
        $inc: { failures: 1 },
      }
    );
    return { sourceUrl, ok: false, reused: false, downloaded: true, reason };
  }
};

/** Import a listing's media in feed order. Never throws for an individual image. */
export const importImages = (
  urls: string[],
  kind: ImageKind,
  ctx: ImageContext,
  deps: ImageImporterDeps
): Promise<ImageImportOutcome[]> => {
  const pending: PendingSaves = new Map();
  return mapWithConcurrency(urls, IMAGE_LIMITS.concurrency, (url) => importOne(url, kind, ctx, deps, pending));
};

/**
 * Delete stored feed images no listing references any more.
 *
 * Only assets this importer created are candidates, they must have gone
 * unreferenced by every sync for `graceMs`, and each is checked against all
 * listings (not only this feed's) before the stored file is removed.
 */
export const sweepUnreferencedAssets = async (
  feedId: Types.ObjectId,
  store: ImageStore,
  graceMs = 7 * 24 * 60 * 60 * 1000,
  now: Date = new Date()
): Promise<{ removed: number }> => {
  const cutoff = new Date(now.getTime() - graceMs);
  const stale = await AgencyFeedAsset.find({ feedId, lastReferencedAt: { $lt: cutoff } }).limit(500);
  let removed = 0;
  for (const asset of stale) {
    if (asset.status === 'stored' && asset.publicId) {
      const inUse = await Property.exists({
        $or: [
          { 'images.publicId': asset.publicId },
          { 'floorplans.publicId': asset.publicId },
          { imagePublicId: asset.publicId },
          { floorplanPublicId: asset.publicId },
        ],
      });
      if (inUse) {
        asset.lastReferencedAt = now;
        await asset.save();
        continue;
      }
      const sharedWithFresher = await AgencyFeedAsset.exists({
        _id: { $ne: asset._id },
        publicId: asset.publicId,
        lastReferencedAt: { $gte: cutoff },
      });
      if (!sharedWithFresher) {
        try {
          await store.remove(asset.publicId);
        } catch (err) {
          feedLogger.warn('asset cleanup failed', { feedId: String(feedId), error: (err as Error).message });
          continue;
        }
      }
    }
    await asset.deleteOne();
    removed++;
  }
  return { removed };
};
