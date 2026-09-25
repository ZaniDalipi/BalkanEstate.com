import { useCallback, useMemo, useState } from 'react';
import type { DraftFields, DraftPatch, ImportedDraft } from '../api/importReviewApi';
import { type EditableField, type FormValue, NUMBER_FIELDS } from '../utils/draftFields';

/** Order the editor shows fields in. */
export const FIELD_ORDER: EditableField[] = [
  'title', 'listingType', 'propertyType', 'price', 'isNegotiable', 'sqft', 'beds', 'baths',
  'livingRooms', 'parking', 'yearBuilt', 'floorNumber', 'totalFloors', 'address', 'city', 'country', 'description',
];

export const toFormValue = (field: EditableField, fields: DraftFields): FormValue => {
  const v = fields[field];
  if (field === 'isNegotiable') return v === true;
  if (field === 'listingType') return (v as string) || 'sale';
  if (field === 'propertyType') return (v as string) || 'other';
  return v === null || v === undefined ? '' : String(v);
};

const fromFormValue = (field: EditableField, value: FormValue): unknown => {
  if (typeof value === 'boolean') return value;
  if (NUMBER_FIELDS.includes(field)) {
    if (value.trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return value;
};

export type DraftFormValues = Record<EditableField, FormValue>;

/**
 * Editor state for one draft. Lives in a hook rather than the form so the
 * review view can render a live preview of the unsaved values next to it.
 */
export const useDraftForm = (draft: ImportedDraft) => {
  const initial = useMemo(
    () => Object.fromEntries(FIELD_ORDER.map((f) => [f, toFormValue(f, draft.data)])) as DraftFormValues,
    [draft]
  );
  const [values, setValues] = useState<DraftFormValues>(initial);
  const [images, setImages] = useState<string[]>(draft.data.images);

  const setField = useCallback(
    (field: EditableField, value: FormValue) => setValues((prev) => ({ ...prev, [field]: value })),
    []
  );

  /** Only the fields the owner changed — what the PATCH should carry. */
  const patch = useMemo((): DraftPatch => {
    const out: Record<string, unknown> = {};
    for (const f of FIELD_ORDER) {
      if (values[f] !== initial[f]) out[f] = fromFormValue(f, values[f]);
    }
    if (images.join('\n') !== draft.data.images.join('\n')) out.images = images;
    return out as DraftPatch;
  }, [values, initial, images, draft]);

  const isDirty = Object.keys(patch).length > 0;

  const reset = useCallback(() => {
    setValues(initial);
    setImages(draft.data.images);
  }, [initial, draft]);

  return { values, setField, images, setImages, patch, isDirty, reset };
};

export type DraftFormState = ReturnType<typeof useDraftForm>;
