import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteBuilderImage, uploadBuilderImage } from '../api/developmentsApi';
import { developmentKeys } from '../api/developmentKeys';

export type BuilderImageKind = 'logo' | 'banner';

/** Upload / remove the builder's logo and banner; the residence (dashboard and public) refreshes after. */
export function useBuilderImages(developmentId: string) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: developmentKeys.detail(developmentId) });
    qc.invalidateQueries({ queryKey: developmentKeys.public() });
  };
  const upload = useMutation({
    mutationFn: ({ kind, file }: { kind: BuilderImageKind; file: File }) => uploadBuilderImage(developmentId, kind, file),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (kind: BuilderImageKind) => deleteBuilderImage(developmentId, kind),
    onSuccess: refresh,
  });
  return { upload: upload.mutateAsync, remove: remove.mutateAsync, busy: upload.isPending || remove.isPending };
}
