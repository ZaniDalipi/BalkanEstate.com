import { useMutation, useQueryClient } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import { deleteResidencePhoto, reorderResidencePhotos, uploadResidencePhotos } from '../api/developmentsApi';

/** Add, remove and reorder the residence's gallery photos; each refreshes the dashboard and public pages. */
export function useResidenceGallery(developmentId: string) {
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: developmentKeys.detail(developmentId) }),
      qc.invalidateQueries({ queryKey: developmentKeys.public() }),
    ]);
  const add = useMutation({ mutationFn: (files: File[]) => uploadResidencePhotos(developmentId, files), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (index: number) => deleteResidencePhoto(developmentId, index), onSuccess: refresh });
  const reorder = useMutation({ mutationFn: (urls: string[]) => reorderResidencePhotos(developmentId, urls), onSuccess: refresh });
  return {
    add: add.mutateAsync,
    remove: remove.mutateAsync,
    reorder: reorder.mutateAsync,
    isUploading: add.isPending,
    isBusy: add.isPending || remove.isPending || reorder.isPending,
  };
}
