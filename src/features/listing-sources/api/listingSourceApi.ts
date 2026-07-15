import { apiRequest } from '@/src/shared/api';

export type ListingAdapterType = 'rss' | 'jsonFeed' | 'xmlFeed' | 'jsonLd' | 'customApi' | 'htmlScrape';

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
  deferred?: number;
  errors: string[];
  durationMs: number;
  /** Count of all properties from this source currently missing address, city, or price. */
  incompleteCount?: number;
  monthlyUsage?: {
    monthlyAllowance: number;
    created: number;
    remaining: number;
  };
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
    | 'id'
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

export interface BulkDeleteResult {
  ok: true;
  deleted: number;
  deletedSlugs: string[];
}

export const bulkDeleteMyListingSources = async (ids: string[]): Promise<BulkDeleteResult> => {
  return apiRequest<BulkDeleteResult>(`${BASE}/bulk-delete`, {
    method: 'POST',
    body: { ids },
    requiresAuth: true,
  });
};

export interface ClearImportsResult {
  ok: true;
  deleted: number;
  source: ListingSource;
}

export const clearMyListingSourceImports = async (id: string): Promise<ClearImportsResult> => {
  return apiRequest<ClearImportsResult>(`${BASE}/${id}/clear-imports`, {
    method: 'POST',
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

export interface PreviewListing {
  rawId: string;
  title?: string;
  price?: number;
  city?: string;
  country?: string;
  propertyType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  imageUrl?: string;
  sourceUrl?: string;
  isNew: boolean;
}

export interface PreviewResult {
  previewId: string;
  items: PreviewListing[];
  fetched: number;
}

export const previewMyListingSource = async (
  id: string,
  options?: { limit?: number }
): Promise<PreviewResult> => {
  const params = options?.limit ? `?limit=${options.limit}` : '';
  return apiRequest<PreviewResult>(`${BASE}/${id}/preview${params}`, {
    method: 'POST',
    requiresAuth: true,
  });
};

export const confirmMyListingSourceImport = async (
  id: string,
  previewId: string,
  approvedIds: string[]
): Promise<{ stats: IngestStats }> => {
  return apiRequest<{ stats: IngestStats }>(`${BASE}/${id}/confirm-import`, {
    method: 'POST',
    body: { previewId, approvedIds },
    requiresAuth: true,
  });
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
  payload: {
    url?: string;
    /** Raw text a human pasted — goes through smart-quote/trailing-comma cleanup server-side. */
    sampleJson?: string;
    /** Already-parsed rows/object (e.g. from a CSV/Excel upload) — sent as real JSON, never re-parsed from text. */
    sampleData?: unknown;
    authHeaders?: Record<string, string>;
  }
): Promise<DetectResult> => {
  return apiRequest<DetectResult>(`${BASE}/detect`, {
    method: 'POST',
    body: { method, ...payload },
    requiresAuth: true,
  });
};

export interface TermsStatus {
  accepted: boolean;
  version: string;
  acceptedAt: string | null;
}

export const getTermsStatus = async (): Promise<TermsStatus> => {
  return apiRequest<TermsStatus>(`${BASE}/terms-status`, { requiresAuth: true });
};

export const acceptTerms = async (): Promise<{ accepted: boolean; version: string }> => {
  return apiRequest<{ accepted: boolean; version: string }>(`${BASE}/accept-terms`, {
    method: 'POST',
    requiresAuth: true,
  });
};
