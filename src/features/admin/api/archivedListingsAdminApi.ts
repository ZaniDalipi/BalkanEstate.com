/** Admin archive of removed, sold and rented listings. */
import { apiRequest } from '@/src/shared/api';

export type ArchiveReason = 'deleted' | 'sold' | 'rented';
export type ArchiveDeletedBy = 'owner' | 'admin' | 'agency';

export interface ArchivedListing {
  _id: string;
  originalPropertyId: string;
  title?: string;
  archiveReason: ArchiveReason;
  archivedAt: string;
  deletedBy?: { kind: ArchiveDeletedBy; userId?: string; name?: string; email?: string };
  previousStatus?: string;
  sellerName: string;
  sellerEmail: string;
  createdByAgencyName?: string;
  listingType: 'sale' | 'rent';
  price: number;
  salePrice?: number;
  address: string;
  city: string;
  country: string;
  propertyType: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  description?: string;
  thumbnailUrl?: string;
  mediaPurgedAt?: string;
  totalViews: number;
  totalSaves: number;
  daysOnMarket: number;
  originalCreatedAt: string;
}

export interface ArchivedListingPage {
  listings: ArchivedListing[];
  total: number;
  page: number;
  pages: number;
  counts: Record<ArchiveReason, number>;
}

export interface ArchiveListParams {
  reason?: ArchiveReason;
  deletedBy?: ArchiveDeletedBy;
  search?: string;
  page: number;
}

export function listArchivedListings(params: ArchiveListParams): Promise<ArchivedListingPage> {
  const q = new URLSearchParams({ page: String(params.page), limit: '20' });
  if (params.reason) q.set('reason', params.reason);
  if (params.deletedBy) q.set('deletedBy', params.deletedBy);
  if (params.search?.trim()) q.set('search', params.search.trim());
  return apiRequest<ArchivedListingPage>(`/admin/archived-listings?${q.toString()}`, { requiresAuth: true });
}
