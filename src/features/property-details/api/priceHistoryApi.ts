import { apiRequest } from '@/src/shared/api';
import type { PropertyPriceHistoryResponse } from '@/src/shared/types';

export async function getPropertyPriceHistory(propertyId: string): Promise<PropertyPriceHistoryResponse> {
  return apiRequest<PropertyPriceHistoryResponse>(`/properties/${propertyId}/price-history`);
}

export const priceHistoryKeys = {
  all: ['price-history'] as const,
  detail: (id: string) => [...priceHistoryKeys.all, id] as const,
};
