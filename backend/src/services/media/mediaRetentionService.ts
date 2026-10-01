import Property from '../../models/Property';
import ArchivedListing from '../../models/ArchivedListing';
import cloudinary from '../../config/cloudinary';
import { mediaLogger } from '../../utils/logger';
import { deleteByTag, deleteImages } from '../cloudinaryService';
import { listingTag } from './mediaNaming';
import { readMediaRetentionPolicy, retentionCutoff, type MediaRetentionPolicy } from './mediaRetentionPolicy';

/**
 * Clears Cloudinary media for listings that ended long ago.
 *
 *  - Deleted listings: the one archive thumbnail kept at deletion time is
 *    removed after `deletedYears`.
 *  - Sold listings: every photo, floor plan and video is removed after
 *    `soldYears`. The listing record stays (sales history, SEO) and shows the
 *    "photos removed" placeholder instead.
 *
 * Each run handles a bounded batch — Cloudinary's Admin API is rate-limited
 * (~500 calls/hour on the free plan) — and marks what it cleared with
 * `mediaPurgedAt`, so a later run picks up where this one stopped.
 */

export interface MediaRetentionResult {
  deletedArchivesPurged: number;
  soldListingsPurged: number;
  failures: number;
}

/** Shown in place of photos removed by retention. `imageUrl` is required on Property. */
export const PURGED_MEDIA_PLACEHOLDER = `${(process.env.FRONTEND_URL || 'https://balkanestate.com').replace(/\/+$/, '')}/images/listing-photos-removed.svg`;

const DEFAULT_BATCH = 50;

const collectListingPublicIds = (property: {
  imagePublicId?: string;
  floorplanPublicId?: string;
  images?: Array<{ publicId?: string }>;
  floorplans?: Array<{ publicId?: string }>;
}): string[] =>
  [
    property.imagePublicId,
    property.floorplanPublicId,
    ...(property.images || []).map((img) => img.publicId),
    ...(property.floorplans || []).map((plan) => plan.publicId),
  ].filter((id): id is string => typeof id === 'string' && id.length > 0);

/** Remove the archive thumbnails of listings deleted more than `years` ago. */
export const purgeDeletedListingMedia = async (years: number, batchSize = DEFAULT_BATCH): Promise<number> => {
  const archives = await ArchivedListing.find({
    archiveReason: 'deleted',
    archivedAt: { $lt: retentionCutoff(years) },
    mediaPurgedAt: { $exists: false },
  })
    .select('_id thumbnailPublicId')
    .limit(batchSize)
    .lean<Array<{ _id: unknown; thumbnailPublicId?: string }>>();

  if (archives.length === 0) return 0;

  const publicIds = archives.map((a) => a.thumbnailPublicId).filter((id): id is string => Boolean(id));
  for (let i = 0; i < publicIds.length; i += 100) {
    await deleteImages(publicIds.slice(i, i + 100));
  }

  await ArchivedListing.updateMany(
    { _id: { $in: archives.map((a) => a._id) } },
    { $set: { mediaPurgedAt: new Date() }, $unset: { thumbnailUrl: '', thumbnailPublicId: '' } }
  );

  mediaLogger.info(`🧹 Retention: cleared thumbnails of ${archives.length} deleted listings`);
  return archives.length;
};

/** Remove all media of listings sold more than `years` ago. */
export const purgeSoldListingMedia = async (
  years: number,
  batchSize = DEFAULT_BATCH
): Promise<{ purged: number; failures: number }> => {
  const listings = await Property.find({
    status: 'sold',
    soldAt: { $lt: retentionCutoff(years) },
    mediaPurgedAt: { $exists: false },
  })
    .select('_id imagePublicId floorplanPublicId images floorplans generatedVideoPublicId generatedVideoUrl videoUrl')
    .limit(batchSize)
    .lean();

  let purged = 0;
  let failures = 0;

  for (const listing of listings) {
    const propertyId = String(listing._id);
    try {
      const publicIds = collectListingPublicIds(listing);
      for (let i = 0; i < publicIds.length; i += 100) {
        await deleteImages(publicIds.slice(i, i + 100));
      }
      if (listing.generatedVideoPublicId) {
        // Upload API call — not counted against the Admin API limit.
        await cloudinary.uploader
          .destroy(listing.generatedVideoPublicId, { resource_type: 'video' })
          .catch(() => undefined);
      }
      // Catches anything tagged to the listing that the record no longer lists.
      await deleteByTag(listingTag(propertyId));

      // videoUrl mirrors the generated video when one was embedded; a YouTube
      // or Instagram link is not ours to remove.
      const videoIsOurs = Boolean(listing.generatedVideoUrl) && listing.videoUrl === listing.generatedVideoUrl;

      await Property.updateOne(
        { _id: listing._id },
        {
          $set: {
            mediaPurgedAt: new Date(),
            imageUrl: PURGED_MEDIA_PLACEHOLDER,
            images: [],
            hasGeneratedVideo: false,
          },
          $unset: {
            imagePublicId: '',
            floorplanUrl: '',
            floorplanPublicId: '',
            floorplans: '',
            generatedVideoUrl: '',
            generatedVideoPublicId: '',
            ...(videoIsOurs ? { videoUrl: '' } : {}),
          },
        }
      );
      await ArchivedListing.updateMany(
        { originalPropertyId: listing._id, mediaPurgedAt: { $exists: false } },
        { $set: { mediaPurgedAt: new Date() }, $unset: { thumbnailUrl: '', thumbnailPublicId: '' } }
      );
      purged++;
    } catch (error) {
      failures++;
      mediaLogger.error(`❌ Retention: failed to clear media of sold listing ${propertyId}:`, error);
    }
  }

  if (purged > 0) mediaLogger.info(`🧹 Retention: cleared media of ${purged} sold listings`);
  return { purged, failures };
};

/** Run both retention sweeps with the configured policy. */
export const runMediaRetention = async (
  policy: MediaRetentionPolicy = readMediaRetentionPolicy(process.env, (name, error) =>
    mediaLogger.warn(`⚠️  Ignoring ${name}: ${error}. Using the default.`)
  )
): Promise<MediaRetentionResult> => {
  let failures = 0;
  let deletedArchivesPurged = 0;

  try {
    deletedArchivesPurged = await purgeDeletedListingMedia(policy.deletedYears);
  } catch (error) {
    failures++;
    mediaLogger.error('❌ Retention: deleted-listing sweep failed:', error);
  }

  const sold = await purgeSoldListingMedia(policy.soldYears).catch((error) => {
    mediaLogger.error('❌ Retention: sold-listing sweep failed:', error);
    return { purged: 0, failures: 1 };
  });

  return {
    deletedArchivesPurged,
    soldListingsPurged: sold.purged,
    failures: failures + sold.failures,
  };
};
