import { apiRequest } from '@/src/shared/api';

/**
 * Review queue for listings fetched from the user's external feeds.
 * Nothing a feed fetches goes live until it is accepted here.
 */

export type DraftKind = 'new' | 'update';
export type DraftStatus = 'pending' | 'accepted' | 'rejected';

export interface DraftFields {
  title: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  price: number | null;
  sqft: number | null;
  beds: number | null;
  baths: number | null;
  livingRooms: number | null;
  parking: number | null;
  yearBuilt: number | null;
  floorNumber: number | null;
  totalFloors: number | null;
  listingType: 'sale' | 'rent' | null;
  propertyType: string | null;
  isNegotiable: boolean | null;
  images: string[];
  currency: string | null;
}

export type DraftIssue =
  | 'missingTitle'
  | 'missingPrice'
  | 'missingCity'
  | 'missingAddress'
  | 'missingArea'
  | 'missingImages'
  | 'missingLocation';

export interface ImportedDraft {
  id: string;
  sourceId: string;
  sourceName?: string;
  sourceUrl?: string;
  kind: DraftKind;
  status: DraftStatus;
  data: DraftFields;
  original: DraftFields;
  /** The live listing's values (updates only). */
  current?: DraftFields;
  changedFields: (keyof DraftFields)[];
  issues: DraftIssue[];
  blockingIssues: DraftIssue[];
  edited: boolean;
  fetchedAt: string;
  reviewedAt?: string;
  propertyId?: string;
}

export interface ImportedDraftDetail extends ImportedDraft {
  /** The listing exactly as it would be published (backend property shape). */
  listing: Record<string, unknown>;
}

export interface DraftPage {
  drafts: ImportedDraft[];
  total: number;
  page: number;
  limit: number;
}

export interface PendingCount {
  total: number;
  new: number;
  update: number;
}

export type DraftPatch = Partial<Omit<DraftFields, 'currency'>>;

export interface BulkReviewResult {
  succeeded: string[];
  failed: { id: string; code: string; message: string }[];
}

const BASE = '/listing-sources/review';

export const listImportDrafts = (params: {
  status: DraftStatus;
  sourceId?: string;
  page?: number;
  limit?: number;
}): Promise<DraftPage> => {
  const qs = new URLSearchParams({ status: params.status });
  if (params.sourceId) qs.set('sourceId', params.sourceId);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  return apiRequest<DraftPage>(`${BASE}?${qs.toString()}`, { requiresAuth: true });
};

export const getImportDraft = async (id: string): Promise<ImportedDraftDetail> => {
  const res = await apiRequest<{ draft: ImportedDraftDetail }>(`${BASE}/${id}`, { requiresAuth: true });
  return res.draft;
};

export const getPendingImportCount = (): Promise<PendingCount> =>
  apiRequest<PendingCount>(`${BASE}/count`, { requiresAuth: true });

export const updateImportDraft = async (id: string, data: DraftPatch): Promise<ImportedDraft> => {
  const res = await apiRequest<{ draft: ImportedDraft }>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: { data },
    requiresAuth: true,
  });
  return res.draft;
};

export const acceptImportDraft = (id: string): Promise<{ propertyId: string; kind: DraftKind }> =>
  apiRequest(`${BASE}/${id}/accept`, { method: 'POST', requiresAuth: true });

export const rejectImportDraft = (id: string): Promise<{ ok: true }> =>
  apiRequest(`${BASE}/${id}/reject`, { method: 'POST', requiresAuth: true });

export const restoreImportDraft = (id: string): Promise<{ ok: true }> =>
  apiRequest(`${BASE}/${id}/restore`, { method: 'POST', requiresAuth: true });

export const bulkReviewImportDrafts = (
  ids: string[],
  action: 'accept' | 'reject'
): Promise<BulkReviewResult> =>
  apiRequest<BulkReviewResult>(`${BASE}/bulk`, {
    method: 'POST',
    body: { ids, action },
    requiresAuth: true,
  });
