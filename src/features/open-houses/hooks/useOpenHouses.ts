import { useQuery } from '@tanstack/react-query';
import { openHouseKeys } from '@/src/shared/query/queryKeys';
import { fetchMyOpenHouses, fetchPropertyOpenHouses } from '../api/openHouseApi';
import { getGuestRsvp } from '../utils/guestRsvps';
import type { OpenHouse } from '../types';

/** Merge in a guest's remembered sign-ups so the page shows "You're going". */
const withGuestRsvps = (list: OpenHouse[]): OpenHouse[] =>
  list.map((oh) => {
    if (oh.isGoing) return oh;
    const rsvpId = getGuestRsvp(oh.id);
    return rsvpId ? { ...oh, isGoing: true, myRsvpId: rsvpId } : oh;
  });

/** Upcoming open houses of one listing — usually an empty list. */
export function useOpenHouses(propertyId: string | undefined) {
  return useQuery({
    queryKey: openHouseKeys.property(propertyId ?? ''),
    queryFn: async () => withGuestRsvps(await fetchPropertyOpenHouses(propertyId as string)),
    enabled: !!propertyId,
    staleTime: 60 * 1000,
    retry: false,
  });
}

/** The host's own upcoming open houses (with who's coming). */
export function useMyOpenHouses(propertyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: openHouseKeys.mine(propertyId),
    queryFn: () => fetchMyOpenHouses(propertyId),
    enabled: enabled && !!propertyId,
    staleTime: 30 * 1000,
  });
}
