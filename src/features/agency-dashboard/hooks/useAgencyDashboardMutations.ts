import { useQueryClient, useMutation } from '@tanstack/react-query';
import { agencyDashboardKeys } from '../api/agencyDashboardKeys';
import {
  assignInquiry,
  bulkPropertyAction,
  createTeamNote,
} from '../api/agencyDashboardApi';
import type {
  AssignInquiryPayload,
  BulkPropertyActionPayload,
  CreateTeamNotePayload,
} from '../types';

export function useAssignInquiry(agencyId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: AssignInquiryPayload) =>
      assignInquiry(agencyId, payload.inquiryId, payload.agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agencyDashboardKeys.inquiries(agencyId),
      });
    },
  });

  return {
    assignInquiry: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useBulkPropertyAction(agencyId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: BulkPropertyActionPayload) =>
      bulkPropertyAction(agencyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agencyDashboardKeys.properties(agencyId),
      });
    },
  });

  return {
    bulkPropertyAction: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useCreateTeamNote(agencyId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: CreateTeamNotePayload) =>
      createTeamNote(agencyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agencyDashboardKeys.teamNotes(agencyId),
      });
    },
  });

  return {
    createTeamNote: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
