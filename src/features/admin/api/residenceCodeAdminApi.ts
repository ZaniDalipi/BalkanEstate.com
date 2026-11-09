/** Admin › Residences › Unlock codes: codes that unlock a Residence Pass or extra buildings. */
import { apiRequest } from '@/src/shared/api';

export type ResidenceCodeKind = 'pass' | 'extra_building';
export type ResidenceCodeStatus = 'active' | 'used' | 'expired' | 'disabled' | 'scheduled';
export type ResidenceCodeFilter = 'all' | 'active' | 'used' | 'expired' | 'disabled';

export interface ResidenceCode {
  id: string;
  code: string;
  kind: ResidenceCodeKind;
  status: ResidenceCodeStatus;
  usedCount: number;
  usageLimit: number;
  validFrom: string;
  validUntil: string;
  note: string | null;
  isSent: boolean;
  sentAt: string | null;
  createdAt: string;
  createdBy: string | null;
  uses: { residence: { name: string; slug: string } | null; at: string }[];
}

export interface ResidenceCodeList {
  items: ResidenceCode[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateResidenceCodes {
  kind: ResidenceCodeKind;
  count: number;
  usageLimit: number;
  days: number;
  note?: string;
}

export interface CreatedResidenceCodes {
  codes: string[];
  kind: ResidenceCodeKind;
  validUntil: string;
  usageLimit: number;
}

export const listResidenceCodes = (params: { status?: ResidenceCodeFilter; search?: string; page?: number }) => {
  const q = new URLSearchParams();
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.search) q.set('search', params.search);
  if (params.page && params.page > 1) q.set('page', String(params.page));
  const qs = q.toString();
  return apiRequest<ResidenceCodeList>(`/admin/residences/codes${qs ? `?${qs}` : ''}`, { requiresAuth: true });
};

export const createResidenceCodes = (body: CreateResidenceCodes) =>
  apiRequest<CreatedResidenceCodes>('/admin/residences/codes', { method: 'POST', body, requiresAuth: true });

export const updateResidenceCode = (id: string, body: { isActive?: boolean; isSent?: boolean }) =>
  apiRequest<{ id: string; isActive: boolean; isSent: boolean }>(`/admin/residences/codes/${encodeURIComponent(id)}`, { method: 'PATCH', body, requiresAuth: true });

export const deleteResidenceCode = (id: string) =>
  apiRequest<{ id: string }>(`/admin/residences/codes/${encodeURIComponent(id)}`, { method: 'DELETE', requiresAuth: true });
