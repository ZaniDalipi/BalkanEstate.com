import { apiRequest } from '@/src/shared/api';

export type NeighbourStatus = 'active' | 'sold' | 'rented';

export interface AreaNeighbour {
  id: string;
  title?: string;
  address?: string;
  city?: string;
  price: number;
  sqft?: number;
  pricePerSqm: number | null;
  beds?: number;
  propertyType: string;
  status: NeighbourStatus;
  lat: number;
  lng: number;
  distanceM: number;
  imageUrl?: string;
  listedAt?: string;
  /** When it sold (or was rented). */
  closedAt?: string;
}

export interface AreaTrendPoint {
  /** e.g. "2026-Q3" */
  period: string;
  askingPricePerSqm: number | null;
  askingCount: number;
  closedPricePerSqm: number | null;
  closedCount: number;
}

export interface AreaPricesResponse {
  center: { lat: number; lng: number };
  radiusKm: number;
  listingType: 'sale' | 'rent';
  propertyType: string;
  /** False when the area had too few homes of this type and all types are compared. */
  sameTypeOnly: boolean;
  subject: { id: string; price: number; sqft?: number; pricePerSqm: number | null };
  stats: {
    activeCount: number;
    closedCount: number;
    medianAskingPricePerSqm: number | null;
    medianClosedPricePerSqm: number | null;
    medianAskingPrice: number | null;
    /** Median €/m² of every neighbour — what the subject is compared with. */
    medianPricePerSqm: number | null;
    subjectVsMedianPct: number | null;
  };
  trend: AreaTrendPoint[];
  neighbours: AreaNeighbour[];
}

export async function getAreaPrices(propertyId: string): Promise<AreaPricesResponse> {
  if (!propertyId || propertyId.trim() === '') {
    throw new Error('Property ID is required');
  }
  const data = await apiRequest<AreaPricesResponse>(`/properties/${propertyId}/area-prices`);
  return validateAreaPricesResponse(data);
}

/** Validate shape of API response at the ingestion boundary */
function validateAreaPricesResponse(data: unknown): AreaPricesResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid area prices response');
  }
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.neighbours) || !Array.isArray(d.trend)) {
    throw new Error('Invalid area prices response: neighbours and trend must be arrays');
  }
  if (!d.stats || typeof d.stats !== 'object' || !d.subject || typeof d.subject !== 'object') {
    throw new Error('Invalid area prices response: missing stats or subject');
  }
  return d as unknown as AreaPricesResponse;
}
