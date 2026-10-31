import { useMutation, useQueryClient } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import { createEntrance, deleteEntrance, updateEntrance } from '../api/developmentsApi';
import type { EntrancePayload } from '../types';

/**
 * Add, change and remove a building's entrances. Every write refreshes the
 * structure, the units (they show their entrance), the pictures (a removed
 * entrance takes its marked regions) and the public pages.
 */
export function useEntranceActions(developmentId: string) {
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: developmentKeys.structure(developmentId) }),
      qc.invalidateQueries({ queryKey: developmentKeys.unitsAll(developmentId) }),
      qc.invalidateQueries({ queryKey: developmentKeys.scenes(developmentId) }),
      qc.invalidateQueries({ queryKey: developmentKeys.public() }),
    ]);

  const create = useMutation({
    mutationFn: ({ buildingId, payload }: { buildingId: string; payload: EntrancePayload }) => createEntrance(developmentId, buildingId, payload),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ entranceId, payload }: { entranceId: string; payload: EntrancePayload }) => updateEntrance(developmentId, entranceId, payload),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (entranceId: string) => deleteEntrance(developmentId, entranceId),
    onSuccess: refresh,
  });

  return {
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    isBusy: create.isPending || update.isPending || remove.isPending,
  };
}
