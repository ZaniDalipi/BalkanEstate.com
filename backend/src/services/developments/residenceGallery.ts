/**
 * A residence's photo gallery (besides its cover): up to DEVELOPMENT_GALLERY_MAX
 * photos stored in R2 through uploadImage, in the owner's order.
 *
 * - Adding checks the limit before uploading and again in the write, so two
 *   uploads at once can't go past it (RESIDENCE_GALLERY_FULL {max, remaining}).
 * - Removing deletes the stored file too.
 * - Reordering takes the full list of photo URLs in the new order; anything
 *   but the same photos rearranged is refused (GALLERY_ORDER_INVALID).
 */
import mongoose from 'mongoose';
import Development, { IDevelopment, IDevelopmentPhoto } from '../../models/Development';
import { DEVELOPMENT_GALLERY_MAX } from '../../config/developments';
import { deleteImage, isMediaStorageConfigured, uploadImage } from '../mediaService';
import { createLogger } from '../../utils/logger';
import { recordDevelopmentAudit } from './developmentAudit';
import { ValidationError } from './developmentService';
import { NotFoundError } from './developmentListingService';
import { StorageUnavailableError } from './builderMedia';

const log = createLogger('ResidenceGallery');
type Oid = mongoose.Types.ObjectId;

const full = (count: number) =>
  new ValidationError(`A residence gallery holds at most ${DEVELOPMENT_GALLERY_MAX} photos`, {
    code: 'RESIDENCE_GALLERY_FULL',
    params: { max: DEVELOPMENT_GALLERY_MAX, remaining: Math.max(0, DEVELOPMENT_GALLERY_MAX - count) },
  });

/** Whether `urls` is exactly the gallery's photos in some order (pure). */
export const isGalleryPermutation = (urls: unknown, gallery: Pick<IDevelopmentPhoto, 'url'>[]): urls is string[] => {
  if (!Array.isArray(urls) || urls.length !== gallery.length) return false;
  if (!urls.every((u) => typeof u === 'string')) return false;
  const want = gallery.map((p) => p.url).sort();
  const got = [...(urls as string[])].sort();
  return want.every((u, i) => u === got[i]);
};

export const addResidencePhotos = async (development: IDevelopment, files: Buffer[], actorId: Oid): Promise<IDevelopment> => {
  if (files.length === 0) throw new ValidationError('No images uploaded', { code: 'NO_IMAGES' });
  const count = development.gallery?.length ?? 0;
  if (count + files.length > DEVELOPMENT_GALLERY_MAX) throw full(count);
  if (!isMediaStorageConfigured()) throw new StorageUnavailableError();

  const uploaded: IDevelopmentPhoto[] = [];
  try {
    for (const file of files) {
      // One at a time: keeps memory and storage-API concurrency bounded.
      // eslint-disable-next-line no-await-in-loop
      const r = await uploadImage(file, {
        userId: String(actorId),
        developmentId: String(development._id),
        developmentName: development.name,
        type: 'development-gallery',
        maxWidth: 2400,
        maxHeight: 2400,
      });
      uploaded.push({ url: r.url, publicId: r.publicId, width: r.width || undefined, height: r.height || undefined });
    }
    // Only while there is still room for all of them (another upload may have landed meanwhile).
    const updated = await Development.findOneAndUpdate(
      { _id: development._id, [`gallery.${DEVELOPMENT_GALLERY_MAX - uploaded.length}`]: { $exists: false } },
      { $push: { gallery: { $each: uploaded } } },
      { new: true, runValidators: true }
    );
    if (!updated) throw full(DEVELOPMENT_GALLERY_MAX);
    await recordDevelopmentAudit({ developmentId: development._id as Oid, action: 'development.update', actorId, metadata: { gallery: { added: uploaded.length } } });
    return updated;
  } catch (error) {
    // Nothing half-saved: files that made it to storage are removed again.
    await Promise.all(uploaded.map((p) => (p.publicId ? deleteImage(p.publicId).catch((e) => log.warn('Could not clean up gallery upload:', e)) : null)));
    throw error;
  }
};

export const removeResidencePhoto = async (development: IDevelopment, rawIndex: unknown, actorId: Oid): Promise<IDevelopment> => {
  const index = Number(rawIndex);
  const gallery = development.gallery ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= gallery.length) throw new NotFoundError('Gallery photo not found', { code: 'IMAGE_NOT_FOUND' });
  const target = gallery[index];
  const updated = await Development.findOneAndUpdate({ _id: development._id }, { $pull: { gallery: { url: target.url } } }, { new: true });
  if (!updated) throw new NotFoundError('Development not found', { code: 'RESIDENCE_NOT_FOUND' });
  if (target.publicId) {
    try {
      await deleteImage(target.publicId);
    } catch (err) {
      log.warn('Could not delete gallery photo:', err);
    }
  }
  await recordDevelopmentAudit({ developmentId: development._id as Oid, action: 'development.update', actorId, metadata: { gallery: { removed: 1 } } });
  return updated;
};

export const reorderResidencePhotos = async (development: IDevelopment, urls: unknown, actorId: Oid): Promise<IDevelopment> => {
  const gallery = development.gallery ?? [];
  if (!isGalleryPermutation(urls, gallery)) {
    throw new ValidationError('order must list every gallery photo once', { code: 'GALLERY_ORDER_INVALID', field: 'urls' });
  }
  const byUrl = new Map(gallery.map((p) => [p.url, { url: p.url, publicId: p.publicId, width: p.width, height: p.height }]));
  // Guarded on the current length, so a photo added or removed meanwhile makes this a no-op refusal.
  const updated = await Development.findOneAndUpdate(
    { _id: development._id, gallery: { $size: gallery.length } },
    { $set: { gallery: urls.map((u) => byUrl.get(u)!) } },
    { new: true, runValidators: true }
  );
  if (!updated) throw new ValidationError('The gallery changed meanwhile; reload and try again', { code: 'GALLERY_ORDER_INVALID', field: 'urls' });
  await recordDevelopmentAudit({ developmentId: development._id as Oid, action: 'development.update', actorId, metadata: { gallery: { reordered: true } } });
  return updated;
};
