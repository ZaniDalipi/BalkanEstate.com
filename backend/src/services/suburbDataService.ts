import { GoogleGenerativeAI } from '@google/generative-ai';
import SuburbData, { ISuburbData, ISuburbEntry, ISuburbStats } from '../models/SuburbData';
import CityMarketData from '../models/CityMarketData';
import { SUBURB_CENTERS, CITY_COUNTRY_MAP } from '../data/suburbCenters';
import { apiLogger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || ''
);

/** Cache lifetime: 7 days in ms */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** How long to wait for Gemini before giving up (ms) */
const GEMINI_TIMEOUT_MS = 10_000;

const COUNTRY_FALLBACK_PRICES: Record<string, number> = {
  Kosovo: 900,
  Albania: 1200,
  'North Macedonia': 800,
  Serbia: 1200,
  'Bosnia and Herzegovina': 900,
  Croatia: 2000,
  Montenegro: 1500,
  Greece: 1800,
  Bulgaria: 1000,
  Romania: 1300,
};

function createCirclePolygon(
  center: [number, number],
  radiusKm: number,
  numPoints = 20
): { type: 'Polygon'; coordinates: number[][][] } {
  const coords: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const latOffset = (radiusKm / 111) * Math.cos(angle);
    const lngOffset =
      (radiusKm / (111 * Math.cos((center[0] * Math.PI) / 180))) *
      Math.sin(angle);
    coords.push([center[1] + lngOffset, center[0] + latOffset]);
  }
  return { type: 'Polygon' as const, coordinates: [coords] };
}

interface GeminiSuburbData {
  name: string;
  avgPricePerSqm: number;
  priceGrowthYoY: number;
  rentalYield: number;
  demandScore: number;
  listingsCount: number;
  daysOnMarket: number;
  propertyMix: { apartments: number; houses: number; commercial: number };
  highlights: string[];
}

/** Race Gemini against a hard timeout so the request never hangs. */
async function generateSuburbStats(
  city: string,
  country: string,
  cityAvgPricePerSqm: number,
  suburbNames: string[]
): Promise<GeminiSuburbData[]> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = `You are a real estate market analyst specializing in ${country}.
The city of ${city} has a city-wide average price of €${cityAvgPricePerSqm}/m².

Generate realistic real estate market data for these neighborhoods in ${city}: ${suburbNames.join(', ')}.

Respond with ONLY a valid JSON array. Each object must have these exact fields:
{
  "name": "neighborhood name",
  "avgPricePerSqm": number (realistic price per m² in EUR),
  "priceGrowthYoY": number (year-over-year % growth, between -5 and 25),
  "rentalYield": number (annual rental yield %, between 3 and 12),
  "demandScore": number (buyer demand 0-100),
  "listingsCount": number (approximate active listings),
  "daysOnMarket": number (average days to sell),
  "propertyMix": { "apartments": number, "houses": number, "commercial": number } (percentages summing to 100),
  "highlights": [string, string] (2 concise highlights about this specific neighborhood)
}

Guidelines:
- Premium/central neighborhoods: higher price, higher demand
- Suburban/outer areas: lower price, more houses
- Coastal/tourist areas: higher price, lower rental yield
- Make prices realistic for ${country}'s market (use city avg as anchor: €${cityAvgPricePerSqm}/m²)
- priceVsCityAvg will be computed from avgPricePerSqm`;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Gemini timeout after ${GEMINI_TIMEOUT_MS}ms`)), GEMINI_TIMEOUT_MS)
  );

  const geminiPromise = model.generateContent(prompt).then((result) => {
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in Gemini response');
    return JSON.parse(jsonMatch[0]) as GeminiSuburbData[];
  });

  return Promise.race([geminiPromise, timeoutPromise]);
}

function buildFallbackStats(
  suburbName: string,
  index: number,
  totalSuburbs: number,
  cityAvgPricePerSqm: number
): GeminiSuburbData {
  const priceFactor = 1.3 - (index / Math.max(totalSuburbs - 1, 1)) * 0.5;
  const avgPricePerSqm = Math.round(cityAvgPricePerSqm * priceFactor);
  const isPremium = index < totalSuburbs / 3;

  return {
    name: suburbName,
    avgPricePerSqm,
    priceGrowthYoY: isPremium ? 8 + Math.round(Math.random() * 4) : 4 + Math.round(Math.random() * 4),
    rentalYield: isPremium ? 4 + Math.random() * 2 : 5 + Math.random() * 3,
    demandScore: isPremium ? 75 + Math.round(Math.random() * 15) : 50 + Math.round(Math.random() * 20),
    listingsCount: 10 + Math.round(Math.random() * 40),
    daysOnMarket: isPremium ? 25 + Math.round(Math.random() * 20) : 35 + Math.round(Math.random() * 30),
    propertyMix: isPremium
      ? { apartments: 70, houses: 15, commercial: 15 }
      : { apartments: 50, houses: 40, commercial: 10 },
    highlights: [
      isPremium ? 'Prime location with high demand' : 'Affordable entry-level properties',
      isPremium ? 'Strong capital appreciation potential' : 'Good rental yield for investors',
    ],
  };
}

function buildSuburbEntries(
  geminiData: GeminiSuburbData[],
  city: string,
  cityAvgPricePerSqm: number
): ISuburbEntry[] {
  const centerEntries = SUBURB_CENTERS[city] ?? [];

  const geminiMap = new Map<string, GeminiSuburbData>();
  for (const d of geminiData) {
    geminiMap.set(d.name.toLowerCase(), d);
  }

  const entries: ISuburbEntry[] = centerEntries.map((ce) => {
    const gData = geminiMap.get(ce.name.toLowerCase()) ?? {
      name: ce.name,
      avgPricePerSqm: cityAvgPricePerSqm,
      priceGrowthYoY: 5,
      rentalYield: 5,
      demandScore: 60,
      listingsCount: 15,
      daysOnMarket: 40,
      propertyMix: { apartments: 60, houses: 30, commercial: 10 },
      highlights: ['Established residential area', 'Steady market conditions'],
    };

    const priceVsCityAvg =
      cityAvgPricePerSqm > 0
        ? Math.round(((gData.avgPricePerSqm - cityAvgPricePerSqm) / cityAvgPricePerSqm) * 100)
        : 0;

    const stats: ISuburbStats = {
      avgPricePerSqm: gData.avgPricePerSqm,
      priceVsCityAvg,
      priceGrowthYoY: gData.priceGrowthYoY,
      medianPrice: Math.round(gData.avgPricePerSqm * 70),
      rentalYield: Math.round(gData.rentalYield * 10) / 10,
      demandScore: Math.min(100, Math.max(0, Math.round(gData.demandScore))),
      listingsCount: gData.listingsCount,
      daysOnMarket: gData.daysOnMarket,
      propertyMix: gData.propertyMix,
      highlights: gData.highlights.slice(0, 3),
    };

    return {
      name: ce.name,
      nameLocal: ce.nameLocal,
      center: { lat: ce.center[0], lng: ce.center[1] },
      polygon: createCirclePolygon(ce.center, ce.radiusKm),
      stats,
      rank: 0,
    };
  });

  entries.sort((a, b) => b.stats.avgPricePerSqm - a.stats.avgPricePerSqm);
  entries.forEach((e, i) => { e.rank = i + 1; });

  return entries;
}

/**
 * Build a valid ISuburbData object purely from static data — no DB or API calls.
 * Instant response, always succeeds.
 */
function buildInMemoryFallback(city: string, country: string, cityAvgPricePerSqm?: number): ISuburbData {
  const price = cityAvgPricePerSqm ?? COUNTRY_FALLBACK_PRICES[country] ?? 1200;
  const countryCode = CITY_COUNTRY_MAP[city] ?? 'XX';

  const centers = SUBURB_CENTERS[city];
  let geminiData: GeminiSuburbData[];
  if (centers && centers.length > 0) {
    geminiData = centers.map((c, i) => buildFallbackStats(c.name, i, centers.length, price));
  } else {
    const names = ['City Center', 'North District', 'South District'];
    geminiData = names.map((name, i) => buildFallbackStats(name, i, names.length, price));
  }

  const suburbs = buildSuburbEntries(geminiData, city, price);

  return {
    city,
    country,
    countryCode,
    suburbs,
    cityAvgPricePerSqm: price,
    lastUpdated: new Date(),
    dataSource: 'fallback',
  } as unknown as ISuburbData;
}

/**
 * Persist suburb data to MongoDB in the background.
 * Never awaited by the request handler — failure is logged only.
 */
async function persistInBackground(
  city: string,
  country: string,
  cityAvgPricePerSqm: number
): Promise<void> {
  try {
    const centers = SUBURB_CENTERS[city];
    if (!centers || centers.length === 0) return;

    const countryCode = CITY_COUNTRY_MAP[city] ?? 'XX';
    const suburbNames = centers.map((c) => c.name);

    let geminiData: GeminiSuburbData[];
    let dataSource: 'gemini' | 'fallback' = 'fallback';

    try {
      geminiData = await generateSuburbStats(city, country, cityAvgPricePerSqm, suburbNames);
      dataSource = 'gemini';
      apiLogger.info(`Background: Gemini suburb data generated for ${city}`);
    } catch (err) {
      apiLogger.warn(`Background: Gemini failed for ${city}, persisting fallback data`, err);
      geminiData = suburbNames.map((name, i) =>
        buildFallbackStats(name, i, suburbNames.length, cityAvgPricePerSqm)
      );
    }

    const suburbs = buildSuburbEntries(geminiData, city, cityAvgPricePerSqm);

    await SuburbData.findOneAndUpdate(
      { city, country },
      { city, country, countryCode, suburbs, cityAvgPricePerSqm, lastUpdated: new Date(), dataSource },
      { upsert: true, new: true }
    );
    apiLogger.info(`Background: suburb data persisted for ${city} (${dataSource})`);
  } catch (err) {
    apiLogger.warn(`Background: suburb persist failed for ${city}`, err);
  }
}

/**
 * Get suburb data for a city.
 *
 * Strategy:
 *  1. Fresh MongoDB cache → return immediately (fast path)
 *  2. No fresh cache → return deterministic fallback data IMMEDIATELY,
 *     then fire Gemini generation in the background so the next request
 *     gets richer data. This prevents any external API from blocking the
 *     HTTP response and causing gateway timeouts.
 */
export async function getSuburbData(city: string, country: string): Promise<ISuburbData> {
  // Resolve city avg price (best-effort, non-blocking)
  let cityAvgPricePerSqm = COUNTRY_FALLBACK_PRICES[country] ?? 1200;
  try {
    const dbCity = await CityMarketData.findOne({ city, country }).lean();
    if (dbCity && (dbCity.avgPricePerSqm ?? 0) > 0) cityAvgPricePerSqm = dbCity.avgPricePerSqm!;
  } catch { /* use fallback price */ }

  // 1. Check MongoDB cache
  try {
    const cached = await SuburbData.findOne({ city, country });
    if (cached) {
      const ageMs = Date.now() - cached.lastUpdated.getTime();
      if (ageMs < CACHE_TTL_MS) {
        return cached;
      }
      // Stale — refresh in background, return stale data now
      persistInBackground(city, country, cityAvgPricePerSqm).catch(() => {});
      return cached;
    }
  } catch (err) {
    apiLogger.warn(`getSuburbData: cache lookup failed for ${city}`, err);
  }

  // 2. No cache — return fallback immediately, persist in background
  persistInBackground(city, country, cityAvgPricePerSqm).catch(() => {});
  return buildInMemoryFallback(city, country, cityAvgPricePerSqm);
}

/**
 * Force-regenerate suburb data from Gemini (or fallback) and persist.
 * Used by the admin refresh endpoint only.
 */
export async function refreshSuburbData(city: string, country: string): Promise<ISuburbData> {
  const centers = SUBURB_CENTERS[city];
  if (!centers || centers.length === 0) {
    throw new Error(`City not supported for suburb data: ${city}`);
  }

  let cityAvgPricePerSqm = COUNTRY_FALLBACK_PRICES[country] ?? 1200;
  try {
    const dbCity = await CityMarketData.findOne({ city, country }).lean();
    if (dbCity && (dbCity.avgPricePerSqm ?? 0) > 0) cityAvgPricePerSqm = dbCity.avgPricePerSqm!;
  } catch { /* use fallback price */ }

  const countryCode = CITY_COUNTRY_MAP[city] ?? 'XX';
  const suburbNames = centers.map((c) => c.name);

  let geminiData: GeminiSuburbData[];
  let dataSource: 'gemini' | 'fallback' = 'gemini';

  try {
    geminiData = await generateSuburbStats(city, country, cityAvgPricePerSqm, suburbNames);
    apiLogger.info(`Suburb data generated by Gemini for ${city}`);
  } catch (err) {
    apiLogger.warn(`Gemini suburb generation failed for ${city}, using fallback:`, err);
    geminiData = suburbNames.map((name, i) =>
      buildFallbackStats(name, i, suburbNames.length, cityAvgPricePerSqm)
    );
    dataSource = 'fallback';
  }

  const suburbs = buildSuburbEntries(geminiData, city, cityAvgPricePerSqm);

  try {
    const doc = await SuburbData.findOneAndUpdate(
      { city, country },
      { city, country, countryCode, suburbs, cityAvgPricePerSqm, lastUpdated: new Date(), dataSource },
      { upsert: true, new: true }
    );
    return doc;
  } catch (err) {
    apiLogger.warn(`refreshSuburbData: DB save failed for ${city}, returning in-memory data`, err);
    return {
      city, country, countryCode, suburbs, cityAvgPricePerSqm,
      lastUpdated: new Date(), dataSource,
    } as unknown as ISuburbData;
  }
}
