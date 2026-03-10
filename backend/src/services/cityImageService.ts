import cloudinary from '../config/cloudinary';
import CityMarketData from '../models/CityMarketData';
import { apiLogger } from '../utils/logger';

const CITY_IMAGE_FOLDER = 'balkan-estate/cities';
const IMAGE_MAX_AGE_DAYS = 30; // Re-fetch images older than 30 days

/**
 * Fetch a city thumbnail URL from Wikipedia REST API
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
 * Upload an image from a URL to Cloudinary
 */
async function uploadUrlToCloudinary(
  imageUrl: string,
  cityName: string
): Promise<string | null> {
  try {
    const publicId = `${CITY_IMAGE_FOLDER}/${cityName.toLowerCase().replace(/\s+/g, '-')}`;
    const result = await cloudinary.uploader.upload(imageUrl, {
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 800, crop: 'fill', gravity: 'auto' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
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

  const cloudinaryUrl = await uploadUrlToCloudinary(wikiUrl, city.city);
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

  // Process in batches of 5
  for (let i = 0; i < cities.length; i += 5) {
    const batch = cities.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map((city) => refreshCityImage(city._id.toString(), force))
    );
    updated += results.filter((r) => r.status === 'fulfilled' && r.value).length;

    // Small delay between batches to respect rate limits
    if (i + 5 < cities.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
