import { useQuery } from '@tanstack/react-query';
import { cityShowcaseKeys } from '@/src/shared/query/queryKeys';
import { getShowcaseCities, type ShowcaseCity } from '../api/cityShowcaseApi';

interface UseShowcaseCitiesResult {
    cities: ShowcaseCity[];
    isLoading: boolean;
    isError: boolean;
}

/**
 * Query options for the curated gallery list.
 *
 * Exported because the hook is not the only caller: `index.tsx` warms the same
 * query before React mounts, and the two have to agree on the key and the
 * freshness window or the warmed entry is thrown away and re-requested the
 * moment the section renders — which is the whole cost the warming exists to
 * remove.
 *
 * The key is the shared public key the admin invalidates after an edit, which
 * is what carries a curated change to the home page instead of leaving it to
 * expire on its own. Curated panels change on a human timescale, hence the long
 * `staleTime`: a visitor moving between pages re-uses the cached list rather
 * than re-fetching a section that is identical every time.
 */
export const showcaseCitiesQuery = {
    queryKey: cityShowcaseKeys.public(),
    queryFn: getShowcaseCities,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
} as const;

/**
 * Admin-curated cities for the home-page gallery.
 *
 * Server state, so it lives in React Query rather than in a component effect
 * (Claude.md).
 */
export function useShowcaseCities(): UseShowcaseCitiesResult {
    const { data, isLoading, isError } = useQuery(showcaseCitiesQuery);

    return { cities: data ?? [], isLoading, isError };
}
