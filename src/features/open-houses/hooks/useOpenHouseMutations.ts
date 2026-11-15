import { useMutation, useQueryClient } from '@tanstack/react-query';
import { openHouseKeys } from '@/src/shared/query/queryKeys';
import { cancelOpenHouse, cancelRsvp, createOpenHouse, rsvpOpenHouse } from '../api/openHouseApi';
import { forgetGuestRsvp, rememberGuestRsvp } from '../utils/guestRsvps';
import type { OpenHouseDraft, RsvpInput } from '../types';

/** Seller: add or cancel an open house on their listing. */
export function useHostOpenHouse(propertyId: string) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: openHouseKeys.all });
  const add = useMutation({
    mutationFn: (draft: OpenHouseDraft) => createOpenHouse(propertyId, draft),
    onSuccess: refresh,
  });
  const cancel = useMutation({
    mutationFn: (openHouseId: string) => cancelOpenHouse(openHouseId),
    onSuccess: refresh,
  });
  return { add, cancel };
}

/** Visitor: say you're coming, or take it back. */
export function useRsvp(propertyId: string, isSignedIn: boolean) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: openHouseKeys.property(propertyId) });
  const join = useMutation({
    mutationFn: ({ openHouseId, input }: { openHouseId: string; input: RsvpInput }) => rsvpOpenHouse(openHouseId, input),
    onSuccess: (oh) => {
      if (!isSignedIn && oh.myRsvpId) rememberGuestRsvp(oh.id, oh.myRsvpId);
      return refresh();
    },
  });
  const leave = useMutation({
    mutationFn: ({ openHouseId, rsvpId }: { openHouseId: string; rsvpId?: string }) => cancelRsvp(openHouseId, rsvpId),
    onSuccess: (oh) => {
      forgetGuestRsvp(oh.id);
      return refresh();
    },
  });
  return { join, leave };
}
