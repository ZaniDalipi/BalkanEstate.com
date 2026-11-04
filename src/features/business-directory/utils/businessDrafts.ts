import { formDraftKey, readFormDraft, removeFormDraft } from '@/src/shared/utils/formDraftStorage';
import type { BusinessCategory, CreateBusinessListingData } from '@/src/shared/types/businessListing.types';

/** Where the create form keeps a new, unpublished business */
export const businessCreateDraftKey = (userId: string) => formDraftKey('business-listing', userId);

/** Where the edit form keeps unsaved changes to one published business */
export const businessEditDraftKey = (listingId: string, userId: string) =>
  formDraftKey(`business-listing-edit-${listingId}`, userId);

/** What the My Businesses page shows of an unpublished business */
export interface BusinessDraftSummary {
  name: string;
  category: BusinessCategory | '';
  city: string;
  country: string;
  savedAt: number;
  expiresAt: number;
}

interface DraftWithForm {
  formData?: Partial<CreateBusinessListingData>;
}

export function readBusinessCreateDraft(userId: string, now = Date.now()): BusinessDraftSummary | null {
  const stored = readFormDraft<DraftWithForm>(businessCreateDraftKey(userId), now);
  if (!stored) return null;
  const form = stored.data?.formData ?? {};
  return {
    name: (form.name ?? '').trim(),
    category: form.category ?? '',
    city: form.city ?? '',
    country: form.country ?? '',
    savedAt: stored.savedAt,
    expiresAt: stored.expiresAt,
  };
}

/** For each listing id with unsaved edits on this device, when they were saved. */
export function readBusinessEditDrafts(userId: string, listingIds: string[], now = Date.now()): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of listingIds) {
    const stored = readFormDraft(businessEditDraftKey(id, userId), now);
    if (stored) out[id] = stored.savedAt;
  }
  return out;
}

export const discardBusinessCreateDraft = (userId: string) => removeFormDraft(businessCreateDraftKey(userId));
