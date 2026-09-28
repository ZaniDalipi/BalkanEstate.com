/**
 * One-time cleanup: remove every video file stored on Cloudinary.
 *
 * Videos on the site are links only (YouTube / TikTok / Instagram). This
 * deletes what was stored before that rule:
 *   1. Generated listing videos — the file is destroyed and the listing's
 *      generated-video fields are cleared (a Cloudinary `videoUrl` too;
 *      YouTube/TikTok/Instagram links are left alone).
 *   2. "How it works" videos uploaded as files — destroyed and the item is
 *      hidden (isActive: false) until an admin gives it a YouTube link.
 *   3. Any other video still under balkan-estate/ (orphans).
 *
 * Dry run by default — prints what it would do. Pass --apply to delete.
 *   npm run cleanup:videos          (dry run)
 *   npm run cleanup:videos:apply
 */
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary';
import Property from '../models/Property';
import SiteContent from '../models/SiteContent';

const CLOUDINARY_VIDEO_URL = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//i;

/** public_id from a Cloudinary video URL: everything after the version, minus the extension. */
export const publicIdFromVideoUrl = (url: string): string | null => {
  if (!CLOUDINARY_VIDEO_URL.test(url)) return null;
  const afterUpload = url.replace(CLOUDINARY_VIDEO_URL, '').split('?')[0];
  const parts = afterUpload.split('/');
  const versionIdx = parts.findIndex((p) => /^v\d+$/.test(p));
  const rest = versionIdx >= 0 ? parts.slice(versionIdx + 1) : parts;
  const id = rest.join('/').replace(/\.[^/.]+$/, '');
  return id || null;
};

interface Counts {
  listings: number;
  siteContent: number;
  orphans: number;
  failed: number;
}

const destroyVideo = async (publicId: string, apply: boolean, counts: Counts): Promise<boolean> => {
  if (!apply) return true;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video', invalidate: true });
    return true;
  } catch (error) {
    counts.failed++;
    console.error(`  ✗ could not delete ${publicId}: ${(error as Error).message}`);
    return false;
  }
};

async function cleanListings(apply: boolean, counts: Counts): Promise<void> {
  const listings = await Property.find({
    $or: [
      { generatedVideoPublicId: { $exists: true, $ne: '' } },
      { generatedVideoUrl: { $exists: true, $ne: '' } },
      { videoUrl: CLOUDINARY_VIDEO_URL },
    ],
  })
    .select('_id title videoUrl generatedVideoUrl generatedVideoPublicId')
    .lean();

  for (const listing of listings) {
    const ids = new Set<string>();
    if (listing.generatedVideoPublicId) ids.add(listing.generatedVideoPublicId);
    for (const url of [listing.generatedVideoUrl, listing.videoUrl]) {
      const id = url ? publicIdFromVideoUrl(url) : null;
      if (id) ids.add(id);
    }

    console.log(`  listing ${listing._id} "${listing.title ?? ''}": ${[...ids].join(', ') || '(fields only)'}`);
    let ok = true;
    for (const id of ids) ok = (await destroyVideo(id, apply, counts)) && ok;

    if (apply && ok) {
      const videoUrlIsStored = typeof listing.videoUrl === 'string' && CLOUDINARY_VIDEO_URL.test(listing.videoUrl);
      await Property.updateOne(
        { _id: listing._id },
        {
          $set: { hasGeneratedVideo: false },
          $unset: {
            generatedVideoUrl: '',
            generatedVideoPublicId: '',
            generatedVideoFormat: '',
            generatedVideoDuration: '',
            ...(videoUrlIsStored ? { videoUrl: '' } : {}),
          },
        }
      );
    }
    if (ok) counts.listings++;
  }
}

async function cleanSiteContent(apply: boolean, counts: Counts): Promise<void> {
  const items = await SiteContent.find({
    $or: [{ url: CLOUDINARY_VIDEO_URL }, { type: 'video', publicId: { $exists: true, $ne: '' } }],
  })
    .select('_id key title url publicId')
    .lean();

  for (const item of items) {
    const id = item.publicId || publicIdFromVideoUrl(item.url);
    console.log(`  site content "${item.title}" (${item.key}): ${id ?? '(no public id)'} → hidden until given a YouTube link`);
    const ok = id ? await destroyVideo(id, apply, counts) : true;
    if (apply && ok) {
      await SiteContent.updateOne({ _id: item._id }, { $set: { isActive: false }, $unset: { publicId: '' } });
    }
    if (ok) counts.siteContent++;
  }
}

/** Videos under our root that no record points at any more. Admin API; paginated. */
async function cleanOrphans(apply: boolean, counts: Counts): Promise<void> {
  let cursor: string | undefined;
  do {
    const page: { resources?: Array<{ public_id: string; bytes?: number }>; next_cursor?: string } =
      await cloudinary.api.resources({
        resource_type: 'video',
        type: 'upload',
        prefix: 'balkan-estate/',
        max_results: 500,
        ...(cursor ? { next_cursor: cursor } : {}),
      });
    for (const r of page.resources || []) {
      console.log(`  orphan ${r.public_id} (${Math.round((r.bytes || 0) / 1024 / 1024)} MB)`);
      if (await destroyVideo(r.public_id, apply, counts)) counts.orphans++;
    }
    cursor = page.next_cursor;
  } while (cursor);
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);

  console.log(apply ? 'Removing stored videos from Cloudinary…' : 'DRY RUN — nothing will be deleted (pass --apply)');
  const counts: Counts = { listings: 0, siteContent: 0, orphans: 0, failed: 0 };

  try {
    console.log('\nGenerated listing videos:');
    await cleanListings(apply, counts);
    console.log('\n"How it works" uploaded videos:');
    await cleanSiteContent(apply, counts);
    console.log('\nOther videos under balkan-estate/:');
    await cleanOrphans(apply, counts);
  } finally {
    await mongoose.disconnect();
  }

  const verb = apply ? 'removed' : 'would remove';
  console.log(
    `\nDone. ${verb}: ${counts.listings} listing videos, ${counts.siteContent} how-it-works videos, ` +
      `${counts.orphans} orphans. Failed: ${counts.failed}.`
  );
  if (counts.failed > 0) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
