import { apiRequest } from '@/src/shared/api';
import { transformBackendProperty } from '@/src/features/properties/api/propertyApi';
import type { Property } from '@/src/shared/types';
import { thisWeekRange } from '../utils/thisWeekRange';

/** Homes with an open house from now until the end of this Sunday, soonest first. */
export async function fetchOpenHousesThisWeek(limit: number, country: string | undefined, now: Date): Promise<Property[]> {
  const { from, to } = thisWeekRange(now);
  const params = new URLSearchParams({
    openHouseFrom: from.toISOString(),
    openHouseTo: to.toISOString(),
    sortBy: 'events-soonest',
    limit: String(limit),
  });
  if (country && country !== 'any') params.set('country', country);
  const res = await apiRequest<{ properties: unknown[] }>(`/properties?${params.toString()}`);
  return res.properties.map(transformBackendProperty);
}
