import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import {
  bulkUpdateUnits,
  deleteUnit,
  downloadUnitsCsv,
  updateUnit,
  uploadUnitFloorplan,
} from '../api/developmentsApi';
import type { BulkUnitUpdatePayload, UpdateUnitPayload } from '../types';

/** Save a blob as a file through a temporary object URL. */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Dashboard unit administration: edit, delete, bulk update, floorplan upload
 * and CSV export. Every write refreshes the inventory queries, the development
 * detail (its stats) and the public cache (buyers see availability/price).
 */
export function useUnitAdmin(developmentId: string) {
  const qc = useQueryClient();
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: developmentKeys.unitsAll(developmentId) });
    qc.invalidateQueries({ queryKey: developmentKeys.detail(developmentId), exact: true });
    qc.invalidateQueries({ queryKey: developmentKeys.public() });
  }, [qc, developmentId]);

  const update = useMutation({
    mutationFn: (vars: { unitId: string; patch: UpdateUnitPayload }) =>
      updateUnit(developmentId, vars.unitId, vars.patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (unitId: string) => deleteUnit(developmentId, unitId),
    onSuccess: invalidate,
  });
  const bulk = useMutation({
    mutationFn: (payload: BulkUnitUpdatePayload) => bulkUpdateUnits(developmentId, payload),
    onSuccess: invalidate,
  });
  const floorplan = useMutation({
    mutationFn: (vars: { unitId: string; file: File }) =>
      uploadUnitFloorplan(developmentId, vars.unitId, vars.file),
    onSuccess: invalidate,
  });
  const exportCsv = useMutation({
    mutationFn: async (filename?: string) => {
      const blob = await downloadUnitsCsv(developmentId);
      triggerDownload(blob, filename || `units-${developmentId}.csv`);
    },
  });

  return {
    updateUnit: update.mutateAsync,
    isUpdating: update.isPending,
    deleteUnit: remove.mutateAsync,
    isDeleting: remove.isPending,
    bulkUpdate: bulk.mutateAsync,
    isBulkUpdating: bulk.isPending,
    uploadFloorplan: floorplan.mutateAsync,
    isUploadingFloorplan: floorplan.isPending,
    exportCsv: exportCsv.mutateAsync,
    isExporting: exportCsv.isPending,
  };
}
