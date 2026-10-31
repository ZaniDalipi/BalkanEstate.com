import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Filters } from '@/types';
import { propertyKeys } from '@/src/shared/query/queryKeys';
import { featureMatchRequest } from '@/utils/featureMatchRequest';
import { fetchFeatureMatches } from '../api/featureMatchesApi';

/** Module-level so the Set is rebuilt only when the ids change. */
const toIdSet = (ids: string[]): ReadonlySet<string> => new Set(ids);

/**
 * The listings that have every amenity and "yes" feature in `filters`, as the
 * server read them from each whole listing. `undefined` while loading, on an
 * error, or when the filters ask for no such feature — `filterProperties` then
 * checks the fields the list carries instead, so the page never waits on it.
 */
export const useFeatureMatches = (filters: Filters): ReadonlySet<string> | undefined => {
    const request = useMemo(
        () => featureMatchRequest(filters),
        // The request depends only on these; listing them keeps the query stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filters.amenities, filters.listingType, filters.hasBalcony, filters.hasGarden, filters.hasElevator,
         filters.hasSecurity, filters.hasAirConditioning, filters.hasPool, filters.petsAllowed],
    );
    const { data } = useQuery({
        queryKey: propertyKeys.featureMatches(request ?? { features: [], flags: [] }),
        queryFn: () => fetchFeatureMatches(request!),
        enabled: request !== null,
        staleTime: 5 * 60 * 1000,
        retry: 1,
        select: toIdSet,
    });
    return request ? data : undefined;
};
