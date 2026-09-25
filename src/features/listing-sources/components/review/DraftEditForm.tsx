import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ImportedDraft } from '../../api/importReviewApi';
import { type DraftFormState, FIELD_ORDER, toFormValue } from '../../hooks/useDraftForm';
import { formatDraftValue } from '../../utils/draftFormat';
import type { EditableField } from '../../utils/draftFields';
import DraftFieldInput from './DraftFieldInput';
import DraftPhotoEditor from './DraftPhotoEditor';

interface DraftEditFormProps {
  draft: ImportedDraft;
  form: DraftFormState;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: () => void;
}

/** Correct what the feed parsed wrong before the listing goes live. */
const DraftEditForm: React.FC<DraftEditFormProps> = ({ draft, form, saving, error, onCancel, onSave }) => {
  const { t } = useTranslation(['listingFeeds', 'property']);

  const feedValueFor = (field: EditableField): string | undefined =>
    form.values[field] !== toFormValue(field, draft.original)
      ? formatDraftValue(field, draft.original, t)
      : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.isDirty) onSave();
    else onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FIELD_ORDER.map((field) => (
          <DraftFieldInput
            key={field}
            field={field}
            value={form.values[field]}
            feedValue={feedValueFor(field)}
            onChange={form.setField}
          />
        ))}
      </div>

      <section>
        <h4 className="text-xs font-medium text-gray-600 mb-2">{t('listingFeeds:review.fields.images')}</h4>
        <DraftPhotoEditor images={form.images} onChange={form.setImages} />
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
  );
};

export default DraftEditForm;
