import axios from 'axios';
import cloudinary from '../config/cloudinary';
import News from '../models/News';
import { cronLogger } from '../utils/logger';

const logger = cronLogger;

/**
 * Balkan real estate news sources.
 * Google News RSS queries per country + dedicated RSS feeds from real estate publications.
 */
const NEWS_SOURCES: {
  country: string;
  countryCode: string;
  queries: string[];
}[] = [
  { country: 'Albania', countryCode: 'AL', queries: ['Albania real estate', 'Albania property investment', 'Albania housing market', 'Tirana apartment prices'] },
  { country: 'Serbia', countryCode: 'RS', queries: ['Serbia real estate', 'Serbia property market', 'Belgrade real estate investment', 'Serbia housing prices'] },
  { country: 'Croatia', countryCode: 'HR', queries: ['Croatia real estate', 'Croatia property market', 'Croatia housing investment', 'Zagreb Dubrovnik property'] },
  { country: 'Greece', countryCode: 'GR', queries: ['Greece real estate investment', 'Greece property market', 'Athens property prices', 'Greece golden visa property'] },
  { country: 'Montenegro', countryCode: 'ME', queries: ['Montenegro real estate', 'Montenegro property', 'Montenegro coastal property investment', 'Tivat Budva real estate'] },
  { country: 'North Macedonia', countryCode: 'MK', queries: ['North Macedonia real estate', 'Macedonia property', 'Skopje housing market'] },
  { country: 'Bulgaria', countryCode: 'BG', queries: ['Bulgaria real estate', 'Bulgaria property market', 'Sofia property investment', 'Bulgaria Black Sea property'] },
  { country: 'Kosovo', countryCode: 'XK', queries: ['Kosovo real estate', 'Kosovo property', 'Pristina housing market', 'Kosovo diaspora property'] },
  { country: 'Slovenia', countryCode: 'SI', queries: ['Slovenia real estate', 'Slovenia property market', 'Ljubljana property prices', 'Slovenia housing investment'] },
  { country: 'Bosnia and Herzegovina', countryCode: 'BA', queries: ['Bosnia Herzegovina real estate', 'Bosnia property', 'Sarajevo housing market', 'Bosnia property investment'] },
  { country: 'Romania', countryCode: 'RO', queries: ['Romania real estate', 'Romania property market', 'Bucharest apartment prices', 'Romania housing investment'] },
];

/**
 * Dedicated RSS feeds from real estate and Balkan news publications.
 * These provide higher-quality, more relevant articles than generic Google News.
 */
const DEDICATED_RSS_FEEDS: {
  url: string;
  source: string;
  /** Countries this feed covers; empty = all Balkan countries (assigned by keyword matching) */
  countries: string[];
}[] = [
  // Regional Balkan news outlets
  { url: 'https://balkaninsight.com/feed/', source: 'Balkan Insight', countries: [] },
  { url: 'https://seenews.com/rss', source: 'SeeNews', countries: [] },
  { url: 'https://emerging-europe.com/feed/', source: 'Emerging Europe', countries: [] },
  // Global real estate & investment
  { url: 'https://www.globalpropertyguide.com/feed', source: 'Global Property Guide', countries: [] },
  { url: 'https://www.thinkspain.com/rss/news', source: 'Think Property', countries: [] },
  // Country-specific outlets
  { url: 'https://www.croatiaweek.com/feed/', source: 'Croatia Week', countries: ['Croatia'] },
  { url: 'https://www.romania-insider.com/feed', source: 'Romania Insider', countries: ['Romania'] },
  { url: 'https://sloveniatimes.com/feed/', source: 'Slovenia Times', countries: ['Slovenia'] },
  { url: 'https://greekreporter.com/feed/', source: 'Greek Reporter', countries: ['Greece'] },
  { url: 'https://www.novinite.com/rss.php', source: 'Novinite', countries: ['Bulgaria'] },
  { url: 'https://www.b92.net/eng/rss/news.xml', source: 'B92', countries: ['Serbia'] },
  { url: 'https://www.monitor.al/feed/', source: 'Monitor Albania', countries: ['Albania'] },
  { url: 'https://balkangreenenergynews.com/feed/', source: 'Balkan Green Energy News', countries: [] },
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
      headers: { 'User-Agent': 'BalkanEstateBot/1.0 (+https://balkanestateai.com)' },
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

/** Map of country keywords → (country, countryCode) for auto-detecting country from article text */
const COUNTRY_KEYWORDS: { pattern: RegExp; country: string; countryCode: string }[] = [
  { pattern: /\b(albania|tirana|albanian|durres|vlore|saranda)\b/i, country: 'Albania', countryCode: 'AL' },
  { pattern: /\b(serbia|belgrade|serbian|novi sad)\b/i, country: 'Serbia', countryCode: 'RS' },
  { pattern: /\b(croatia|croatian|zagreb|dubrovnik|split)\b/i, country: 'Croatia', countryCode: 'HR' },
  { pattern: /\b(greece|greek|athens|thessaloniki|crete)\b/i, country: 'Greece', countryCode: 'GR' },
  { pattern: /\b(montenegro|montenegrin|podgorica|budva|kotor|tivat)\b/i, country: 'Montenegro', countryCode: 'ME' },
  { pattern: /\b(north macedonia|macedoni|skopje|ohrid)\b/i, country: 'North Macedonia', countryCode: 'MK' },
  { pattern: /\b(bulgaria|bulgarian|sofia|varna|plovdiv|burgas)\b/i, country: 'Bulgaria', countryCode: 'BG' },
  { pattern: /\b(kosovo|pristina|prizren)\b/i, country: 'Kosovo', countryCode: 'XK' },
  { pattern: /\b(slovenia|slovenian|ljubljana|maribor|piran)\b/i, country: 'Slovenia', countryCode: 'SI' },
  { pattern: /\b(bosnia|sarajevo|mostar|herzegov)\b/i, country: 'Bosnia and Herzegovina', countryCode: 'BA' },
  { pattern: /\b(romania|romanian|bucharest|cluj|timisoara)\b/i, country: 'Romania', countryCode: 'RO' },
];

function detectCountry(text: string): { country: string; countryCode: string } | null {
  for (const kw of COUNTRY_KEYWORDS) {
    if (kw.pattern.test(text)) return { country: kw.country, countryCode: kw.countryCode };
  }
  return null;
}

/**
 * Filter articles from dedicated feeds to only include real-estate-related content
 */
function isRealEstateRelated(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return /real estate|property|housing|apartment|mortgage|rental|construction|development|invest|building|residential|commercial\s+space|home\s+price|house\s+price/i.test(text);
}

/**
 * Parse Google News RSS XML into article entries
 */
function parseRssItems(xml: string): Array<{ title: string; link: string; pubDate: string; source: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; source: string; description: string }> = [];

  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  for (const itemXml of itemMatches.slice(0, 8)) {
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
 * Fetch articles from a dedicated RSS feed and return parsed items with detected country
 */
async function fetchDedicatedFeed(feed: typeof DEDICATED_RSS_FEEDS[number]): Promise<Array<{
  title: string; link: string; pubDate: string; source: string; description: string;
  country: string; countryCode: string;
}>> {
  try {
    const { data: xml } = await axios.get(feed.url, {
      timeout: 12000,
      headers: { 'User-Agent': 'BalkanEstateBot/1.0 (+https://balkanestateai.com)' },
      responseType: 'text',
    });

    const items = parseRssItems(xml);
    const results: Array<{
      title: string; link: string; pubDate: string; source: string; description: string;
      country: string; countryCode: string;
    }> = [];

    for (const item of items) {
      // Filter: only real estate related content
      if (!isRealEstateRelated(item.title, item.description)) continue;

      // Determine country
      let country: string | undefined;
      let countryCode: string | undefined;

      if (feed.countries.length === 1) {
        // Country-specific feed
        const src = NEWS_SOURCES.find(s => s.country === feed.countries[0]);
        country = src?.country || feed.countries[0];
        countryCode = src?.countryCode || '';
      } else {
        // Regional feed — detect country from article text
        const detected = detectCountry(`${item.title} ${item.description}`);
        if (!detected) continue; // Skip articles we can't assign to a Balkan country
        country = detected.country;
        countryCode = detected.countryCode;
      }

      results.push({
        ...item,
        source: feed.source,
        country,
        countryCode,
      });
    }

    return results;
  } catch (err) {
    logger.error(`Failed to fetch dedicated feed ${feed.source} (${feed.url}): ${err}`);
    return [];
  }
}

/**
 * Save an article to the database with cover image extraction
 */
async function saveArticle(article: {
  title: string; link: string; pubDate: string; source: string; description: string;
  country: string; countryCode: string;
}): Promise<boolean> {
  // Skip if already exists
  const exists = await News.findOne({ sourceUrl: article.link }).lean();
  if (exists) return false;

  const publishedAt = article.pubDate ? new Date(article.pubDate) : new Date();
  const excerpt = article.description.slice(0, 500) || article.title;
  const category = categorizeArticle(article.title, excerpt);

  const newsDoc = await News.create({
    title: article.title,
    excerpt,
    country: article.country,
    countryCode: article.countryCode,
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

  return true;
}

/**
 * Main function: Fetch all Balkan real estate news, save to DB, upload covers.
 * Sources: Google News RSS (per-country queries) + dedicated real estate RSS feeds.
 */
export async function fetchAndStoreNews(): Promise<number> {
  logger.info('📰 Starting news fetch cycle...');
  let newArticlesCount = 0;

  // 1. Fetch from Google News RSS per country
  for (const src of NEWS_SOURCES) {
    for (const query of src.queries) {
      try {
        const articles = await fetchGoogleNewsRss(query);
        for (const article of articles) {
          try {
            const saved = await saveArticle({
              ...article,
              country: src.country,
              countryCode: src.countryCode,
            });
            if (saved) newArticlesCount++;
          } catch (err) {
            logger.error(`Failed saving article "${article.title}": ${err}`);
          }
        }
      } catch (err) {
        logger.error(`Failed processing query "${query}" for ${src.country}: ${err}`);
      }
    }
  }

  // 2. Fetch from dedicated RSS feeds (real estate publications, Balkan news outlets)
  logger.info('📰 Fetching from dedicated RSS feeds...');
  for (const feed of DEDICATED_RSS_FEEDS) {
    try {
      const articles = await fetchDedicatedFeed(feed);
      for (const article of articles) {
        try {
          const saved = await saveArticle(article);
          if (saved) newArticlesCount++;
        } catch (err) {
          logger.error(`Failed saving article from ${feed.source}: ${err}`);
        }
      }
    } catch (err) {
      logger.error(`Failed processing feed ${feed.source}: ${err}`);
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
