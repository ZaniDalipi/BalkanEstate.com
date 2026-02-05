import { GoogleGenAI } from '@google/genai';
import { propertyLogger } from '../utils/logger';
import PropertyValuation, {
  IPropertyValuation,
  IComparableProperty,
  IValuationBreakdown,
} from '../models/PropertyValuation';
import Property from '../models/Property';
import CityMarketData from '../models/CityMarketData';
import mongoose from 'mongoose';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY || '' });

// Retry configuration for handling transient errors
const MAX_RETRIES = 5;
const INITIAL_DELAY = 2000;

interface ValuationInput {
  address: string;
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  propertyType: 'house' | 'apartment' | 'villa' | 'land' | 'other';
  sqft: number;
  beds: number;
  baths: number;
  yearBuilt?: number;
  condition?: 'new' | 'excellent' | 'good' | 'fair' | 'needs-renovation';
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasPool?: boolean;
  floorNumber?: number;
  totalFloors?: number;
  viewType?: 'sea' | 'mountain' | 'city' | 'park' | 'garden' | 'street';
  energyRating?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  furnishing?: 'furnished' | 'semi-furnished' | 'unfurnished';
  userId?: string;
  language?: string;
}

interface AIValuationResponse {
  estimatedValue: number;
  valueLow: number;
  valueHigh: number;
  confidenceScore: number;
  breakdown: IValuationBreakdown;
  marketTrend: 'rising' | 'stable' | 'declining';
  aiInsights: string;
}

/**
 * Retry wrapper for Gemini API calls with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable =
      error?.status === 503 ||
      error?.status === 429 ||
      error?.code === 'ECONNRESET' ||
      error?.code === 'ETIMEDOUT' ||
      error?.message?.includes('503') ||
      error?.message?.includes('Service Unavailable') ||
      error?.message?.includes('timeout');

    if (!isRetryable || retries <= 0) {
      throw error;
    }

    propertyLogger.warn(`Gemini API call failed, retrying in ${delay}ms... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
    await new Promise(resolve => setTimeout(resolve, delay));

    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

/**
 * Get comparable properties from the database
 */
async function getComparableProperties(
  city: string,
  country: string,
  propertyType: string,
  sqft: number,
  beds: number
): Promise<IComparableProperty[]> {
  const sqftRange = sqft * 0.3; // 30% range
  const bedsRange = 1;

  const comparables = await Property.find({
    city: { $regex: new RegExp(`^${city}$`, 'i') },
    country: { $regex: new RegExp(`^${country}$`, 'i') },
    propertyType,
    status: { $in: ['active', 'sold'] },
    sqft: { $gte: sqft - sqftRange, $lte: sqft + sqftRange },
    beds: { $gte: Math.max(0, beds - bedsRange), $lte: beds + bedsRange },
  })
    .sort({ soldAt: -1, updatedAt: -1 })
    .limit(5)
    .lean();

  return comparables.map(prop => ({
    address: prop.address,
    city: prop.city,
    price: prop.price,
    sqft: prop.sqft,
    pricePerSqm: Math.round(prop.price / prop.sqft),
    beds: prop.beds,
    baths: prop.baths,
    propertyType: prop.propertyType,
    soldDate: prop.soldAt,
  }));
}

/**
 * Get market data for the city
 */
async function getMarketData(city: string, country: string) {
  const marketData = await CityMarketData.findOne({
    city: { $regex: new RegExp(`^${city}$`, 'i') },
    country: { $regex: new RegExp(`^${country}$`, 'i') },
  }).lean();

  return marketData;
}

/**
 * Calculate base valuation from comparables and market data
 */
function calculateBaseValuation(
  sqft: number,
  comparables: IComparableProperty[],
  marketData: any
): { baseValue: number; avgPricePerSqm: number } {
  let avgPricePerSqm: number;

  if (comparables.length > 0) {
    // Calculate weighted average from comparables
    const totalPricePerSqm = comparables.reduce((sum, comp) => sum + comp.pricePerSqm, 0);
    avgPricePerSqm = totalPricePerSqm / comparables.length;
  } else if (marketData?.avgPricePerSqm) {
    // Fall back to market data
    avgPricePerSqm = marketData.avgPricePerSqm;
  } else {
    // Default fallback for Balkan region (average)
    avgPricePerSqm = 1500; // EUR per sqm
  }

  return {
    baseValue: Math.round(sqft * avgPricePerSqm),
    avgPricePerSqm: Math.round(avgPricePerSqm),
  };
}

/**
 * Calculate adjustment factors for various property characteristics
 */
function calculateAdjustments(input: ValuationInput, baseValue: number): IValuationBreakdown {
  const adjustments: IValuationBreakdown = {
    baseValue,
    locationAdjustment: 0,
    conditionAdjustment: 0,
    amenitiesAdjustment: 0,
    marketTrendAdjustment: 0,
    sizeAdjustment: 0,
    ageAdjustment: 0,
  };

  // Condition adjustment (-20% to +10%)
  const conditionMultipliers: Record<string, number> = {
    'new': 0.10,
    'excellent': 0.05,
    'good': 0,
    'fair': -0.10,
    'needs-renovation': -0.20,
  };
  if (input.condition) {
    adjustments.conditionAdjustment = Math.round(baseValue * (conditionMultipliers[input.condition] || 0));
  }

  // View type adjustment (-5% to +15%)
  const viewMultipliers: Record<string, number> = {
    'sea': 0.15,
    'mountain': 0.10,
    'park': 0.08,
    'city': 0.05,
    'garden': 0.03,
    'street': -0.05,
  };
  if (input.viewType) {
    adjustments.locationAdjustment = Math.round(baseValue * (viewMultipliers[input.viewType] || 0));
  }

  // Amenities adjustment
  let amenitiesMultiplier = 0;
  if (input.hasBalcony) amenitiesMultiplier += 0.02;
  if (input.hasGarden) amenitiesMultiplier += 0.05;
  if (input.hasElevator) amenitiesMultiplier += 0.03;
  if (input.hasParking) amenitiesMultiplier += 0.04;
  if (input.hasPool) amenitiesMultiplier += 0.08;
  if (input.furnishing === 'furnished') amenitiesMultiplier += 0.05;
  if (input.furnishing === 'semi-furnished') amenitiesMultiplier += 0.02;
  adjustments.amenitiesAdjustment = Math.round(baseValue * amenitiesMultiplier);

  // Energy rating adjustment (-5% to +5%)
  const energyMultipliers: Record<string, number> = {
    'A+': 0.05,
    'A': 0.04,
    'B': 0.02,
    'C': 0,
    'D': -0.02,
    'E': -0.03,
    'F': -0.04,
    'G': -0.05,
  };
  if (input.energyRating) {
    adjustments.amenitiesAdjustment += Math.round(baseValue * (energyMultipliers[input.energyRating] || 0));
  }

  // Age adjustment (newer = better, up to -15% for very old)
  if (input.yearBuilt) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - input.yearBuilt;
    if (age <= 2) {
      adjustments.ageAdjustment = Math.round(baseValue * 0.05);
    } else if (age <= 10) {
      adjustments.ageAdjustment = 0;
    } else if (age <= 30) {
      adjustments.ageAdjustment = Math.round(baseValue * -0.05);
    } else if (age <= 50) {
      adjustments.ageAdjustment = Math.round(baseValue * -0.10);
    } else {
      adjustments.ageAdjustment = Math.round(baseValue * -0.15);
    }
  }

  // Floor number adjustment for apartments
  if (input.propertyType === 'apartment' && input.floorNumber !== undefined && input.totalFloors) {
    if (input.floorNumber === 0) {
      // Ground floor - slight discount
      adjustments.locationAdjustment += Math.round(baseValue * -0.03);
    } else if (input.floorNumber === input.totalFloors) {
      // Top floor - premium (unless no elevator)
      adjustments.locationAdjustment += Math.round(baseValue * (input.hasElevator ? 0.05 : -0.02));
    } else if (input.floorNumber >= input.totalFloors - 2) {
      // Higher floors - slight premium
      adjustments.locationAdjustment += Math.round(baseValue * 0.02);
    }
  }

  return adjustments;
}

/**
 * Generate AI-powered property valuation insights
 */
async function generateAIValuationInsights(
  input: ValuationInput,
  baseValue: number,
  adjustments: IValuationBreakdown,
  comparables: IComparableProperty[],
  marketData: any
): Promise<AIValuationResponse> {
  const totalValue = baseValue +
    adjustments.locationAdjustment +
    adjustments.conditionAdjustment +
    adjustments.amenitiesAdjustment +
    adjustments.marketTrendAdjustment +
    adjustments.sizeAdjustment +
    adjustments.ageAdjustment;

  const language = input.language || 'English';

  const prompt = `
You are a professional real estate valuation expert for the Balkan region (Balkans).
Analyze this property and provide valuation insights.

**Property Details:**
- Location: ${input.address}, ${input.city}, ${input.country}
- Type: ${input.propertyType}
- Size: ${input.sqft} m²
- Bedrooms: ${input.beds}, Bathrooms: ${input.baths}
- Year Built: ${input.yearBuilt || 'Unknown'}
- Condition: ${input.condition || 'Not specified'}
- View: ${input.viewType || 'Not specified'}
- Features: ${[
    input.hasBalcony && 'Balcony',
    input.hasGarden && 'Garden',
    input.hasElevator && 'Elevator',
    input.hasParking && 'Parking',
    input.hasPool && 'Pool',
    input.furnishing && input.furnishing,
  ].filter(Boolean).join(', ') || 'None specified'}
- Energy Rating: ${input.energyRating || 'Not specified'}

**Market Context:**
- Average price/m² in ${input.city}: €${marketData?.avgPricePerSqm || 'N/A'}
- Market trend: ${marketData?.marketTrend || 'stable'}
- Demand score: ${marketData?.demandScore || 'N/A'}/100
- Average days on market: ${marketData?.averageDaysOnMarket || 'N/A'}

**Comparable Properties Found:** ${comparables.length}
${comparables.map(c => `- ${c.address}: €${c.price.toLocaleString()} (${c.sqft}m², €${c.pricePerSqm}/m²)`).join('\n')}

**Our Calculated Base Value:** €${baseValue.toLocaleString()}
**With Adjustments:** €${totalValue.toLocaleString()}

Based on this analysis, respond with a JSON object containing:
1. Your refined estimated value (can adjust our calculation up to ±15%)
2. A value range (low and high)
3. Confidence score (0-100) based on data quality
4. Market trend assessment
5. A brief insight paragraph (2-3 sentences) explaining the valuation in ${language}

Respond ONLY with valid JSON in this exact format:
{
  "estimatedValue": <number>,
  "valueLow": <number>,
  "valueHigh": <number>,
  "confidenceScore": <number>,
  "marketTrend": "rising" | "stable" | "declining",
  "aiInsights": "<string with insights in ${language}>"
}
`;

  try {
    const result = await retryWithBackoff(() =>
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      })
    );

    if (!result.text) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const aiResponse = JSON.parse(jsonMatch[0]) as AIValuationResponse;

    // Validate and bound the AI's adjustments
    const maxAdjustment = totalValue * 0.15;
    aiResponse.estimatedValue = Math.max(
      totalValue - maxAdjustment,
      Math.min(totalValue + maxAdjustment, aiResponse.estimatedValue)
    );

    return {
      ...aiResponse,
      breakdown: adjustments,
    };
  } catch (error) {
    propertyLogger.error('AI valuation error, using calculated values:', error);

    // Fallback to calculated values
    const variance = totalValue * 0.1;
    return {
      estimatedValue: totalValue,
      valueLow: Math.round(totalValue - variance),
      valueHigh: Math.round(totalValue + variance),
      confidenceScore: comparables.length > 2 ? 75 : comparables.length > 0 ? 60 : 45,
      breakdown: adjustments,
      marketTrend: marketData?.marketTrend || 'stable',
      aiInsights: generateFallbackInsights(input, totalValue, marketData, language),
    };
  }
}

/**
 * Generate fallback insights when AI is unavailable
 */
function generateFallbackInsights(
  input: ValuationInput,
  totalValue: number,
  marketData: any,
  language: string
): string {
  const pricePerSqm = Math.round(totalValue / input.sqft);

  // English fallback
  let insights = `Based on similar properties in ${input.city}, this ${input.propertyType} is valued at approximately €${totalValue.toLocaleString()}. `;
  insights += `At €${pricePerSqm}/m², this is ${marketData?.avgPricePerSqm && pricePerSqm > marketData.avgPricePerSqm ? 'above' : 'near'} the area average. `;

  if (marketData?.marketTrend === 'rising') {
    insights += 'The local market is trending upward, which may support price appreciation.';
  } else if (marketData?.marketTrend === 'declining') {
    insights += 'The local market is cooling, so pricing competitively is recommended.';
  } else {
    insights += 'The market is stable, making this a good time to list.';
  }

  return insights;
}

/**
 * Create a property valuation
 */
export async function createPropertyValuation(input: ValuationInput): Promise<IPropertyValuation> {
  // Get market data and comparables
  const [marketData, comparables] = await Promise.all([
    getMarketData(input.city, input.country),
    getComparableProperties(input.city, input.country, input.propertyType, input.sqft, input.beds),
  ]);

  // Calculate base valuation
  const { baseValue } = calculateBaseValuation(input.sqft, comparables, marketData);

  // Calculate adjustments
  const adjustments = calculateAdjustments(input, baseValue);

  // Generate AI insights
  const aiValuation = await generateAIValuationInsights(
    input,
    baseValue,
    adjustments,
    comparables,
    marketData
  );

  // Create valuation record
  const valuation = new PropertyValuation({
    userId: input.userId ? new mongoose.Types.ObjectId(input.userId) : undefined,
    address: input.address,
    city: input.city,
    country: input.country,
    lat: input.lat,
    lng: input.lng,
    propertyType: input.propertyType,
    sqft: input.sqft,
    beds: input.beds,
    baths: input.baths,
    yearBuilt: input.yearBuilt,
    condition: input.condition,
    hasBalcony: input.hasBalcony,
    hasGarden: input.hasGarden,
    hasElevator: input.hasElevator,
    hasParking: input.hasParking,
    hasPool: input.hasPool,
    floorNumber: input.floorNumber,
    totalFloors: input.totalFloors,
    viewType: input.viewType,
    energyRating: input.energyRating,
    furnishing: input.furnishing,
    estimatedValue: aiValuation.estimatedValue,
    valueLow: aiValuation.valueLow,
    valueHigh: aiValuation.valueHigh,
    pricePerSqm: Math.round(aiValuation.estimatedValue / input.sqft),
    confidenceScore: aiValuation.confidenceScore,
    breakdown: aiValuation.breakdown,
    comparables,
    marketTrend: aiValuation.marketTrend,
    avgDaysOnMarket: marketData?.averageDaysOnMarket || 0,
    demandScore: marketData?.demandScore || 50,
    aiInsights: aiValuation.aiInsights,
    dataSource: 'ai',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  await valuation.save();

  return valuation;
}

/**
 * Get valuation history for a user
 */
export async function getUserValuations(userId: string, limit = 10) {
  return PropertyValuation.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Get a specific valuation by ID
 */
export async function getValuationById(valuationId: string) {
  return PropertyValuation.findById(valuationId).lean();
}

/**
 * Get valuation statistics for a city
 */
export async function getCityValuationStats(city: string, country: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const stats = await PropertyValuation.aggregate([
    {
      $match: {
        city: { $regex: new RegExp(`^${city}$`, 'i') },
        country: { $regex: new RegExp(`^${country}$`, 'i') },
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: '$propertyType',
        count: { $sum: 1 },
        avgValue: { $avg: '$estimatedValue' },
        avgPricePerSqm: { $avg: '$pricePerSqm' },
        avgConfidence: { $avg: '$confidenceScore' },
      },
    },
  ]);

  return stats;
}
