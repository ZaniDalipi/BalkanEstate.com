// Suburb data types for the interactive choropleth map feature

export interface SuburbStats {
  avgPricePerSqm: number;
  priceVsCityAvg: number; // % difference vs city avg (positive = above, negative = below)
  priceGrowthYoY: number;
  medianPrice: number;
  rentalYield: number;
  demandScore: number; // 0-100
  listingsCount: number;
  daysOnMarket: number;
  propertyMix: { apartments: number; houses: number; commercial: number };
  highlights: string[];
}

export interface SuburbEntry {
  name: string;
  nameLocal?: string;
  center: { lat: number; lng: number };
  polygon: { type: 'Polygon'; coordinates: number[][][] };
  stats: SuburbStats;
  rank: number; // 1 = most expensive / premium
}

export interface SuburbData {
  _id?: string;
  city: string;
  country: string;
  countryCode: string;
  suburbs: SuburbEntry[];
  cityAvgPricePerSqm: number;
  lastUpdated: string;
  dataSource: 'gemini' | 'fallback' | 'research';
  officialSourceName?: string;
  officialSourceUrl?: string;
}
