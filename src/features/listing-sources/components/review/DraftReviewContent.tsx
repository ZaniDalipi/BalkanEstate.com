import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImportedDraftDetail } from '../../api/importReviewApi';
import { useDraftForm } from '../../hooks/useDraftForm';
import { useImportReviewActions } from '../../hooks/useImportReview';
import { toPreviewProperty } from '../../utils/draftPreview';
import DraftEditForm from './DraftEditForm';
import DraftIssueList from './DraftIssueList';
import DraftListingPreview from './DraftListingPreview';
import type { ReviewDecision, ReviewMode } from '../../types/review';
import DraftReviewBar from './DraftReviewBar';
import ImportDraftChanges from './ImportDraftChanges';

interface DraftReviewContentProps {
  draft: ImportedDraftDetail;
  position: { index: number; total: number };
  initialMode: ReviewMode;
  busy: boolean;
  error: string | null;
  onPrev?: () => void;
  onNext?: () => void;
  onDecision: (decision: ReviewDecision) => void;
}

/**
 * One draft at full size: the listing as buyers will see it, and — in edit
 * mode — the form beside a preview that follows every keystroke.
 */
const DraftReviewContent: React.FC<DraftReviewContentProps> = ({
  draft, position, initialMode, busy, error, onPrev, onNext, onDecision,
}) => {
  const { t } = useTranslation('listingFeeds');
  const [mode, setMode] = useState<ReviewMode>(draft.status === 'pending' ? initialMode : 'preview');
  const [saveError, setSaveError] = useState<string | null>(null);
  const form = useDraftForm(draft);
  const { edit } = useImportReviewActions();

  const property = useMemo(() => toPreviewProperty(draft, form.patch), [draft, form.patch]);
  const blocked = !String(form.values.title).trim() || !String(form.values.city).trim();

  const save = async (): Promise<boolean> => {
    setSaveError(null);
    try {
      await edit.mutateAsync({ id: draft.id, data: form.patch });
      return true;
    } catch (err) {
      setSaveError((err as Error).message);
      setMode('edit');
      return false;
    }
  };

  // Unsaved edits are what the owner sees in the preview, so publishing saves them first.
  const accept = async () => {
    if (form.isDirty && !(await save())) return;
    onDecision('accept');
  };

  const guardDirty = (go?: () => void) =>
    go && (() => { if (!form.isDirty || window.confirm(t('review.discardChanges'))) go(); });

  return (
    <>
      <DraftReviewBar
        draft={draft}
        position={position}
        mode={mode}
        busy={busy || edit.isPending}
        dirty={form.isDirty}
        blocked={blocked}
        onPrev={guardDirty(onPrev)}
        onNext={guardDirty(onNext)}
        onModeChange={setMode}
        onAccept={() => void accept()}
        onReject={() => onDecision('reject')}
        onRestore={() => onDecision('restore')}
      />

      <main className="max-w-screen-xl mx-auto p-3 sm:p-6 space-y-5">
        {(error || draft.issues.length > 0 || (draft.kind === 'update' && draft.current)) && (
          <div className="space-y-3">
            {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <DraftIssueList issues={draft.issues} blocking={draft.blockingIssues} />
            {draft.kind === 'update' && draft.current && (
              <ImportDraftChanges fields={draft.changedFields} current={draft.current} incoming={draft.data} />
            )}
          </div>
        )}

        {mode === 'edit' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-6">
            <aside className="lg:sticky lg:top-20 self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('review.editorTitle')}</h2>
              <DraftEditForm
                draft={draft}
                form={form}
                saving={edit.isPending}
                error={saveError}
                onCancel={() => { form.reset(); setMode('preview'); }}
                onSave={() => void save().then((ok) => ok && setMode('preview'))}
              />
            </aside>
            <section aria-label={t('review.livePreview')}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{t('review.livePreview')}</p>
              <DraftListingPreview property={property} />
            </section>
          </div>
        ) : (
          <>
            {form.isDirty && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{t('review.unsavedHint')}</p>
            )}
            <DraftListingPreview property={property} />
          </>
        )}
      </main>
    </>
  );
};

export default DraftReviewContent;
