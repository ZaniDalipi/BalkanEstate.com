import { useCallback, useMemo, useState } from 'react';
import {
  discardBusinessCreateDraft,
  readBusinessCreateDraft,
  readBusinessEditDrafts,
  type BusinessDraftSummary,
} from '../../utils/businessDrafts';

/**
 * The person's business drafts on this device: an unpublished new business,
 * and which published businesses have unsaved edits.
 */
export function useBusinessDrafts(userId: string | undefined, listingIds: string[]) {
  // Bumped after a discard so the drafts are read again
  const [version, setVersion] = useState(0);
  const idsKey = listingIds.join(',');

  const createDraft: BusinessDraftSummary | null = useMemo(
    () => (userId ? readBusinessCreateDraft(userId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version forces a re-read of storage
    [userId, version],
  );

  const editDrafts: Record<string, number> = useMemo(
    () => (userId && idsKey ? readBusinessEditDrafts(userId, idsKey.split(',')) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version forces a re-read of storage
    [userId, idsKey, version],
  );

  const discardCreateDraft = useCallback(() => {
    if (!userId) return;
    discardBusinessCreateDraft(userId);
    setVersion(v => v + 1);
  }, [userId]);

  return { createDraft, editDrafts, discardCreateDraft };
}
