import { formDraftKey, removeFormDraft } from '@/src/shared/utils/formDraftStorage';

/** Where the create-agency form keeps what was typed until the agency exists */
export const agencyDraftKey = (userId: string) => formDraftKey('agency-create', userId);

/** The agency was created: its form no longer needs restoring. */
export const clearAgencyDraft = (userId?: string | null) => {
  if (userId) removeFormDraft(agencyDraftKey(userId));
};
