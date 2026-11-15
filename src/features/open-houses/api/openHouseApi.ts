import { apiRequest } from '@/src/shared/api';
import type { HostOpenHouse, OpenHouse, OpenHouseDraft, RsvpInput } from '../types';

// `requiresAuth` only adds the token when there is one: signed-in visitors
// see their own sign-ups, guests are served the same public list.

export const fetchPropertyOpenHouses = async (propertyId: string): Promise<OpenHouse[]> =>
  (await apiRequest<{ openHouses: OpenHouse[] }>(`/open-houses/property/${encodeURIComponent(propertyId)}`, { requiresAuth: true })).openHouses;

export const fetchMyOpenHouses = async (propertyId?: string): Promise<HostOpenHouse[]> => {
  const qs = propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : '';
  return (await apiRequest<{ openHouses: HostOpenHouse[] }>(`/open-houses/mine${qs}`, { requiresAuth: true })).openHouses;
};

export const createOpenHouse = async (propertyId: string, draft: OpenHouseDraft): Promise<OpenHouse> =>
  (await apiRequest<{ openHouse: OpenHouse }>('/open-houses', { method: 'POST', body: { propertyId, ...draft }, requiresAuth: true })).openHouse;

export const cancelOpenHouse = async (id: string): Promise<void> => {
  await apiRequest(`/open-houses/${encodeURIComponent(id)}`, { method: 'DELETE', requiresAuth: true });
};

export const rsvpOpenHouse = async (id: string, input: RsvpInput): Promise<OpenHouse> =>
  (await apiRequest<{ openHouse: OpenHouse }>(`/open-houses/${encodeURIComponent(id)}/rsvp`, { method: 'POST', body: input, requiresAuth: true })).openHouse;

export const cancelRsvp = async (id: string, rsvpId?: string): Promise<OpenHouse> =>
  (await apiRequest<{ openHouse: OpenHouse }>(`/open-houses/${encodeURIComponent(id)}/rsvp`, { method: 'DELETE', body: { rsvpId }, requiresAuth: true })).openHouse;
