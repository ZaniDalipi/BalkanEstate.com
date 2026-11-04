import React from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import BusinessDraftCard from './BusinessDraftCard';
import type { BusinessDraftSummary } from '../../utils/businessDrafts';

interface BusinessDraftsSectionProps {
  draft: BusinessDraftSummary | null;
  onDiscard: () => void;
}

/** "Drafts" on My Businesses: what was started but not published yet. */
const BusinessDraftsSection: React.FC<BusinessDraftsSectionProps> = ({ draft, onDiscard }) => {
  const { t } = useTranslation('businessDirectory');
  const { confirm } = useConfirmation();
  if (!draft) return null;

  const askDiscard = async () => {
    const ok = await confirm({
      title: t('myBusinesses.drafts.discardTitle', 'Discard this draft?'),
      message: t('myBusinesses.drafts.discardMessage', 'What you entered will be deleted from this device. This cannot be undone.'),
      confirmLabel: t('myBusinesses.drafts.discard', 'Discard'),
      type: 'danger',
    });
    if (ok) onDiscard();
  };

  return (
    <section className="mb-8" aria-labelledby="business-drafts-title">
      <h3 id="business-drafts-title" className="text-base font-bold text-neutral-900">
        {t('myBusinesses.drafts.title', 'Drafts')}
      </h3>
      <p className="text-sm text-neutral-500 mb-3">
        {t('myBusinesses.drafts.subtitle', 'Not published yet. Saved on this device only.')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BusinessDraftCard draft={draft} onContinue={() => navigate(paths.businessListingNew())} onDiscard={askDiscard} />
      </div>
    </section>
  );
};

export default BusinessDraftsSection;
