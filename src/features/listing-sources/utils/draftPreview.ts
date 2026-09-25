import { transformBackendProperty } from '@/src/features/properties/api/propertyApi';
import type { Property } from '@/src/shared/types';
import type { DraftPatch, ImportedDraftDetail } from '../api/importReviewApi';

type ListingImage = { url: string; tag?: string };

/**
 * The draft as a `Property`, so the review view can render it with the same
 * components buyers see. Unsaved edits (`patch`) are laid over the stored
 * listing, which is what lets the preview update while the owner types.
 *
 * Goes through `transformBackendProperty` — the API ingestion boundary — so
 * a draft is normalised exactly like a published listing would be.
 */
export const toPreviewProperty = (draft: ImportedDraftDetail, patch: DraftPatch = {}): Property => {
  const listing: Record<string, unknown> = { ...draft.listing };
  const { images: keptUrls, ...fields } = patch;
  for (const [key, value] of Object.entries(fields)) listing[key] = value ?? undefined;

  if (keptUrls) {
    const byUrl = new Map(
      ((listing.images as ListingImage[] | undefined) ?? []).map((img) => [img.url, img])
    );
    listing.images = keptUrls.map((url) => byUrl.get(url) ?? { url, tag: 'other' });
    listing.imageUrl = keptUrls[0] ?? '';
  }

  return transformBackendProperty({
    ...listing,
    id: draft.id,
    status: 'draft',
    createdAt: draft.fetchedAt,
    lastRenewed: draft.fetchedAt,
  });
};
