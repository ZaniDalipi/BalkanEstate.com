import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/ui/Modal';
import type { DraftFields, DraftPatch, ImportedDraft } from '../../api/importReviewApi';
import { formatDraftValue } from '../../utils/draftFormat';
import DraftFieldInput, { type EditableField, type FormValue, NUMBER_FIELDS } from './DraftFieldInput';
import DraftPhotoEditor from './DraftPhotoEditor';

interface ImportDraftEditorProps {
  draft: ImportedDraft;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (patch: DraftPatch) => void;
}

const FIELD_ORDER: EditableField[] = [
  'title', 'listingType', 'propertyType', 'price', 'isNegotiable', 'sqft', 'beds', 'baths',
  'livingRooms', 'parking', 'yearBuilt', 'floorNumber', 'totalFloors', 'address', 'city', 'country', 'description',
];

const toFormValue = (field: EditableField, fields: DraftFields): FormValue => {
  const v = fields[field];
  if (field === 'isNegotiable') return v === true;
  if (field === 'listingType') return (v as string) || 'sale';
  if (field === 'propertyType') return (v as string) || 'other';
  return v === null || v === undefined ? '' : String(v);
};

const fromFormValue = (field: EditableField, value: FormValue): unknown => {
  if (typeof value === 'boolean') return value;
  if (NUMBER_FIELDS.includes(field)) return value.trim() === '' ? null : Number(value);
  return value;
};

/** Correct what the feed parsed wrong before the listing goes live. */
const ImportDraftEditor: React.FC<ImportDraftEditorProps> = ({ draft, saving, error, onCancel, onSave }) => {
  const { t } = useTranslation(['listingFeeds', 'property']);
  const initial = useMemo(
    () => Object.fromEntries(FIELD_ORDER.map((f) => [f, toFormValue(f, draft.data)])) as Record<EditableField, FormValue>,
    [draft]
  );
  const [values, setValues] = useState(initial);
  const [images, setImages] = useState<string[]>(draft.data.images);

  const handleChange = (field: EditableField, value: FormValue) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: Record<string, unknown> = {};
    for (const f of FIELD_ORDER) {
      if (values[f] !== initial[f]) patch[f] = fromFormValue(f, values[f]);
    }
    if (images.join('\n') !== draft.data.images.join('\n')) patch.images = images;
    if (Object.keys(patch).length === 0) {
      onCancel();
      return;
    }
    onSave(patch as DraftPatch);
  };

  const feedValueFor = (field: EditableField): string | undefined => {
    const original = toFormValue(field, draft.original);
    return values[field] !== original ? formatDraftValue(field, draft.original, t) : undefined;
  };

  return (
    <Modal isOpen onClose={onCancel} title={t('listingFeeds:review.editorTitle')} size="3xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FIELD_ORDER.map((field) => (
            <DraftFieldInput
              key={field}
              field={field}
              value={values[field]}
              feedValue={feedValueFor(field)}
              onChange={handleChange}
            />
          ))}
        </div>

        <section>
          <h4 className="text-xs font-medium text-gray-600 mb-2">{t('listingFeeds:review.fields.images')}</h4>
          <DraftPhotoEditor images={images} onChange={setImages} />
        </section>

        {error && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} disabled={saving} className="px-4 py-2 text-sm rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50">
            {t('listingFeeds:review.cancel')}
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-50">
            {saving ? t('listingFeeds:review.saving') : t('listingFeeds:review.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ImportDraftEditor;
