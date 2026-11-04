import { apiRequest } from '@/src/shared/api';
import type { LatLng, TravelMode, TravelRoute } from '../utils/travel';

/** A road / foot / bike route from the visitor to the business (proxied by our backend). */
export const getTravelRoute = async (from: LatLng, to: LatLng, mode: TravelMode): Promise<TravelRoute> => {
  const params = new URLSearchParams({ from: `${from.lat},${from.lng}`, to: `${to.lat},${to.lng}`, mode });
  const { route } = await apiRequest<{ route: TravelRoute }>(`/routing/route?${params.toString()}`);
  return route;
};

export const ASK_ACTIONS = ['call', 'whatsapp', 'viber', 'email', 'website', 'directions', 'none'] as const;
export type AskAction = (typeof ASK_ACTIONS)[number];

export interface AskTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AskReply {
  answer: string;
  action: AskAction;
}

/** Ask the business's profile a question; answered by the assistant from the profile only. */
export const askBusiness = (listingId: string, question: string, history: AskTurn[]): Promise<AskReply> =>
  apiRequest<AskReply>(`/business-listings/${encodeURIComponent(listingId)}/ask`, {
    method: 'POST',
    body: { question, history },
  });

interface GeocodeRow {
  lat: string;
  lon: string;
}

/** Look an address up through our geocoding proxy (OpenStreetMap Nominatim); null when nothing matches. */
export const geocodePlace = async (query: string, countryCode: string | null): Promise<LatLng | null> => {
  const params = new URLSearchParams({ query });
  if (countryCode) params.set('countryCode', countryCode);
  const rows = await apiRequest<GeocodeRow[]>(`/geocoding/search?${params.toString()}`);
  const first = Array.isArray(rows) ? rows[0] : undefined;
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  return first && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};
