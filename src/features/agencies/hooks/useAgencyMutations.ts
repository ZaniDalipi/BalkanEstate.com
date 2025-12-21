import { useMutation, useQueryClient } from '@tanstack/react-query';
import { agencyKeys } from '../api/agencyKeys';
import * as api from '../../../services/apiService';

export function useCreateAgency() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (agencyData: any) => await api.createAgency(agencyData),
    onSuccess: (newAgency) => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.lists() });
      queryClient.setQueryData(agencyKeys.detail(newAgency.id), newAgency);
    },
  });

  return {
    createAgency: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useUpdateAgency() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ agencyId, agencyData }: { agencyId: string; agencyData: any }) =>
      await api.updateAgency(agencyId, agencyData),
    onSuccess: (updatedAgency, { agencyId }) => {
      queryClient.setQueryData(agencyKeys.detail(agencyId), updatedAgency);
      queryClient.invalidateQueries({ queryKey: agencyKeys.lists() });
    },
  });

  return {
    updateAgency: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useAddAgentToAgency() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ agencyId, agentUserId }: { agencyId: string; agentUserId: string }) =>
      await api.addAgentToAgency(agencyId, agentUserId),
    onSuccess: (_, { agencyId }) => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.detail(agencyId) });
    },
  });

  return {
    addAgent: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useRemoveAgentFromAgency() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ agencyId, agentId }: { agencyId: string; agentId: string }) =>
      await api.removeAgentFromAgency(agencyId, agentId),
    onSuccess: (_, { agencyId }) => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.detail(agencyId) });
    },
  });

  return {
    removeAgent: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useJoinAgency() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ invitationCode, agencyId }: { invitationCode: string; agencyId?: string }) =>
      await api.joinAgencyByInvitationCode(invitationCode, agencyId),
    onSuccess: (_, { agencyId }) => {
      if (agencyId) {
        queryClient.invalidateQueries({ queryKey: agencyKeys.detail(agencyId) });
      }
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
    },
  });

  return {
    joinAgency: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useLeaveAgency() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => await api.leaveAgency(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
    },
  });

  return {
    leaveAgency: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useCreateJoinRequest() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ agencyId, message }: { agencyId: string; message?: string }) =>
      await api.createJoinRequest(agencyId, message),
    onSuccess: (_, { agencyId }) => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.joinRequests(agencyId) });
    },
  });

  return {
    createJoinRequest: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useAgencyJoinRequests(agencyId: string | null) {
  const {
    data: requests = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: agencyKeys.joinRequests(agencyId || ''),
    queryFn: async () => {
      if (!agencyId) throw new Error('Agency ID required');
      return await api.getAgencyJoinRequests(agencyId);
    },
    enabled: !!agencyId,
    staleTime: 1 * 60 * 1000, // 1 minute - requests should be fresh
  });

  return { requests, isLoading, error };
}
