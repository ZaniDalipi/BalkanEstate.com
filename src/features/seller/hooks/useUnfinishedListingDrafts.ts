// useUnfinishedListingDrafts - the user's unfinished new listings kept on this device
// (see ../utils/listingDraftStorage), with a way to discard one.

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listingDraftKeys } from '@/src/shared/query/queryKeys';
import {
    clearListingDraft,
    draftKey,
    listListingDrafts,
    type DraftKind,
} from '../utils/listingDraftStorage';

export function useUnfinishedListingDrafts(userId: string | undefined) {
    const queryClient = useQueryClient();

    const { data: drafts = [] } = useQuery({
        queryKey: listingDraftKeys.forUser(userId ?? ''),
        queryFn: () => listListingDrafts(userId as string),
        enabled: !!userId,
        // Drafts change in another view (the listing form), so re-read on every visit
        staleTime: 0,
        refetchOnMount: 'always',
    });

    const discardDraft = useCallback(async (kind: DraftKind) => {
        if (!userId) return;
        await clearListingDraft(draftKey(userId, kind));
        await queryClient.invalidateQueries({ queryKey: listingDraftKeys.forUser(userId) });
    }, [queryClient, userId]);

    return { drafts, discardDraft };
}
