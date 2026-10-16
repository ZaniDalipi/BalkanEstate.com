import { useMutation, useQueryClient } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import {
  createDevelopment,
  updateDevelopment,
  publishDevelopment,
  deleteDevelopment,
  createBuilding,
  createFloor,
  createUnit,
  setUnitAvailability,
  attachListing,
  detachListing,
  uploadDevelopmentCover,
} from '../api/developmentsApi';
import type {
  CreateDevelopmentPayload,
  UpdateDevelopmentPayload,
  CreateBuildingPayload,
  CreateFloorPayload,
  CreateUnitPayload,
  UnitAvailability,
} from '../types';

/** Create a development (server gates this on an active subscription plan). */
export function useCreateDevelopment() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: CreateDevelopmentPayload) => createDevelopment(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: developmentKeys.mine() });
    },
  });
  return { create: mutation.mutateAsync, isLoading: mutation.isPending, error: mutation.error };
}

export function useUpdateDevelopment(id: string) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: UpdateDevelopmentPayload) => updateDevelopment(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: developmentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: developmentKeys.mine() });
    },
  });
  return { update: mutation.mutateAsync, isLoading: mutation.isPending, error: mutation.error };
}

export function usePublishDevelopment(id: string) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: 'draft' | 'published') => publishDevelopment(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: developmentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: developmentKeys.public() });
    },
  });
  return { setStatus: mutation.mutateAsync, isLoading: mutation.isPending, error: mutation.error };
}

/** Upload / replace the development cover image. */
export function useUploadDevelopmentCover(id: string) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (file: File) => uploadDevelopmentCover(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: developmentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: developmentKeys.mine() });
    },
  });
  return { uploadCover: mutation.mutateAsync, isUploading: mutation.isPending, error: mutation.error };
}

export function useDeleteDevelopment(id: string) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteDevelopment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: developmentKeys.mine() });
    },
  });
  return { remove: mutation.mutateAsync, isLoading: mutation.isPending, error: mutation.error };
}

/** Inventory mutations, grouped since they share the same invalidation target. */
export function useInventoryMutations(developmentId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: developmentKeys.detail(developmentId) });
  };

  const building = useMutation({
    mutationFn: (payload: CreateBuildingPayload) => createBuilding(developmentId, payload),
    onSuccess: invalidate,
  });
  const floor = useMutation({
    mutationFn: (payload: CreateFloorPayload) => createFloor(developmentId, payload),
    onSuccess: invalidate,
  });
  const unit = useMutation({
    mutationFn: (payload: CreateUnitPayload) => createUnit(developmentId, payload),
    onSuccess: invalidate,
  });
  const availability = useMutation({
    mutationFn: (vars: { unitId: string; availability: UnitAvailability }) =>
      setUnitAvailability(developmentId, vars.unitId, vars.availability),
    onSuccess: invalidate,
  });

  return {
    createBuilding: building.mutateAsync,
    createFloor: floor.mutateAsync,
    createUnit: unit.mutateAsync,
    setAvailability: availability.mutateAsync,
    isCreatingBuilding: building.isPending,
    isCreatingFloor: floor.isPending,
    isCreatingUnit: unit.isPending,
    error: building.error || floor.error || unit.error || availability.error,
  };
}

/** Attach / detach an existing listing to/from a unit. */
export function useListingAttachment(developmentId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: developmentKeys.detail(developmentId) });
  };

  const attach = useMutation({
    mutationFn: (vars: { unitId: string; listingId: string; force?: boolean }) =>
      attachListing(developmentId, vars.unitId, vars.listingId, vars.force ?? false),
    onSuccess: invalidate,
  });
  const detach = useMutation({
    mutationFn: (vars: { unitId: string; listingId: string }) =>
      detachListing(developmentId, vars.unitId, vars.listingId),
    onSuccess: invalidate,
  });

  return {
    attach: attach.mutateAsync,
    detach: detach.mutateAsync,
    isAttaching: attach.isPending,
    isDetaching: detach.isPending,
    attachError: attach.error,
    detachError: detach.error,
  };
}
