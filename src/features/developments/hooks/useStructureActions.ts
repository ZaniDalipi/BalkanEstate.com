import { useMutation, useQueryClient } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import {
  deleteStructure,
  getStructureDeleteImpact,
  updateBuilding,
  updateFloor,
  type StructureKind,
} from '../api/developmentsApi';

/**
 * Rename / delete a building or floor from the dashboard. Every write refreshes
 * the structure, inventory, pictures and public pages of the development.
 */
export function useStructureActions(developmentId: string) {
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: developmentKeys.structure(developmentId) }),
      qc.invalidateQueries({ queryKey: developmentKeys.unitsAll(developmentId) }),
      qc.invalidateQueries({ queryKey: developmentKeys.scenes(developmentId) }),
      qc.invalidateQueries({ queryKey: developmentKeys.detail(developmentId) }),
      qc.invalidateQueries({ queryKey: developmentKeys.public() }),
    ]);

  const rename = useMutation({
    mutationFn: async ({ kind, id, name }: { kind: StructureKind; id: string; name: string }): Promise<void> => {
      if (kind === 'building') await updateBuilding(developmentId, id, { name });
      else await updateFloor(developmentId, id, { label: name });
    },
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: ({ kind, id }: { kind: StructureKind; id: string }) => deleteStructure(developmentId, kind, id),
    onSuccess: refresh,
  });

  return {
    rename: rename.mutateAsync,
    remove: remove.mutateAsync,
    impact: (kind: StructureKind, id: string) => getStructureDeleteImpact(developmentId, kind, id),
    isBusy: rename.isPending || remove.isPending,
  };
}
