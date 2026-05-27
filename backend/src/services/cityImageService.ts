import { Readable } from 'stream';
import sharp from 'sharp';
import cloudinary from '../config/cloudinary';
import CityMarketData from '../models/CityMarketData';
import { apiLogger } from '../utils/logger';

const IMAGE_MAX_AGE_DAYS = 30; // Re-fetch images older than 30 days
const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_HEIGHT = 800;

/**
 * Fetch a city thumbnail URL from Wikipedia REST API.
 * Prefers thumbnail over originalimage to reduce download size.
 */
async function fetchWikipediaImageUrl(cityName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName)}`
    );
    if (!res.ok) return null;
    const data = await res.json() as { originalimage?: { source: string }; thumbnail?: { source: string } };
    // Prefer thumbnail to avoid downloading huge originals; fall back to original
    return data.thumbnail?.source || data.originalimage?.source || null;
  } catch {
    return null;
  }
}

/**
 * Download image from URL and resize it with sharp to stay under Cloudinary's 10MB limit.
 */
async function downloadAndResizeImage(imageUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize and compress with sharp
    const resized = await sharp(buffer)
      .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    return resized;
  } catch (error: any) {
    apiLogger.error(`Failed to download/resize image from ${imageUrl}:`, error.message);
    return null;
  }
}

/**
 * Upload a resized image buffer to Cloudinary
 */
/** Normalises a name to match the frontend's getCityImageUrl format */
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Upload an image buffer to Cloudinary.
 * Public ID format: city-{country}-{city}  — must match getCityImageUrl() in cloudinaryConfig.ts
 */
async function uploadBufferToCloudinary(
  imageBuffer: Buffer,
  cityName: string,
  country = 'unknown'
): Promise<string | null> {
  try {
    const publicId = `city-${normalizeName(country)}-${normalizeName(cityName)}`;
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      const readable = new Readable();
      readable.push(imageBuffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
    return result.secure_url;
  } catch (error: any) {
    apiLogger.error(`Failed to upload city image for ${cityName}:`, error.message);
    return null;
  }
}

/**
 * Fetch and store a city image from Wikipedia to Cloudinary.
 * Only fetches if the city has no image or the image is older than IMAGE_MAX_AGE_DAYS.
 */
export async function refreshCityImage(cityId: string, force = false): Promise<string | null> {
  const city = await CityMarketData.findById(cityId);
  if (!city) return null;

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

  // Download and resize locally before uploading to Cloudinary (avoids 10MB limit)
  const resizedBuffer = await downloadAndResizeImage(wikiUrl);
  if (!resizedBuffer) return city.imageUrl || null;

  const cloudinaryUrl = await uploadBufferToCloudinary(resizedBuffer, city.city, city.country);
  if (!cloudinaryUrl) return city.imageUrl || null;

  await CityMarketData.findByIdAndUpdate(cityId, {
    imageUrl: cloudinaryUrl,
    imageUpdatedAt: new Date(),
  });

  apiLogger.info(`Updated city image for ${city.city}: ${cloudinaryUrl}`);
  return cloudinaryUrl;
}

/**
 * Refresh images for all featured cities.
 * Runs in batches to avoid rate-limiting Wikipedia/Cloudinary.
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
