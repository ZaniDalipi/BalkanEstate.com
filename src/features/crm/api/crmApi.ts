import { apiRequest } from '@/src/shared/api';
import type {
  Lead,
  LeadFilters,
  LeadListResponse,
  PipelineSummary,
  CreateLeadInput,
  UpdateLeadInput,
  MoveStageInput,
  AddActivityInput,
  LeadActivity,
} from '../types';

const BASE = '/crm';

export const getLeads = (filters?: LeadFilters): Promise<LeadListResponse> => {
  const params = new URLSearchParams();
  if (filters?.stage) params.set('stage', filters.stage);
  if (filters?.source) params.set('source', filters.source);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.isArchived !== undefined) params.set('isArchived', String(filters.isArchived));
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.sortDir) params.set('sortDir', filters.sortDir);

  const qs = params.toString();
  return apiRequest<LeadListResponse>(`${BASE}/leads${qs ? `?${qs}` : ''}`, {
    requiresAuth: true,
  });
};

export const getPipelineSummary = (): Promise<PipelineSummary> =>
  apiRequest<PipelineSummary>(`${BASE}/leads/pipeline`, { requiresAuth: true });

export const getLead = (leadId: string): Promise<Lead> =>
  apiRequest<Lead>(`${BASE}/leads/${leadId}`, { requiresAuth: true });

export const createLead = (input: CreateLeadInput): Promise<Lead> =>
  apiRequest<Lead>(`${BASE}/leads`, {
    method: 'POST',
    body: input,
    requiresAuth: true,
  });

export const updateLead = (leadId: string, input: UpdateLeadInput): Promise<Lead> =>
  apiRequest<Lead>(`${BASE}/leads/${leadId}`, {
    method: 'PUT',
    body: input,
    requiresAuth: true,
  });

export const deleteLead = (leadId: string): Promise<{ message: string }> =>
  apiRequest<{ message: string }>(`${BASE}/leads/${leadId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });

export const moveLeadStage = (leadId: string, input: MoveStageInput): Promise<{ stage: string; updatedAt: string }> =>
  apiRequest(`${BASE}/leads/${leadId}/stage`, {
    method: 'PATCH',
    body: input,
    requiresAuth: true,
  });

export const addActivity = (leadId: string, input: AddActivityInput): Promise<{ activity: LeadActivity; activities: LeadActivity[] }> =>
  apiRequest(`${BASE}/leads/${leadId}/activities`, {
    method: 'POST',
    body: input,
    requiresAuth: true,
  });

export const archiveLead = (leadId: string, isArchived: boolean): Promise<{ isArchived: boolean }> =>
  apiRequest(`${BASE}/leads/${leadId}/archive`, {
    method: 'PATCH',
    body: { isArchived },
    requiresAuth: true,
  });

export const createLeadFromInquiry = (inquiryId: string): Promise<Lead> =>
  apiRequest<Lead>(`${BASE}/leads/from-inquiry/${inquiryId}`, {
    method: 'POST',
    requiresAuth: true,
  });
