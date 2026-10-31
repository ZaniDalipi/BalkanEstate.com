import sharp from 'sharp';
import CityMarketData from '../models/CityMarketData';
import { apiLogger } from '../utils/logger';
import { uploadMedia, deleteImage } from './mediaService';

const IMAGE_MAX_AGE_DAYS = 365; // Wikipedia photos rarely change; each refresh re-bills every derived size
const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_HEIGHT = 800;

/**
 * Fetch a city image URL from Wikipedia REST API.
 *
 * Prefers the full-resolution original over the summary endpoint's thumbnail.
 * That thumbnail is a fixed small size Wikipedia chooses for the mobile
 * summary card — commonly a few hundred pixels wide — which is exactly what
 * produced blurry city photos: `downloadAndResizeImage` below stretched it up
 * to fill a 1200x800 frame. The original is what a browser tab open on the
 * Wikipedia article would show, and can only be as small as the source photo
 * genuinely is, so a resize down from it never has to invent detail.
 */
async function fetchWikipediaImageUrl(cityName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName)}`
    );
    if (!res.ok) return null;
    const data = await res.json() as { originalimage?: { source: string }; thumbnail?: { source: string } };
    return data.originalimage?.source || data.thumbnail?.source || null;
  } catch {
    return null;
  }
}

/**
 * Download image from URL and fit it to the target frame with sharp, keeping
 * it a sensible size before storing.
 */
async function downloadAndResizeImage(imageUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // `withoutEnlargement` is the point: a source smaller than the 1200x800
    // frame is left at its own size (still cropped to the frame's aspect
    // ratio) rather than stretched up to fill it — stretching is what turns a
    // merely small photo into a visibly blurry one.
    const resized = await sharp(buffer)
      .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();

    return resized;
  } catch (error: any) {
    apiLogger.error(`Failed to download/resize image from ${imageUrl}:`, error.message);
    return null;
  }
}

/**
 * Fetch a city image from Wikipedia and store it in R2.
 * Only fetches if the city has no image or the image is older than IMAGE_MAX_AGE_DAYS.
 */
export async function refreshCityImage(cityId: string, force = false): Promise<string | null> {
  const city = await CityMarketData.findById(cityId);
  if (!city) return null;

  // An admin's photo is not the seeder's to replace — not even on a forced
  // refresh. Clearing the override in the admin screen is what hands the city
  // back to this job.
  if (city.imageSource === 'manual' && city.imageUrl) {
    return city.imageUrl;
  }

  // Skip if image is fresh enough
  if (!force && city.imageUrl && city.imageUpdatedAt) {
    const ageMs = Date.now() - city.imageUpdatedAt.getTime();
    if (ageMs < IMAGE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
      return city.imageUrl;
    }
  }

  const wikiUrl = await fetchWikipediaImageUrl(city.city);
  if (!wikiUrl) {
    apiLogger.warn(`No Wikipedia image found for ${city.city}`);
    return city.imageUrl || null;
  }

  // Download and fit to the frame before storing
  const resizedBuffer = await downloadAndResizeImage(wikiUrl);
  if (!resizedBuffer) return city.imageUrl || null;

  // cities/{country}/{city}/{photoId}. A refresh stores a new photo and
  // removes the previous one (folders are never overwritten — CDN-cached forever).
  let stored: { url: string; publicId: string };
  try {
    stored = await uploadMedia(resizedBuffer, 'city', { country: city.country, city: city.city }, { preserveQuality: true });
  } catch (error: any) {
    apiLogger.error(`Failed to store city image for ${city.city}:`, error.message);
    return city.imageUrl || null;
  }
  const previous = city.imagePublicId;
  await CityMarketData.findByIdAndUpdate(cityId, {
    imageUrl: stored.url,
    imagePublicId: stored.publicId,
    imageUpdatedAt: new Date(),
    imageSource: 'auto',
  });
  if (previous && previous !== stored.publicId) await deleteImage(previous);
  apiLogger.info(`Updated city image for ${city.city}: ${stored.url}`);
  return stored.url;
}

/**
 * Refresh images for all featured cities.
 * Runs in batches to avoid rate-limiting Wikipedia.
 */
export async function refreshAllCityImages(force = false): Promise<number> {
  const cities = await CityMarketData.find({ featured: true }).lean();
  let updated = 0;

  // Process in batches of 3 with longer delays to avoid Wikipedia 429 rate limits
  for (let i = 0; i < cities.length; i += 3) {
    const batch = cities.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map((city) => refreshCityImage(city._id.toString(), force))
    );
    updated += results.filter((r) => r.status === 'fulfilled' && r.value).length;

    // Delay between batches to respect Wikipedia rate limits
    if (i + 3 < cities.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  apiLogger.info(`Refreshed ${updated}/${cities.length} city images`);
  return updated;
}

/**
 * Seed images only for cities that don't have one yet.
 * Safe to call on every server startup — skips cities that already have images.
 */
export async function seedMissingCityImages(): Promise<number> {
  const citiesWithoutImages = await CityMarketData.find({
    featured: true,
    imageSource: { $ne: 'manual' },
    $or: [{ imageUrl: { $exists: false } }, { imageUrl: null }, { imageUrl: '' }],
  }).lean();

  if (citiesWithoutImages.length === 0) {
    apiLogger.info('All featured cities already have images — nothing to seed');
    return 0;
  }

  apiLogger.info(`Seeding images for ${citiesWithoutImages.length} cities without images...`);

  let seeded = 0;
  // Process in batches of 5
  for (let i = 0; i < citiesWithoutImages.length; i += 5) {
    const batch = citiesWithoutImages.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map((city) => refreshCityImage(city._id.toString(), true))
    );
    seeded += results.filter((r) => r.status === 'fulfilled' && r.value).length;

    if (i + 5 < citiesWithoutImages.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  apiLogger.info(`Seeded ${seeded}/${citiesWithoutImages.length} city images`);
  return seeded;
}
