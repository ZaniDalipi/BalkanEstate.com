// Location and map types

export interface CountryBounds {
  name: string;
  bounds: [[number, number], [number, number]];
  center: [number, number];
}

export const COUNTRY_BOUNDS: Record<string, CountryBounds> = {
  'albania': {
    name: 'Albania',
    bounds: [[39.6448, 19.2823], [42.6611, 21.0574]],
    center: [41.1533, 20.1683]
  },
  'bosnia': {
    name: 'Bosnia and Herzegovina',
    bounds: [[42.5553, 15.7287], [45.2764, 19.6237]],
    center: [43.9159, 17.6791]
  },
  'bulgaria': {
    name: 'Bulgaria',
    bounds: [[41.2353, 22.3571], [44.2167, 28.6122]],
    center: [42.7339, 25.4858]
  },
  'croatia': {
    name: 'Croatia',
    bounds: [[42.3869, 13.4932], [46.5549, 19.4277]],
    center: [45.1000, 15.2000]
  },
  'greece': {
    name: 'Greece',
    bounds: [[34.8021, 19.3736], [41.7488, 28.2336]],
    center: [39.0742, 21.8243]
  },
  'kosovo': {
    name: 'Kosovo',
    bounds: [[41.8564, 20.0142], [43.2682, 21.7895]],
    center: [42.6026, 20.9030]
  },
  'macedonia': {
    name: 'North Macedonia',
    bounds: [[40.8427, 20.4529], [42.3736, 23.0342]],
    center: [41.6086, 21.7453]
  },
  'montenegro': {
    name: 'Montenegro',
    bounds: [[41.8503, 18.4331], [43.5585, 20.3398]],
    center: [42.7087, 19.3744]
  },
  'romania': {
    name: 'Romania',
    bounds: [[43.6190, 20.2619], [48.2653, 29.7497]],
    center: [45.9432, 24.9668]
  },
  'serbia': {
    name: 'Serbia',
    bounds: [[42.2322, 18.8142], [46.1900, 23.0063]],
    center: [44.0165, 21.0059]
  },
  'turkey': {
    name: 'Turkey (European part)',
    bounds: [[40.8223, 26.0433], [42.1061, 29.4149]],
    center: [41.0082, 28.9784]
  }
};

export interface SettlementData {
  name: string;
  lat: number;
  lng: number;
}

export interface MunicipalityData {
  name: string;
  settlements: SettlementData[];
}

export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: [string, string, string, string];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
  name?: string;
  address?: {
    road?: string;
    street?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country: string;
    country_code: string;
    postcode?: string;
  };
}

export interface CityMarketData {
  _id: string;
  city: string;
  country: string;
  countryCode: string;
  avgPricePerSqm: number;
  medianPrice: number;
  priceGrowthYoY: number;
  priceGrowthMoM: number;
  averageDaysOnMarket: number;
  listingsCount: number;
  soldLastMonth: number;
  demandScore: number;
  rentalYield: number;
  investmentScore: number;
  topNeighborhoods: string[];
  marketTrend: 'rising' | 'stable' | 'declining';
  highlights: string[];
  lastUpdated: string;
  dataSource: 'gemini' | 'manual' | 'calculated';
  featured: boolean;
  displayOrder: number;
}
