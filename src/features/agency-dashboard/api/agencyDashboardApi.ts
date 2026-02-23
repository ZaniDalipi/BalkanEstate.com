// Agency Dashboard API module
// Handles all agency dashboard API calls

import { apiRequest } from '@/src/shared/api';
import type {
  OverviewData,
  DashboardAgent,
  DashboardProperty,
  DashboardInquiry,
  AnalyticsData,
  FinancialData,
  TeamFeedItem,
  TeamNote,
  PropertyFilters,
  InquiryFilters,
  BulkActionRequest,
  PaginatedResponse,
} from '../types';

const BASE = '/agency-dashboard';

// --- Overview ---

export const getAgencyOverview = async (agencyId: string): Promise<OverviewData> => {
  return apiRequest(`${BASE}/${agencyId}/overview`, { requiresAuth: true });
};

// --- Agents ---

export const getDashboardAgents = async (agencyId: string): Promise<DashboardAgent[]> => {
  return apiRequest(`${BASE}/${agencyId}/agents`, { requiresAuth: true });
};

export const getDashboardAgentDetail = async (agencyId: string, agentId: string): Promise<DashboardAgent> => {
  return apiRequest(`${BASE}/${agencyId}/agents/${agentId}`, { requiresAuth: true });
};

// --- Properties ---

export const getDashboardProperties = async (
  agencyId: string,
  filters?: PropertyFilters
): Promise<PaginatedResponse<DashboardProperty>> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.agentId) params.append('agentId', filters.agentId);
  if (filters?.propertyType) params.append('propertyType', filters.propertyType);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const query = params.toString();
  return apiRequest(`${BASE}/${agencyId}/properties${query ? `?${query}` : ''}`, { requiresAuth: true });
};

export const bulkPropertyAction = async (
  agencyId: string,
  request: BulkActionRequest
): Promise<{ success: boolean; affected: number }> => {
  return apiRequest(`${BASE}/${agencyId}/properties/bulk`, {
    method: 'POST',
    body: request,
    requiresAuth: true,
  });
};

// --- Inquiries ---

export const getDashboardInquiries = async (
  agencyId: string,
  filters?: InquiryFilters
): Promise<PaginatedResponse<DashboardInquiry>> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.agentId) params.append('agentId', filters.agentId);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const query = params.toString();
  return apiRequest(`${BASE}/${agencyId}/inquiries${query ? `?${query}` : ''}`, { requiresAuth: true });
};

export const assignInquiry = async (
  agencyId: string,
  inquiryId: string,
  agentId: string
): Promise<DashboardInquiry> => {
  return apiRequest(`${BASE}/${agencyId}/inquiries/${inquiryId}/assign`, {
    method: 'PUT',
    body: { agentId },
    requiresAuth: true,
  });
};

// --- Analytics ---

export const getDashboardAnalytics = async (agencyId: string, range?: string): Promise<AnalyticsData> => {
  const params = range ? `?range=${range}` : '';
  return apiRequest(`${BASE}/${agencyId}/analytics${params}`, { requiresAuth: true });
};

export const exportAnalyticsCsv = async (agencyId: string, range: string): Promise<Blob> => {
  const params = range ? `?range=${range}&format=csv` : '?format=csv';
  const data = await apiRequest<string>(`${BASE}/${agencyId}/analytics/export${params}`, {
    requiresAuth: true,
  });
  return new Blob([data], { type: 'text/csv' });
};

// --- Financial ---

export const getDashboardFinancial = async (agencyId: string): Promise<FinancialData> => {
  return apiRequest(`${BASE}/${agencyId}/financial`, { requiresAuth: true });
};

// --- Team Feed ---

export const getTeamFeed = async (agencyId: string): Promise<TeamFeedItem[]> => {
  return apiRequest(`${BASE}/${agencyId}/team-feed`, { requiresAuth: true });
};

// --- Team Notes ---

export const getTeamNotes = async (agencyId: string): Promise<TeamNote[]> => {
  return apiRequest(`${BASE}/${agencyId}/team-notes`, { requiresAuth: true });
};

export const createTeamNote = async (
  agencyId: string,
  note: { content: string; propertyId?: string; type: TeamNote['type'] }
): Promise<TeamNote> => {
  return apiRequest(`${BASE}/${agencyId}/team-notes`, {
    method: 'POST',
    body: note,
    requiresAuth: true,
  });
};

export const deleteTeamNote = async (agencyId: string, noteId: string): Promise<{ success: boolean }> => {
  return apiRequest(`${BASE}/${agencyId}/team-notes/${noteId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};
