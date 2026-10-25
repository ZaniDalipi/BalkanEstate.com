/** Admin residence endpoints (list, building limit, pass grant, agency free residences). */
import { apiRequest } from '@/src/shared/api';

export type AdminResidenceFilter = 'all' | 'public' | 'offline' | 'draft' | 'trial' | 'pass' | 'agency';
export type AdminResidenceState = 'none' | 'trial' | 'active' | 'included' | 'agency' | 'expired';

export interface AdminResidence {
  id: string;
  name: string;
  slug: string;
  city: string;
  status: 'draft' | 'published' | 'archived';
  state: AdminResidenceState;
  publicNow: boolean;
  visibleUntil: string | null;
  owner: { name: string; email: string } | null;
  agency: { id: string; name: string } | null;
  buildings: { used: number; limit: number; adminLimit: number | null };
}

export interface AdminResidenceList {
  items: AdminResidence[];
  total: number;
  page: number;
  pageSize: number;
  includedBuildings: number;
}

export interface AgencyResidenceAllowance {
  agencyId: string;
  agencyName?: string;
  subscribed: boolean;
  yearStart: string | null;
  yearEnd: string | null;
  perYear: number;
  extra: number;
  used: number;
  allowed: number;
  left: number;
  coveredUntil: string | null;
}

export const listAdminResidences = (params: { search?: string; filter?: AdminResidenceFilter; page?: number }) => {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.filter && params.filter !== 'all') q.set('filter', params.filter);
  if (params.page && params.page > 1) q.set('page', String(params.page));
  const qs = q.toString();
  return apiRequest<AdminResidenceList>(`/admin/residences${qs ? `?${qs}` : ''}`, { requiresAuth: true });
};

export const setResidenceBuildingLimit = (id: string, limit: number | null) =>
  apiRequest<{ limit: number | null; used: number }>(`/admin/residences/${id}/building-limit`, {
    method: 'PATCH',
    body: { limit },
    requiresAuth: true,
  });

export const grantResidencePass = (id: string, body: { months: number; note?: string }) =>
  apiRequest<{ purchases: number }>(`/admin/residences/${id}/grant`, { method: 'POST', body, requiresAuth: true });

export const getAgencyResidenceAllowance = (agencyId: string) =>
  apiRequest<{ allowance: AgencyResidenceAllowance }>(`/admin/agencies/${agencyId}/residence-allowance`, { requiresAuth: true });

export const addAgencyResidences = (agencyId: string, body: { extra: number; note?: string }) =>
  apiRequest<{ allowance: AgencyResidenceAllowance }>(`/admin/agencies/${agencyId}/residence-allowance`, {
    method: 'POST',
    body,
    requiresAuth: true,
  });
