import { apiRequest } from '@/src/shared/api';
import { transformBackendProperty } from '@/src/features/properties/api/propertyApi';
import type { Property } from '@/src/shared/types';

/** Homes with an upcoming open house or auction, soonest first. */
export async function fetchUpcomingEventListings(limit: number, country?: string): Promise<Property[]> {
  const params = new URLSearchParams({ sortBy: 'events-soonest', limit: String(limit) });
  if (country && country !== 'any') params.set('country', country);
  const res = await apiRequest<{ properties: unknown[] }>(`/properties?${params.toString()}`);
  return res.properties.map(transformBackendProperty);
}
