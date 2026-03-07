import axios from 'axios';
import cloudinary from '../config/cloudinary';
import News from '../models/News';
import { cronLogger } from '../utils/logger';

const logger = cronLogger;

/**
 * Balkan real estate news sources.
 * Each source defines an RSS feed or web scrape target.
 * We use Google News RSS as a universal aggregator for each country.
 */
const NEWS_SOURCES: {
  country: string;
  countryCode: string;
  queries: string[];
}[] = [
  { country: 'Albania', countryCode: 'AL', queries: ['Albania real estate', 'Albania property investment'] },
  { country: 'Serbia', countryCode: 'RS', queries: ['Serbia real estate', 'Serbia property market'] },
  { country: 'Croatia', countryCode: 'HR', queries: ['Croatia real estate', 'Croatia property market'] },
  { country: 'Greece', countryCode: 'GR', queries: ['Greece real estate investment', 'Greece property market'] },
  { country: 'Montenegro', countryCode: 'ME', queries: ['Montenegro real estate', 'Montenegro property'] },
  { country: 'North Macedonia', countryCode: 'MK', queries: ['North Macedonia real estate', 'Macedonia property'] },
  { country: 'Bulgaria', countryCode: 'BG', queries: ['Bulgaria real estate', 'Bulgaria property market'] },
  { country: 'Kosovo', countryCode: 'XK', queries: ['Kosovo real estate', 'Kosovo property'] },
  { country: 'Slovenia', countryCode: 'SI', queries: ['Slovenia real estate', 'Slovenia property market'] },
  { country: 'Bosnia and Herzegovina', countryCode: 'BA', queries: ['Bosnia Herzegovina real estate', 'Bosnia property'] },
  { country: 'Romania', countryCode: 'RO', queries: ['Romania real estate', 'Romania property market'] },
];

const CATEGORIES = ['market', 'investment', 'regulation', 'development', 'tourism'] as const;

/**
 * Categorize a news article based on keywords in title/excerpt
 */
function categorizeArticle(title: string, excerpt: string): typeof CATEGORIES[number] {
  const text = `${title} ${excerpt}`.toLowerCase();
  if (/invest|fund|foreign|capital|acquisition|roi/i.test(text)) return 'investment';
  if (/law|regulation|tax|policy|legislation|government|reform|registry/i.test(text)) return 'regulation';
  if (/develop|construct|build|project|luxury|new\s+build|waterfront/i.test(text)) return 'development';
  if (/touris|travel|nomad|vacation|rental|airbnb|holiday/i.test(text)) return 'tourism';
  return 'market';
}

/**
 * Extract Open Graph image from a URL by fetching the HTML
 */
async function extractOgImage(url: string): Promise<string | null> {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 8000,
      maxRedirects: 3,
      headers: { 'User-Agent': 'BalkanEstateBot/1.0 (+https://balkanestate.com)' },
      responseType: 'text',
      // Only read first 50KB to extract meta tags
      maxContentLength: 50 * 1024,
    });

    // Extract og:image from HTML meta tags
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (ogMatch?.[1]) {
      const imageUrl = ogMatch[1];
      // Validate it looks like an image URL
      if (/\.(jpg|jpeg|png|webp|gif)/i.test(imageUrl) || imageUrl.includes('image')) {
        return imageUrl;
      }
      return imageUrl;
    }

    // Fallback: try twitter:image
    const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

    return twitterMatch?.[1] || null;
  } catch {
    return null;
  }
}

/**
 * Upload an image URL to Cloudinary for news covers
 */
async function uploadCoverToCloudinary(imageUrl: string, newsId: string): Promise<{ url: string; publicId: string } | null> {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'balkan-estate/news/covers',
      public_id: `news-${newsId}`,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 450, crop: 'fill', gravity: 'auto' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    logger.error(`Failed to upload news cover to Cloudinary: ${err}`);
    return null;
  }
}

/**
 * Parse Google News RSS XML into article entries
 */
function parseRssItems(xml: string): Array<{ title: string; link: string; pubDate: string; source: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; source: string; description: string }> = [];

  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  for (const itemXml of itemMatches.slice(0, 5)) {
    const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || itemXml.match(/<title>(.*?)<\/title>/)?.[1]
      || '';
    const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
    const source = itemXml.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || '';
    const description = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
      || itemXml.match(/<description>(.*?)<\/description>/)?.[1]
      || '';

    // Strip HTML from description
    const cleanDesc = description.replace(/<[^>]+>/g, '').trim();

    if (title && link) {
      items.push({ title: title.trim(), link: link.trim(), pubDate, source, description: cleanDesc });
    }
  }

  return items;
}

/**
 * Fetch news from Google News RSS for a given query
 */
async function fetchGoogleNewsRss(query: string): Promise<Array<{ title: string; link: string; pubDate: string; source: string; description: string }>> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`;
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'BalkanEstateBot/1.0' },
      responseType: 'text',
    });
    return parseRssItems(data);
  } catch (err) {
    logger.error(`Failed to fetch Google News RSS for "${query}": ${err}`);
    return [];
  }
}

/**
 * Main function: Fetch all Balkan real estate news, save to DB, upload covers
 */
export async function fetchAndStoreNews(): Promise<number> {
  logger.info('📰 Starting news fetch cycle...');
  let newArticlesCount = 0;

  for (const src of NEWS_SOURCES) {
    for (const query of src.queries) {
      try {
        const articles = await fetchGoogleNewsRss(query);

        for (const article of articles) {
          // Skip if already exists
          const exists = await News.findOne({ sourceUrl: article.link }).lean();
          if (exists) continue;

          const publishedAt = article.pubDate ? new Date(article.pubDate) : new Date();
          const excerpt = article.description.slice(0, 500) || article.title;
          const category = categorizeArticle(article.title, excerpt);

          const newsDoc = await News.create({
            title: article.title,
            excerpt,
            country: src.country,
            countryCode: src.countryCode,
            source: article.source || new URL(article.link).hostname.replace('www.', ''),
            sourceUrl: article.link,
            category,
            publishedAt,
            fetchedAt: new Date(),
          });

          // Try to get cover image from the original article
          const ogImage = await extractOgImage(article.link);
          if (ogImage) {
            const cloudResult = await uploadCoverToCloudinary(ogImage, newsDoc._id.toString());
            if (cloudResult) {
              newsDoc.coverImageUrl = cloudResult.url;
              newsDoc.coverImagePublicId = cloudResult.publicId;
              await newsDoc.save();
            }
          }

          newArticlesCount++;
        }
      } catch (err) {
        logger.error(`Failed processing query "${query}" for ${src.country}: ${err}`);
      }
    }
  }

  logger.info(`📰 News fetch complete. ${newArticlesCount} new articles added.`);
  return newArticlesCount;
}

/**
 * Delete news articles older than the specified number of months.
 * Also cleans up their Cloudinary covers.
 */
export async function cleanupOldNews(monthsOld = 3): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

  const oldArticles = await News.find({
    publishedAt: { $lt: cutoffDate },
  }).lean();

  if (oldArticles.length === 0) return 0;

  // Delete Cloudinary images
  const publicIds = oldArticles
    .map(a => a.coverImagePublicId)
    .filter(Boolean) as string[];

  if (publicIds.length > 0) {
    try {
      await cloudinary.api.delete_resources(publicIds);
    } catch (err) {
      logger.error(`Failed to delete old news covers from Cloudinary: ${err}`);
    }
  }

  const { deletedCount } = await News.deleteMany({
    publishedAt: { $lt: cutoffDate },
  });

  logger.info(`🗑️ Cleaned up ${deletedCount} news articles older than ${monthsOld} months.`);
  return deletedCount || 0;
}
