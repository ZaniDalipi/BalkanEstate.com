import { apiRequest } from '@/src/shared/api';
import type { PropertyPriceHistoryResponse } from '@/src/shared/types';

export async function getPropertyPriceHistory(propertyId: string): Promise<PropertyPriceHistoryResponse> {
  if (!propertyId || typeof propertyId !== 'string' || propertyId.trim() === '') {
    throw new Error('Property ID is required');
  }
  const data = await apiRequest<PropertyPriceHistoryResponse>(`/properties/${propertyId}/price-history`);
  return validatePriceHistoryResponse(data);
}

/** Validate shape of API response at the ingestion boundary */
function validatePriceHistoryResponse(data: unknown): PropertyPriceHistoryResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid price history response');
  }
  const d = data as Record<string, unknown>;
  if (typeof d.currentPrice !== 'number') {
    throw new Error('Invalid price history response: missing currentPrice');
  }
  if (!Array.isArray(d.history)) {
    throw new Error('Invalid price history response: history must be an array');
  }
  if (!Array.isArray(d.priceIntervals)) {
    throw new Error('Invalid price history response: priceIntervals must be an array');
  }
  return d as unknown as PropertyPriceHistoryResponse;
}
