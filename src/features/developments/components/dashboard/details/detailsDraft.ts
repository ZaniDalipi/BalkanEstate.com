import type { Development, UpdateDevelopmentPayload } from '../../../types';
import type { DetailsFormValues } from '../../../validation/developmentValidation';
import { formatCoordinate } from '../../../utils/format';

/** Everything the "Residence details" form edits, as text the inputs hold. */
export interface DetailsDraft extends DetailsFormValues {
  description: string;
  municipality: string;
  address: string;
  constructionStatus: string;
  expectedCompletionDate: string;
  contactName: string;
  amenities: string[];
}

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

export const toDraft = (d: Development): DetailsDraft => ({
  name: d.name,
  description: str(d.description),
  country: d.country,
  city: d.city,
  municipality: str(d.municipality),
  address: str(d.address),
  lat: formatCoordinate(d.lat),
  lng: formatCoordinate(d.lng),
  category: d.category,
  constructionStatus: d.constructionStatus,
  expectedCompletionDate: d.expectedCompletionDate ? d.expectedCompletionDate.slice(0, 10) : '',
  yearBuilt: str(d.yearBuilt),
  website: str(d.website),
  contactName: str(d.contact?.name),
  contactEmail: str(d.contact?.email),
  contactPhone: str(d.contact?.phone),
  amenities: [...(d.amenities ?? [])],
});

const TEXT_FIELDS = ['name', 'description', 'country', 'city', 'municipality', 'address', 'website', 'expectedCompletionDate'] as const;

const toCoordinate = (v: string): number | null => (v.trim() ? Number(v) : null);

/**
 * Only the fields that changed, ready for PATCH — so a save never overwrites
 * something a teammate changed in the meantime that this form didn't touch.
 */
export const changedFields = (draft: DetailsDraft, d: Development): UpdateDevelopmentPayload => {
  const before = toDraft(d);
  const out: UpdateDevelopmentPayload = {};
  for (const key of TEXT_FIELDS) {
    if (draft[key].trim() !== before[key].trim()) out[key] = draft[key].trim();
  }
  if (draft.category !== before.category) out.category = draft.category as Development['category'];
  if (draft.constructionStatus !== before.constructionStatus) {
    out.constructionStatus = draft.constructionStatus as Development['constructionStatus'];
  }
  if (draft.lat.trim() !== before.lat || draft.lng.trim() !== before.lng) {
    out.lat = toCoordinate(draft.lat);
    out.lng = toCoordinate(draft.lng);
  }
  if (draft.yearBuilt.trim() !== before.yearBuilt) out.yearBuilt = draft.yearBuilt.trim() ? Number(draft.yearBuilt) : null;
  if (draft.amenities.join('\n') !== before.amenities.join('\n')) out.amenities = draft.amenities;
  const contact = {
    name: draft.contactName.trim(),
    email: draft.contactEmail.trim(),
    phone: draft.contactPhone.trim(),
  };
  if (contact.name !== before.contactName || contact.email !== before.contactEmail || contact.phone !== before.contactPhone) {
    out.contact = contact.name || contact.email || contact.phone ? contact : null;
  }
  return out;
};
