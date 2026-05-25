// Agencies API module
// Handles all agency-related API calls

import { apiRequest } from '@/src/shared/api';
import type { Agency, AgencyFilters, Agent } from '@/src/shared/types';

// --- Agency API ---

export const getTopAgencies = async (limit = 10): Promise<any> => {
  return apiRequest(`/agencies/leaderboard?limit=${limit}`);
};

export const getAgencies = async (filters?: AgencyFilters): Promise<any> => {
  const params = new URLSearchParams();
  if (filters?.city) params.append('city', filters.city);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  return apiRequest(`/agencies?${params.toString()}`);
};

export const getAgency = async (agencyId: string): Promise<any> => {
  const response = await apiRequest<{ agency: any; properties?: any[] }>(`/agencies/${agencyId}`, { requiresAuth: true, encryptResponse: true });
  // Backend wraps agency data in { agency: {...}, properties: [...] }
  // Unwrap so consumers get the agency object directly
  return response.agency ?? response;
};

export const getFeaturedAgencies = async (limit?: number): Promise<any> => {
  const params = limit ? `?limit=${limit}` : '';
  return apiRequest(`/agencies/featured/rotation${params}`);
};

export const createAgency = async (agencyData: Partial<Agency>): Promise<any> => {
  return apiRequest('/agencies', {
    method: 'POST',
    body: agencyData,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const updateAgency = async (agencyId: string, agencyData: Partial<Agency>): Promise<any> => {
  return apiRequest(`/agencies/${agencyId}`, {
    method: 'PUT',
    body: agencyData,
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- Agent Management ---

export const getAgencyAgents = async (agencyId: string): Promise<{ agents: Agent[] }> => {
  const response = await apiRequest<{ agency: any }>(`/agencies/${agencyId}`, {
    requiresAuth: false,
  });

  const agents = (response.agency?.agents || []).map((agent: any) => ({
    id: agent._id || agent.id,
    userId: agent._id || agent.id,
    name: agent.name || '',
    email: agent.email || '',
    phone: agent.phone || '',
    avatarUrl: agent.avatarUrl,
    role: agent.role || 'agent',
    agencyName: response.agency?.name,
    rating: agent.stats?.rating || 0,
    totalReviews: 0,
    propertiesSold: agent.stats?.propertiesSold || 0,
    activeListings: agent.stats?.activeListings || 0,
    totalSalesValue: agent.stats?.totalSalesValue || 0,
  }));

  return { agents };
};

export const addAgentToAgency = async (agencyId: string, agentUserId: string): Promise<any> => {
  return apiRequest(`/agencies/${agencyId}/agents`, {
    method: 'POST',
    body: { agentUserId },
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const removeAgentFromAgency = async (agencyId: string, agentId: string): Promise<any> => {
  return apiRequest(`/agencies/${agencyId}/agents/${agentId}`, {
    method: 'DELETE',
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- Join Requests ---

export const joinAgencyByInvitationCode = async (
  invitationCode: string,
  agencyId?: string
): Promise<any> => {
  return apiRequest('/agencies/join-by-code', {
    method: 'POST',
    body: { invitationCode, agencyId },
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const createJoinRequest = async (agencyId: string, message?: string): Promise<any> => {
  return apiRequest('/agency-join-requests', {
    method: 'POST',
    body: { agencyId, message },
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const getAgentJoinRequests = async (): Promise<any> => {
  return apiRequest('/agency-join-requests/my-requests', { requiresAuth: true, encryptResponse: true });
};

export const getAgencyJoinRequests = async (agencyId: string): Promise<any> => {
  return apiRequest(`/agency-join-requests/agency/${agencyId}`, { requiresAuth: true, encryptResponse: true });
};

export const approveJoinRequest = async (requestId: string): Promise<any> => {
  return apiRequest(`/agency-join-requests/${requestId}/approve`, {
    method: 'PUT',
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const rejectJoinRequest = async (requestId: string): Promise<any> => {
  return apiRequest(`/agency-join-requests/${requestId}/reject`, {
    method: 'PUT',
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const cancelJoinRequest = async (requestId: string): Promise<any> => {
  return apiRequest(`/agency-join-requests/${requestId}`, {
    method: 'DELETE',
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- Admin Management ---

export const addAgencyAdmin = async (agencyId: string, userId: string): Promise<any> => {
  return apiRequest(`/agencies/${agencyId}/admins`, {
    method: 'POST',
    body: { userId },
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const removeAgencyAdmin = async (agencyId: string, userId: string): Promise<any> => {
  return apiRequest(`/agencies/${agencyId}/admins/${userId}`, {
    method: 'DELETE',
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const verifyInvitationCode = async (
  agencyId: string,
  code: string
): Promise<{ valid: boolean; message?: string }> => {
  return apiRequest(`/agencies/${agencyId}/verify-code`, {
    method: 'POST',
    body: { code },
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const findAgencyByInvitationCode = async (
  code: string
): Promise<{ success: boolean; agency: any }> => {
  return apiRequest('/agencies/find-by-code', {
    method: 'POST',
    body: { code },
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- Featured Subscription ---

export const createFeaturedSubscription = async (
  agencyId: string,
  data: { interval?: 'weekly' | 'monthly' | 'yearly'; couponCode?: string; startTrial?: boolean }
): Promise<any> => {
  return apiRequest(`/agencies/${agencyId}/featured-subscription`, {
    method: 'POST',
    body: data,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const getFeaturedSubscription = async (agencyId: string): Promise<any> => {
  return apiRequest(`/agencies/${agencyId}/featured-subscription`, { requiresAuth: false });
};

export const cancelFeaturedSubscription = async (
  agencyId: string,
  immediately: boolean = false
): Promise<any> => {
  return apiRequest(`/agencies/${agencyId}/featured-subscription`, {
    method: 'DELETE',
    body: { immediately },
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const confirmFeaturedPayment = async (
  agencyId: string,
  data: { paymentSubscriptionId: string; externalCustomerId: string }
): Promise<any> => {
  return apiRequest(`/agencies/${agencyId}/featured-subscription/confirm-payment`, {
    method: 'POST',
    body: data,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const applyFeaturedCoupon = async (agencyId: string, couponCode: string): Promise<any> => {
  return apiRequest(`/agencies/${agencyId}/featured-subscription/apply-coupon`, {
    method: 'POST',
    body: { couponCode },
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- Agent Self-Service ---

export const leaveAgency = async (): Promise<{ message: string; user: { id: string; agencyId: null; agencyName: string } }> => {
  return apiRequest('/agents/leave-agency', {
    method: 'POST',
    requiresAuth: true,
    encryptResponse: true,
  });
};
