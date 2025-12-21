import { GoogleGenerativeAI } from '@google/generative-ai';
import CityMarketData, { ICityMarketData } from '../models/CityMarketData';
import Property from '../models/Property';
import { FlattenMaps } from 'mongoose';

// Type for lean documents (plain objects without Mongoose methods)
export type CityMarketDataLean = FlattenMaps<ICityMarketData> & { _id: string };

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '');

interface CityDataFromGemini {
  city: string;
  country: string;
  countryCode: string;
  avgPricePerSqm: number;
  medianPrice: number;
  priceGrowthYoY: number;
  averageDaysOnMarket: number;
  demandScore: number;
  rentalYield: number;
  investmentScore: number;
  topNeighborhoods: string[];
  marketTrend: 'rising' | 'stable' | 'declining';
  highlights: string[];
}

/**
 * Selected cities to feature across all Balkan countries
 * Chosen based on population, economic importance, and tourism
 */
const FEATURED_CITIES = [
  // Kosovo - 3 cities
  { city: 'Prishtina', country: 'Kosovo', countryCode: 'XK' },
  { city: 'Prizren', country: 'Kosovo', countryCode: 'XK' },
  { city: 'Peja', country: 'Kosovo', countryCode: 'XK' },

  // Albania - 4 cities
  { city: 'Tirana', country: 'Albania', countryCode: 'AL' },
  { city: 'Durres', country: 'Albania', countryCode: 'AL' },
  { city: 'Vlore', country: 'Albania', countryCode: 'AL' },
  { city: 'Sarande', country: 'Albania', countryCode: 'AL' },

  // North Macedonia - 3 cities
  { city: 'Skopje', country: 'North Macedonia', countryCode: 'MK' },
  { city: 'Ohrid', country: 'North Macedonia', countryCode: 'MK' },
  { city: 'Bitola', country: 'North Macedonia', countryCode: 'MK' },

  // Serbia - 4 cities
  { city: 'Belgrade', country: 'Serbia', countryCode: 'RS' },
  { city: 'Novi Sad', country: 'Serbia', countryCode: 'RS' },
  { city: 'Nis', country: 'Serbia', countryCode: 'RS' },
  { city: 'Kragujevac', country: 'Serbia', countryCode: 'RS' },

  // Bosnia and Herzegovina - 3 cities
  { city: 'Sarajevo', country: 'Bosnia and Herzegovina', countryCode: 'BA' },
  { city: 'Banja Luka', country: 'Bosnia and Herzegovina', countryCode: 'BA' },
  { city: 'Mostar', country: 'Bosnia and Herzegovina', countryCode: 'BA' },

  // Croatia - 4 cities
  { city: 'Zagreb', country: 'Croatia', countryCode: 'HR' },
  { city: 'Split', country: 'Croatia', countryCode: 'HR' },
  { city: 'Dubrovnik', country: 'Croatia', countryCode: 'HR' },
  { city: 'Rijeka', country: 'Croatia', countryCode: 'HR' },

  // Montenegro - 3 cities
  { city: 'Podgorica', country: 'Montenegro', countryCode: 'ME' },
  { city: 'Budva', country: 'Montenegro', countryCode: 'ME' },
  { city: 'Kotor', country: 'Montenegro', countryCode: 'ME' },

  // Greece - 4 cities
  { city: 'Athens', country: 'Greece', countryCode: 'GR' },
  { city: 'Thessaloniki', country: 'Greece', countryCode: 'GR' },
  { city: 'Patras', country: 'Greece', countryCode: 'GR' },
  { city: 'Heraklion', country: 'Greece', countryCode: 'GR' },

  // Bulgaria - 4 cities
  { city: 'Sofia', country: 'Bulgaria', countryCode: 'BG' },
  { city: 'Plovdiv', country: 'Bulgaria', countryCode: 'BG' },
  { city: 'Varna', country: 'Bulgaria', countryCode: 'BG' },
  { city: 'Burgas', country: 'Bulgaria', countryCode: 'BG' },

  // Romania - 4 cities
  { city: 'Bucharest', country: 'Romania', countryCode: 'RO' },
  { city: 'Cluj-Napoca', country: 'Romania', countryCode: 'RO' },
  { city: 'Timisoara', country: 'Romania', countryCode: 'RO' },
  { city: 'Brasov', country: 'Romania', countryCode: 'RO' },
];

/**
 * City metadata for realistic fallback data generation
 */
const CITY_METADATA: Record<string, {
  type: 'capital' | 'coastal' | 'tourist' | 'industrial' | 'regional';
  tier: 1 | 2 | 3; // 1 = major, 2 = medium, 3 = smaller
  neighborhoods: string[];
}> = {
  // Kosovo
  'Prishtina': { type: 'capital', tier: 2, neighborhoods: ['Sunny Hill', 'Dragodan', 'Arberia'] },
  'Prizren': { type: 'tourist', tier: 3, neighborhoods: ['Old Town', 'Marash', 'Tusus'] },
  'Peja': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Vitomirica', 'Karagaq'] },

  // Albania
  'Tirana': { type: 'capital', tier: 1, neighborhoods: ['Blloku', 'Lake Park', 'New Bazaar'] },
  'Durres': { type: 'coastal', tier: 2, neighborhoods: ['Plazh', 'Currila', 'Port Area'] },
  'Vlore': { type: 'coastal', tier: 2, neighborhoods: ['Center', 'Radhima', 'Lungomare'] },
  'Sarande': { type: 'tourist', tier: 3, neighborhoods: ['Ksamil', 'Center', 'Lukove'] },

  // North Macedonia
  'Skopje': { type: 'capital', tier: 1, neighborhoods: ['Centar', 'Aerodrom', 'Karpos'] },
  'Ohrid': { type: 'tourist', tier: 2, neighborhoods: ['Old Town', 'Lagadin', 'Sveti Stefan'] },
  'Bitola': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Magnolia', 'Bukovo'] },

  // Serbia
  'Belgrade': { type: 'capital', tier: 1, neighborhoods: ['Savski Venac', 'Vracar', 'Novi Beograd'] },
  'Novi Sad': { type: 'regional', tier: 2, neighborhoods: ['Centar', 'Liman', 'Petrovaradin'] },
  'Nis': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Medijana', 'Palilula'] },
  'Kragujevac': { type: 'industrial', tier: 3, neighborhoods: ['Center', 'Aerodrom', 'Stanovo'] },

  // Bosnia and Herzegovina
  'Sarajevo': { type: 'capital', tier: 1, neighborhoods: ['Bascarsija', 'Marijin Dvor', 'Grbavica'] },
  'Banja Luka': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Borik', 'Mejdan'] },
  'Mostar': { type: 'tourist', tier: 2, neighborhoods: ['Old Town', 'Spanish Square', 'Rondo'] },

  // Croatia
  'Zagreb': { type: 'capital', tier: 1, neighborhoods: ['Centar', 'Novi Zagreb', 'Dubrava'] },
  'Split': { type: 'coastal', tier: 1, neighborhoods: ['Diocletian Palace', 'Bacvice', 'Meje'] },
  'Dubrovnik': { type: 'tourist', tier: 2, neighborhoods: ['Old Town', 'Lapad', 'Pile'] },
  'Rijeka': { type: 'coastal', tier: 2, neighborhoods: ['Center', 'Trsat', 'Pehlin'] },

  // Montenegro
  'Podgorica': { type: 'capital', tier: 2, neighborhoods: ['Center', 'Nova Varos', 'Stara Varos'] },
  'Budva': { type: 'coastal', tier: 2, neighborhoods: ['Old Town', 'Becici', 'Sveti Stefan'] },
  'Kotor': { type: 'tourist', tier: 2, neighborhoods: ['Old Town', 'Dobrota', 'Prcanj'] },

  // Greece
  'Athens': { type: 'capital', tier: 1, neighborhoods: ['Plaka', 'Kolonaki', 'Glyfada'] },
  'Thessaloniki': { type: 'regional', tier: 1, neighborhoods: ['Center', 'Kalamaria', 'Nea Krini'] },
  'Patras': { type: 'coastal', tier: 2, neighborhoods: ['Center', 'Rio', 'Psila Alonia'] },
  'Heraklion': { type: 'tourist', tier: 2, neighborhoods: ['Old Town', 'Nea Alikarnassos', 'Agia Marina'] },

  // Bulgaria
  'Sofia': { type: 'capital', tier: 1, neighborhoods: ['Center', 'Lozenets', 'Studentski Grad'] },
  'Plovdiv': { type: 'regional', tier: 2, neighborhoods: ['Old Town', 'Kapana', 'Trakia'] },
  'Varna': { type: 'coastal', tier: 2, neighborhoods: ['Center', 'Sea Garden', 'Asparuhovo'] },
  'Burgas': { type: 'coastal', tier: 2, neighborhoods: ['Center', 'Lazur', 'Sea Garden'] },

  // Romania
  'Bucharest': { type: 'capital', tier: 1, neighborhoods: ['Old Town', 'Dorobanti', 'Herastrau'] },
  'Cluj-Napoca': { type: 'regional', tier: 1, neighborhoods: ['Center', 'Marasti', 'Gheorgheni'] },
  'Timisoara': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Fabric', 'Iosefin'] },
  'Brasov': { type: 'tourist', tier: 2, neighborhoods: ['Historic Center', 'Schei', 'Tractorul'] },
};

/**
 * Generate realistic fallback data when Gemini API is unavailable
 */
function generateFallbackCityData(cityInfo: { city: string; country: string; countryCode: string }): CityDataFromGemini {
  const metadata = CITY_METADATA[cityInfo.city] || { type: 'regional', tier: 3, neighborhoods: ['Center', 'Downtown', 'Suburb'] };

  // Base prices by tier and type
  let basePrice = 1200; // Default mid-range
  if (metadata.tier === 1) basePrice = 2000;
  else if (metadata.tier === 2) basePrice = 1400;
  else basePrice = 1000;

  // Adjust by city type
  if (metadata.type === 'capital') basePrice *= 1.3;
  else if (metadata.type === 'coastal' || metadata.type === 'tourist') basePrice *= 1.2;
  else if (metadata.type === 'industrial') basePrice *= 0.9;

  // Add some variance
  const variance = 0.85 + Math.random() * 0.3; // 85% to 115%
  const avgPricePerSqm = Math.round(basePrice * variance);
  const medianPrice = avgPricePerSqm * 70; // 70sqm apartment

  // Growth rates based on type
  let growth = 6; // Default stable
  if (metadata.type === 'coastal' || metadata.type === 'tourist') growth = 10;
  else if (metadata.type === 'capital' && metadata.tier === 1) growth = 12;
  else if (metadata.type === 'industrial') growth = 3;
  const priceGrowthYoY = growth + Math.round((Math.random() - 0.5) * 4);

  // Days on market (lower for better markets)
  const averageDaysOnMarket = metadata.tier === 1 ? 35 : metadata.tier === 2 ? 45 : 55;

  // Demand score
  const demandScore = Math.min(100, Math.max(60,
    (metadata.tier === 1 ? 85 : metadata.tier === 2 ? 75 : 65) + Math.round((Math.random() - 0.5) * 10)
  ));

  // Rental yield (higher for tourist/coastal)
  let rentalYield = 5.0;
  if (metadata.type === 'coastal' || metadata.type === 'tourist') rentalYield = 6.5;
  else if (metadata.type === 'capital') rentalYield = 4.5;
  rentalYield += (Math.random() - 0.5) * 1;
  rentalYield = Math.round(rentalYield * 10) / 10;

  // Investment score
  const investmentScore = Math.min(100, Math.max(55,
    Math.round((demandScore + priceGrowthYoY * 3 + rentalYield * 8) / 2)
  ));

  // Market trend
  let marketTrend: 'rising' | 'stable' | 'declining' = 'stable';
  if (priceGrowthYoY > 8) marketTrend = 'rising';
  else if (priceGrowthYoY < 3) marketTrend = 'declining';

  // Highlights based on city characteristics
  const highlights: string[] = [];
  if (metadata.type === 'capital') {
    highlights.push('Strong economic hub with diverse job market');
    highlights.push('Consistent demand from domestic and international buyers');
    highlights.push('Well-developed infrastructure and amenities');
  } else if (metadata.type === 'coastal' || metadata.type === 'tourist') {
    highlights.push('High tourism season drives rental income');
    highlights.push('Popular with international property investors');
    highlights.push('Strong short-term rental market potential');
  } else if (metadata.type === 'industrial') {
    highlights.push('Affordable entry point for investors');
    highlights.push('Growing industrial sector supports demand');
    highlights.push('Lower cost of living attracts young families');
  } else {
    highlights.push('Balanced market with steady appreciation');
    highlights.push('Good value compared to larger cities');
    highlights.push('Local demand from regional development');
  }

  return {
    city: cityInfo.city,
    country: cityInfo.country,
    countryCode: cityInfo.countryCode,
    avgPricePerSqm,
    medianPrice,
    priceGrowthYoY,
    averageDaysOnMarket,
    demandScore,
    rentalYield,
    investmentScore,
    topNeighborhoods: metadata.neighborhoods,
    marketTrend,
    highlights,
  };
}

/**
 * Fetch market data from Gemini for a batch of cities
 * Uses a single API call to process multiple cities efficiently
 */
async function fetchCityDataFromGemini(cities: Array<{ city: string; country: string; countryCode: string }>): Promise<CityDataFromGemini[]> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
    console.warn('⚠️ Gemini API key not configured. Using fallback data generation.');
    return cities.map(generateFallbackCityData);
  }

  const citiesList = cities.map(c => `${c.city}, ${c.country}`).join('; ');

  const prompt = `You are a real estate market analyst. Provide current 2025 real estate market data for these Balkan cities: ${citiesList}

For each city, provide realistic market data based on general economic trends, tourism, and typical Balkan real estate patterns. Return ONLY valid JSON array format with this structure:

[
  {
    "city": "City Name",
    "country": "Country Name",
    "countryCode": "XX",
    "avgPricePerSqm": <number in EUR>,
    "medianPrice": <number in EUR for 70sqm apartment>,
    "priceGrowthYoY": <percentage, can be negative>,
    "averageDaysOnMarket": <number of days>,
    "demandScore": <0-100, higher = more demand>,
    "rentalYield": <percentage 3-8%>,
    "investmentScore": <0-100, investment potential>,
    "topNeighborhoods": ["Neighborhood1", "Neighborhood2", "Neighborhood3"],
    "marketTrend": "rising|stable|declining",
    "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"]
  }
]

Guidelines:
- Capital cities typically have higher prices (€1500-2500/sqm)
- Coastal/tourist cities have good rental yields (5-8%)
- Smaller cities have lower prices (€800-1500/sqm)
- Rising markets have 8-15% YoY growth
- Stable markets have 2-7% YoY growth
- Declining markets have -3% to 2% growth
- Return realistic neighborhood names for each city
- Highlights should mention key factors (tourism, economy, infrastructure, etc.)

Return only the JSON array, no other text.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Extract JSON from response (remove markdown code blocks if present)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in Gemini response');
    }

    const data: CityDataFromGemini[] = JSON.parse(jsonMatch[0]);
    console.log(`✅ Fetched market data for ${data.length} cities from Gemini`);

    return data;
  } catch (error) {
    console.error('❌ Error fetching city data from Gemini:', error);
    console.warn('⚠️ Falling back to generated placeholder data for these cities');
    return cities.map(generateFallbackCityData);
  }
}

/**
 * Calculate market data from actual properties in the database
 * Used as fallback or supplement to Gemini data
 */
async function calculateMarketDataFromProperties(city: string, country: string): Promise<Partial<ICityMarketData> | null> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const properties = await Property.find({
      city,
      country,
      status: { $in: ['active', 'sold'] },
    });

    if (properties.length < 3) {
      return null; // Not enough data for price calculations
    }

    const prices = properties.map(p => p.price / (p.sqft || 70)); // Price per sqft, default 70 if missing
    const avgPricePerSqm = (prices.reduce((a, b) => a + b, 0) / prices.length) * 10.764; // Convert sqft to sqm

    const activeDays = properties
      .filter(p => p.status === 'active' && p.createdAt)
      .map(p => Math.floor((Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

    const averageDaysOnMarket = activeDays.length > 0
      ? activeDays.reduce((a, b) => a + b, 0) / activeDays.length
      : 45;

    // Count only active listings (available properties)
    const listingsCount = properties.filter(p => p.status === 'active').length;

    const soldLastMonth = properties.filter(
      p => p.status === 'sold' && p.updatedAt && p.updatedAt > thirtyDaysAgo
    ).length;

    return {
      avgPricePerSqm: Math.round(avgPricePerSqm),
      listingsCount,
      averageDaysOnMarket: Math.round(averageDaysOnMarket),
      soldLastMonth,
      dataSource: 'calculated',
    };
  } catch (error) {
    console.error(`Error calculating market data for ${city}:`, error);
    return null;
  }
}

/**
 * Get live listing counts from the Property collection for a city
 * This is always current and doesn't depend on scheduled updates
 */
async function getLiveListingCounts(city: string, country: string): Promise<{ listingsCount: number; soldLastMonth: number }> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Count active listings
    const listingsCount = await Property.countDocuments({
      city: { $regex: new RegExp(`^${city}$`, 'i') },
      country: { $regex: new RegExp(`^${country}$`, 'i') },
      status: 'active',
    });

    // Count properties sold in the last 30 days
    const soldLastMonth = await Property.countDocuments({
      city: { $regex: new RegExp(`^${city}$`, 'i') },
      country: { $regex: new RegExp(`^${country}$`, 'i') },
      status: 'sold',
      updatedAt: { $gte: thirtyDaysAgo },
    });

    return { listingsCount, soldLastMonth };
  } catch (error) {
    console.error(`Error getting live listing counts for ${city}:`, error);
    return { listingsCount: 0, soldLastMonth: 0 };
  }
}

/**
 * Update market data for all featured cities
 * This should be called twice per month (biweekly)
 */
export async function updateAllCityMarketData(): Promise<void> {
  console.log('🔄 Starting biweekly market data update for all featured cities...');

  // Process cities in batches of 10 to avoid token limits
  const BATCH_SIZE = 10;
  let updatedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < FEATURED_CITIES.length; i += BATCH_SIZE) {
    const batch = FEATURED_CITIES.slice(i, i + BATCH_SIZE);

    console.log(`📊 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(FEATURED_CITIES.length / BATCH_SIZE)}...`);

    try {
      const geminiData = await fetchCityDataFromGemini(batch);

      for (let j = 0; j < batch.length; j++) {
        const cityInfo = batch[j];
        const cityIndex = i + j; // Actual index in FEATURED_CITIES array

        try {
          const geminiCityData = geminiData.find(
            d => d.city === cityInfo.city && d.country === cityInfo.country
          );

          // Calculate actual market data from properties
          const calculatedData = await calculateMarketDataFromProperties(cityInfo.city, cityInfo.country);

          if (!geminiCityData && !calculatedData) {
            console.warn(`⚠️ No data available for ${cityInfo.city}, ${cityInfo.country}`);
            failedCount++;
            continue;
          }

          // Merge Gemini and calculated data
          const marketData: Partial<ICityMarketData> = {
            city: cityInfo.city,
            country: cityInfo.country,
            countryCode: cityInfo.countryCode,
            ...(geminiCityData || {}),
            ...(calculatedData || {}),
            lastUpdated: new Date(),
            featured: true,
            displayOrder: cityIndex,
          };

          // If we have Gemini data but also calculated data, blend them
          if (geminiCityData && calculatedData) {
            marketData.avgPricePerSqm = Math.round((geminiCityData.avgPricePerSqm + calculatedData.avgPricePerSqm!) / 2);
            marketData.dataSource = 'gemini';
          }

          await CityMarketData.findOneAndUpdate(
            { city: cityInfo.city, country: cityInfo.country },
            marketData,
            { upsert: true, new: true }
          );

          updatedCount++;
          console.log(`✅ Updated market data for ${cityInfo.city}, ${cityInfo.country}`);
        } catch (error) {
          console.error(`❌ Failed to update ${cityInfo.city}:`, error);
          failedCount++;
        }
      }

      // Add delay between batches to respect rate limits
      if (i + BATCH_SIZE < FEATURED_CITIES.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    } catch (error) {
      console.error(`❌ Batch processing failed:`, error);
      failedCount += batch.length;
    }
  }

  console.log(`✅ Market data update complete: ${updatedCount} updated, ${failedCount} failed`);
}

/**
 * Get featured city recommendations with live listing counts
 */
export async function getFeaturedCities(limit: number = 12): Promise<CityMarketDataLean[]> {
  try {
    const cities = await CityMarketData.find({ featured: true })
      .sort({ displayOrder: 1 })
      .limit(limit)
      .lean<CityMarketDataLean[]>();

    // Enrich each city with live listing counts from the Property collection
    const enrichedCities = await Promise.all(
      cities.map(async (city) => {
        const liveCounts = await getLiveListingCounts(city.city, city.country);
        return {
          ...city,
          listingsCount: liveCounts.listingsCount,
          soldLastMonth: liveCounts.soldLastMonth,
        };
      })
    );

    return enrichedCities;
  } catch (error) {
    console.error('Error fetching featured cities:', error);
    return [];
  }
}

/**
 * Get city recommendations by country with live listing counts
 */
export async function getCitiesByCountry(country: string): Promise<CityMarketDataLean[]> {
  try {
    const cities = await CityMarketData.find({ country })
      .sort({ demandScore: -1, avgPricePerSqm: 1 })
      .lean<CityMarketDataLean[]>();

    // Enrich each city with live listing counts from the Property collection
    const enrichedCities = await Promise.all(
      cities.map(async (city) => {
        const liveCounts = await getLiveListingCounts(city.city, city.country);
        return {
          ...city,
          listingsCount: liveCounts.listingsCount,
          soldLastMonth: liveCounts.soldLastMonth,
        };
      })
    );

    return enrichedCities;
  } catch (error) {
    console.error(`Error fetching cities for ${country}:`, error);
    return [];
  }
}

/**
 * Get market data for a specific city with live listing counts
 */
export async function getCityMarketData(city: string, country: string): Promise<CityMarketDataLean | null> {
  try {
    const data = await CityMarketData.findOne({ city, country }).lean<CityMarketDataLean>();

    if (!data) {
      return null;
    }

    // Enrich with live listing counts
    const liveCounts = await getLiveListingCounts(city, country);
    return {
      ...data,
      listingsCount: liveCounts.listingsCount,
      soldLastMonth: liveCounts.soldLastMonth,
    };
  } catch (error) {
    console.error(`Error fetching market data for ${city}:`, error);
    return null;
  }
}
