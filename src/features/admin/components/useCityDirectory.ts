import { useQuery } from '@tanstack/react-query';
import { cityDirectoryKeys } from '@/src/shared/query/queryKeys';
import { getCityDirectory, type CityDirectoryEntry } from '../api/adminApi';

/**
 * Every (city, country) pair already known to the app — from `CityMarketData`,
 * not from the gallery's own rows — for populating the city-showcase form's
 * pickers.
 *
 * Names change on a human timescale (an admin typing a new one, occasionally),
 * so a five-minute `staleTime` is generous: the list a curator sees while the
 * form is open doesn't need to reflect a city someone else added seconds ago.
 */
export function useCityDirectory(): { entries: CityDirectoryEntry[]; isLoading: boolean } {
    const { data, isLoading } = useQuery({
        queryKey: cityDirectoryKeys.all,
        queryFn: async () => (await getCityDirectory()).cities ?? [],
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });

    return { entries: data ?? [], isLoading };
}
