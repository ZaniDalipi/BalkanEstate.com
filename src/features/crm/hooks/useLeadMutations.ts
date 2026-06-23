import { useMutation, useQueryClient } from '@tanstack/react-query';
import { crmKeys } from '../api/crmKeys';
import {
  createLead,
  updateLead,
  deleteLead,
  moveLeadStage,
  addActivity,
  archiveLead,
  createLeadFromInquiry,
} from '../api/crmApi';
import type { CreateLeadInput, UpdateLeadInput, MoveStageInput, AddActivityInput } from '../types';

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeadInput) => createLead(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leads() });
    },
  });
}

export function useUpdateLead(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLeadInput) => updateLead(leadId, input),
    onSuccess: (updatedLead) => {
      qc.setQueryData(crmKeys.lead(leadId), updatedLead);
      qc.invalidateQueries({ queryKey: crmKeys.leads() });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => deleteLead(leadId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leads() });
    },
  });
}

export function useMoveLeadStage(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveStageInput) => moveLeadStage(leadId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.lead(leadId) });
      qc.invalidateQueries({ queryKey: crmKeys.leads() });
      qc.invalidateQueries({ queryKey: crmKeys.pipeline() });
    },
  });
}

export function useAddActivity(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddActivityInput) => addActivity(leadId, input),
    onSuccess: (data) => {
      qc.setQueryData<ReturnType<typeof Object.create>>(crmKeys.lead(leadId), (old: any) =>
        old ? { ...old, activities: data.activities } : old
      );
    },
  });
}

export function useArchiveLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, isArchived }: { leadId: string; isArchived: boolean }) =>
      archiveLead(leadId, isArchived),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leads() });
    },
  });
}

export function useCreateLeadFromInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inquiryId: string) => createLeadFromInquiry(inquiryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leads() });
      qc.invalidateQueries({ queryKey: crmKeys.pipeline() });
    },
  });
}
