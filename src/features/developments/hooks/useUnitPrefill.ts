import { useMutation } from '@tanstack/react-query';
import { getUnitPrefill } from '../api/developmentsApi';

/** Read unit fields from one of the owner's listings, on demand (when one is picked). */
export const useUnitPrefill = (developmentId: string) => {
  const m = useMutation({ mutationFn: (listingId: string) => getUnitPrefill(developmentId, listingId) });
  return { load: m.mutateAsync, isLoading: m.isPending, error: m.error, reset: m.reset };
};
