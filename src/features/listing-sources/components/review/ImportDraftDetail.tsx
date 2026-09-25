import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/ui/Modal';
import { useImportDraft } from '../../hooks/useImportReview';
import type { ReviewDecision, ReviewMode } from '../../types/review';
import DraftReviewContent from './DraftReviewContent';

interface ImportDraftDetailProps {
  draftId: string;
  position: { index: number; total: number };
  initialMode: ReviewMode;
  busy: boolean;
  error: string | null;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
  onDecision: (decision: ReviewDecision) => void;
}

/** Full-screen review of one imported draft, loaded with its complete listing. */
const ImportDraftDetail: React.FC<ImportDraftDetailProps> = ({
  draftId, position, initialMode, busy, error, onPrev, onNext, onClose, onDecision,
}) => {
  const { t } = useTranslation(['listingFeeds', 'common']);
  const { data: draft, isLoading, isError } = useImportDraft(draftId);

  return (
    <Modal isOpen onClose={onClose} fullScreenBreakpoint="always">
      {isLoading ? (
        <div className="flex justify-center py-24" role="status" aria-label={t('common:loading')}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : isError || !draft ? (
        <p role="alert" className="text-center py-24 text-red-600">{t('listingFeeds:review.loadError')}</p>
      ) : (
        <DraftReviewContent
          // A new draft gets a fresh form and gallery position.
          key={draft.id}
          draft={draft}
          position={position}
          initialMode={initialMode}
          busy={busy}
          error={error}
          onPrev={onPrev}
          onNext={onNext}
          onDecision={onDecision}
        />
      )}
    </Modal>
  );
};

export default ImportDraftDetail;
