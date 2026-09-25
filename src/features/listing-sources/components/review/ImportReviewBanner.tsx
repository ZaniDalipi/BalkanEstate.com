import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePendingImportCount } from '../../hooks/useImportReview';
import { useOpenImportReview } from '../../hooks/useOpenImportReview';

/** Points the owner at fetched listings still waiting for their approval. */
const ImportReviewBanner: React.FC = () => {
  const { t } = useTranslation('listingFeeds');
  const { data } = usePendingImportCount();
  const openReview = useOpenImportReview();
  if (!data?.total) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap bg-primary/5 border border-primary/30 rounded-xl px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-gray-900">{t('review.bannerTitle', { count: data.total })}</p>
        <p className="text-xs text-gray-600">{t('review.bannerBody')}</p>
      </div>
      <button
        type="button"
        onClick={openReview}
        className="px-4 py-2 text-sm bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
      >
        {t('review.bannerCta')}
      </button>
    </div>
  );
};

export default ImportReviewBanner;
