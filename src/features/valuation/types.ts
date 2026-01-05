export interface ComparableProperty {
  address: string;
  city: string;
  price: number;
  sqft: number;
  pricePerSqm: number;
  beds: number;
  baths: number;
  propertyType: string;
  soldDate?: string;
  adjustedValue?: number;
  adjustmentReason?: string;
}

export interface ValuationBreakdown {
  baseValue: number;
  locationAdjustment: number;
  conditionAdjustment: number;
  amenitiesAdjustment: number;
  marketTrendAdjustment: number;
  sizeAdjustment: number;
  ageAdjustment: number;
}

export interface PropertyValuation {
  _id: string;
  userId?: string;
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
  estimatedValue: number;
  valueLow: number;
  valueHigh: number;
  pricePerSqm: number;
  confidenceScore: number;
  breakdown: ValuationBreakdown;
  comparables: ComparableProperty[];
  marketTrend: 'rising' | 'stable' | 'declining';
  avgDaysOnMarket: number;
  demandScore: number;
  aiInsights: string;
  dataSource: 'ai' | 'calculated' | 'manual';
  createdAt: string;
  expiresAt: string;
}

export interface ValuationInput {
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
  language?: string;
}

export type PropertyType = 'house' | 'apartment' | 'villa' | 'land' | 'other';
export type PropertyCondition = 'new' | 'excellent' | 'good' | 'fair' | 'needs-renovation';
export type ViewType = 'sea' | 'mountain' | 'city' | 'park' | 'garden' | 'street';
export type EnergyRating = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type Furnishing = 'furnished' | 'semi-furnished' | 'unfurnished';
export type MarketTrend = 'rising' | 'stable' | 'declining';
