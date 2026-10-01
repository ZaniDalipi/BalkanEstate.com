import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { ImportDraftToPublish } from '@/types';
import { importReviewKeys, propertyKeys } from '@/src/shared/query/queryKeys';
import type { ListingPrefill } from '@/src/features/seller/components/useListingForm';
import { getImportDraft, linkImportDraft } from '../api/importReviewApi';
import { toPreviewProperty } from '../utils/draftPreview';
import { IMPORT_REVIEW_TAB_SLUG } from './useOpenImportReview';

/**
 * Open a new draft in the regular create-listing form, prefilled with what
 * the feed sent — so it is edited exactly like a listing typed by hand (every
 * field, photo tags, map pin, own uploads, validation, preview step).
 */
export const useOpenDraftInListingForm = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (draftId: string) => {
      const draft = await queryClient.fetchQuery({
        queryKey: importReviewKeys.detail(draftId),
        queryFn: () => getImportDraft(draftId),
      });
      const importDraft: ImportDraftToPublish = { draftId, property: toPreviewProperty(draft) };
      navigate(paths.createListing(), { state: { importDraft } });
    },
    [queryClient]
  );
};

/**
 * The prefill for the create-listing page while it holds an imported draft.
 * Once the listing is created it is linked back to the draft (so the feed's
 * next sync recognises it), and the post-publish redirect lands on the
 * Imported Drafts tab to carry on with the rest.
 */
export const useImportDraftPrefill = (draft: ImportDraftToPublish | null): ListingPrefill | null => {
  const queryClient = useQueryClient();

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
        }
      },
      redirectTo: paths.account(IMPORT_REVIEW_TAB_SLUG),
    };
  }, [draft, queryClient]);
};
