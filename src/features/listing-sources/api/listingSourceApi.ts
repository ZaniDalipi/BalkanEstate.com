import { apiRequest } from '@/src/shared/api';

export type ListingAdapterType = 'rss' | 'jsonFeed' | 'xmlFeed' | 'jsonLd' | 'customApi';

export interface ListingSource {
  id: string;
  userId?: string;
  name: string;
  slug: string;
  baseUrl: string;
  enabled: boolean;
  adapterType: ListingAdapterType;
  adapterConfig: Record<string, unknown>;
  fieldMap: Record<string, string>;
  schedule?: string;
  rateLimitRpm?: number;
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastErrorMessage?: string;
  listingsImported: number;
  listingsUpdated: number;
  listingsFailed: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListingSourceInput {
  name: string;
  slug?: string;
  baseUrl: string;
  enabled?: boolean;
  adapterType: ListingAdapterType;
  adapterConfig?: Record<string, unknown>;
  fieldMap?: Record<string, string>;
  schedule?: string;
  rateLimitRpm?: number;
}

export interface IngestStats {
  sourceSlug: string;
  fetched: number;
  imported: number;
  updated: number;
  failed: number;
  errors: string[];
  durationMs: number;
}

export interface RecentImportedListing {
  _id: string;
  title?: string;
  city?: string;
  country?: string;
  price?: number;
  sourceListingId?: string;
  sourceUrl?: string;
  sourceFetchedAt?: string;
}

export interface ListingSourceStats {
  source: Pick<
    ListingSource,
    | '_id'
    | 'slug'
    | 'enabled'
    | 'adapterType'
    | 'lastRunAt'
    | 'lastSuccessAt'
    | 'lastErrorMessage'
    | 'listingsImported'
    | 'listingsUpdated'
    | 'listingsFailed'
  >;
  recent: RecentImportedListing[];
}

const BASE = '/listing-sources';

export const listMyListingSources = async (): Promise<ListingSource[]> => {
  const res = await apiRequest<{ sources: ListingSource[] }>(BASE, { requiresAuth: true });
  return res.sources;
};

export const getMyListingSource = async (id: string): Promise<ListingSource> => {
  const res = await apiRequest<{ source: ListingSource }>(`${BASE}/${id}`, { requiresAuth: true });
  return res.source;
};

export const createMyListingSource = async (
  input: ListingSourceInput
): Promise<ListingSource> => {
  const res = await apiRequest<{ source: ListingSource }>(BASE, {
    method: 'POST',
    body: input,
    requiresAuth: true,
  });
  return res.source;
};

export const updateMyListingSource = async (
  id: string,
  patch: Partial<ListingSourceInput>
): Promise<ListingSource> => {
  const res = await apiRequest<{ source: ListingSource }>(`${BASE}/${id}`, {
    method: 'PUT',
    body: patch,
    requiresAuth: true,
  });
  return res.source;
};

export const deleteMyListingSource = async (id: string): Promise<void> => {
  await apiRequest<{ ok: true }>(`${BASE}/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const runMyListingSource = async (
  id: string,
  options?: { fullRefresh?: boolean; limit?: number }
): Promise<IngestStats> => {
  const params = new URLSearchParams();
  if (options?.fullRefresh) params.append('fullRefresh', 'true');
  if (options?.limit) params.append('limit', String(options.limit));
  const qs = params.toString();
  const res = await apiRequest<{ stats: IngestStats }>(
    `${BASE}/${id}/run${qs ? `?${qs}` : ''}`,
    { method: 'POST', requiresAuth: true }
  );
  return res.stats;
};

export const getMyListingSourceStats = async (id: string): Promise<ListingSourceStats> => {
  return apiRequest<ListingSourceStats>(`${BASE}/${id}/stats`, { requiresAuth: true });
};

export interface DetectResult {
  adapterType: ListingAdapterType;
  adapterConfig: Record<string, unknown>;
  fieldMap: Record<string, string>;
  sample?: Record<string, unknown>;
  hint: string;
}

export type DetectMethod = 'url' | 'rss' | 'sampleJson' | 'customApi';

export const detectFeed = async (
  method: DetectMethod,
  payload: { url?: string; sampleJson?: string; authHeaders?: Record<string, string> }
): Promise<DetectResult> => {
  return apiRequest<DetectResult>(`${BASE}/detect`, {
    method: 'POST',
    body: { method, ...payload },
    requiresAuth: true,
  });
};
