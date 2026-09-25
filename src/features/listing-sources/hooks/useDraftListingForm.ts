import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/context/AppContext';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { importReviewKeys, propertyKeys } from '@/src/shared/query/queryKeys';
import type { ListingPrefill } from '@/src/features/seller/components/useListingForm';
import { getImportDraft, linkImportDraft } from '../api/importReviewApi';
import { toPreviewProperty } from '../utils/draftPreview';

/**
 * Open a new draft in the regular create-listing form, prefilled with what
 * the feed sent — so it is edited exactly like a listing typed by hand (every
 * field, photo tags, map pin, own uploads, validation, preview step).
 */
export const useOpenDraftInListingForm = () => {
  const { dispatch } = useAppContext();
  const queryClient = useQueryClient();

  return useCallback(
    async (draftId: string) => {
      const draft = await queryClient.fetchQuery({
        queryKey: importReviewKeys.detail(draftId),
        queryFn: () => getImportDraft(draftId),
      });
      dispatch({ type: 'SET_IMPORT_DRAFT_TO_PUBLISH', payload: { draftId, property: toPreviewProperty(draft) } });
      window.history.pushState({ view: 'create-listing' }, '', buildLocalizedPath('/create-listing'));
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
    },
    [dispatch, queryClient]
  );
};

/**
 * The prefill for the create-listing page while it holds an imported draft.
 * Once the listing is created it is linked back to the draft (so the feed's
 * next sync recognises it), and the post-publish redirect lands on the
 * Imported Drafts tab to carry on with the rest.
 */
export const useImportDraftPrefill = (): ListingPrefill | null => {
  const { state, dispatch } = useAppContext();
  const queryClient = useQueryClient();
  const draft = state.importDraftToPublish;

  return useMemo(() => {
    if (!draft) return null;
    return {
      property: draft.property,
      onCreated: async (created) => {
        try {
          await linkImportDraft(draft.draftId, created.id);
        } finally {
          void queryClient.invalidateQueries({ queryKey: importReviewKeys.all });
          void queryClient.invalidateQueries({ queryKey: propertyKeys.all });
          dispatch({ type: 'SET_ACCOUNT_TAB', payload: 'importReview' });
        }
      },
    };
  }, [draft, dispatch, queryClient]);
};
