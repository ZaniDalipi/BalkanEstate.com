/**
 * Agents & Agencies React Query Hooks
 * Following architecture guidelines: Use TanStack Query for ALL server state
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllAgents,
  getAgent,
  getAgentDetails,
  updateAgentProfile,
  addAgentReview,
  toggleSavedAgent,
  getSavedAgents,
  checkSavedAgent,
  leaveAgency,
} from '../api/agentApi';
import {
  getAgencies,
  getAgency,
  getFeaturedAgencies,
  createAgency,
  updateAgency,
  getAgencyAgents,
  addAgentToAgency,
  removeAgentFromAgency,
  joinAgencyByInvitationCode,
  createJoinRequest,
  getAgentJoinRequests,
  getAgencyJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  cancelJoinRequest,
  verifyInvitationCode,
  findAgencyByInvitationCode,
} from '@/src/features/agencies/api/agencyApi';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters?: { city?: string; specialization?: string; search?: string }) =>
    [...agentKeys.lists(), { filters }] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
  saved: () => [...agentKeys.all, 'saved'] as const,
  savedCheck: (id: string) => [...agentKeys.saved(), 'check', id] as const,
};

export const agencyKeys = {
  all: ['agencies'] as const,
  lists: () => [...agencyKeys.all, 'list'] as const,
  list: (filters?: { city?: string; search?: string; featured?: boolean }) =>
    [...agencyKeys.lists(), { filters }] as const,
  featured: (limit?: number) => [...agencyKeys.all, 'featured', { limit }] as const,
  details: () => [...agencyKeys.all, 'detail'] as const,
  detail: (id: string) => [...agencyKeys.details(), id] as const,
  agents: (agencyId: string) => [...agencyKeys.all, 'agents', agencyId] as const,
  joinRequests: (agencyId?: string) => [...agencyKeys.all, 'joinRequests', { agencyId }] as const,
  myJoinRequests: () => [...agencyKeys.all, 'myJoinRequests'] as const,
};

// ============================================================================
// AGENT HOOKS
// ============================================================================

/**
 * Fetch all agents with optional filters
 */
export function useAgents(filters?: { city?: string; specialization?: string; search?: string }) {
  return useQuery({
    queryKey: agentKeys.list(filters),
    queryFn: () => getAllAgents(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single agent details
 */
export function useAgent(agentId: string | undefined) {
  return useQuery({
    queryKey: agentKeys.detail(agentId!),
    queryFn: () => getAgent(agentId!),
    enabled: !!agentId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch comprehensive agent details with properties and stats
 */
export function useAgentDetails(agentId: string | undefined) {
  return useQuery({
    queryKey: [...agentKeys.detail(agentId!), 'full'],
    queryFn: () => getAgentDetails(agentId!),
    enabled: !!agentId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Update agent profile
 */
export function useUpdateAgentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentData: Parameters<typeof updateAgentProfile>[0]) =>
      updateAgentProfile(agentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}

/**
 * Add review to agent
 */
export function useAddAgentReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, review }: { agentId: string; review: Parameters<typeof addAgentReview>[1] }) =>
      addAgentReview(agentId, review),
    onSuccess: (_, { agentId }) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(agentId) });
    },
  });
}

/**
 * Get saved agents
 */
export function useSavedAgents(enabled: boolean = true) {
  return useQuery({
    queryKey: agentKeys.saved(),
    queryFn: () => getSavedAgents(),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Check if agent is saved
 */
export function useCheckSavedAgent(agentId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: agentKeys.savedCheck(agentId!),
    queryFn: () => checkSavedAgent(agentId!),
    enabled: enabled && !!agentId,
    staleTime: 60 * 1000,
  });
}

/**
 * Toggle saved agent
 */
export function useToggleSavedAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) => toggleSavedAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.saved() });
    },
  });
}

// ============================================================================
// AGENCY HOOKS
// ============================================================================

/**
 * Fetch all agencies with optional filters
 */
export function useAgencies(filters?: { city?: string; search?: string; featured?: boolean; page?: number; limit?: number }) {
  return useQuery({
    queryKey: agencyKeys.list(filters),
    queryFn: () => getAgencies(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Fetch featured agencies
 */
export function useFeaturedAgencies(limit: number = 6) {
  return useQuery({
    queryKey: agencyKeys.featured(limit),
    queryFn: () => getFeaturedAgencies(limit),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Fetch single agency details
 */
export function useAgency(agencyId: string | undefined) {
  return useQuery({
    queryKey: agencyKeys.detail(agencyId!),
    queryFn: () => getAgency(agencyId!),
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch agency agents
 */
export function useAgencyAgents(agencyId: string | undefined) {
  return useQuery({
    queryKey: agencyKeys.agents(agencyId!),
    queryFn: () => getAgencyAgents(agencyId!),
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Create agency
 */
export function useCreateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agencyData: Parameters<typeof createAgency>[0]) =>
      createAgency(agencyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
    },
  });
}

/**
 * Update agency
 */
export function useUpdateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, data }: { agencyId: string; data: Parameters<typeof updateAgency>[1] }) =>
      updateAgency(agencyId, data),
    onSuccess: (_, { agencyId }) => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.detail(agencyId) });
      queryClient.invalidateQueries({ queryKey: agencyKeys.lists() });
    },
  });
}

/**
 * Add agent to agency
 */
export function useAddAgentToAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, agentUserId }: { agencyId: string; agentUserId: string }) =>
      addAgentToAgency(agencyId, agentUserId),
    onSuccess: (_, { agencyId }) => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.agents(agencyId) });
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}

/**
 * Remove agent from agency
 */
export function useRemoveAgentFromAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, agentId }: { agencyId: string; agentId: string }) =>
      removeAgentFromAgency(agencyId, agentId),
    onSuccess: (_, { agencyId }) => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.agents(agencyId) });
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}

/**
 * Leave agency (for current agent)
 */
export function useLeaveAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => leaveAgency(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}

// ============================================================================
// JOIN REQUEST HOOKS
// ============================================================================

/**
 * Get agent's own join requests
 */
export function useMyJoinRequests(enabled: boolean = true) {
  return useQuery({
    queryKey: agencyKeys.myJoinRequests(),
    queryFn: () => getAgentJoinRequests(),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Get agency join requests (for agency admins)
 */
export function useAgencyJoinRequests(agencyId: string | undefined) {
  return useQuery({
    queryKey: agencyKeys.joinRequests(agencyId),
    queryFn: () => getAgencyJoinRequests(agencyId!),
    enabled: !!agencyId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Create join request
 */
export function useCreateJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, message }: { agencyId: string; message?: string }) =>
      createJoinRequest(agencyId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.myJoinRequests() });
    },
  });
}

/**
 * Join agency by invitation code
 */
export function useJoinAgencyByCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invitationCode, agencyId }: { invitationCode: string; agencyId?: string }) =>
      joinAgencyByInvitationCode(invitationCode, agencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}

/**
 * Approve join request
 */
export function useApproveJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => approveJoinRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.joinRequests() });
      queryClient.invalidateQueries({ queryKey: agencyKeys.agents });
    },
  });
}

/**
 * Reject join request
 */
export function useRejectJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => rejectJoinRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.joinRequests() });
    },
  });
}

/**
 * Cancel join request (for agent)
 */
export function useCancelJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => cancelJoinRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.myJoinRequests() });
    },
  });
}

/**
 * Verify invitation code
 */
export function useVerifyInvitationCode() {
  return useMutation({
    mutationFn: ({ agencyId, code }: { agencyId: string; code: string }) =>
      verifyInvitationCode(agencyId, code),
  });
}

/**
 * Find agency by invitation code
 */
export function useFindAgencyByCode() {
  return useMutation({
    mutationFn: (code: string) => findAgencyByInvitationCode(code),
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Invalidate all agent/agency queries
 */
export function useInvalidateAgentQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
    },
    invalidateAgents: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
    invalidateAgencies: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
    },
  };
}
