import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { usePublishDevelopment } from '../../hooks/useDevelopmentMutations';
import type { Development, ResidenceBilling } from '../../types';
import { billingRefusal } from '../../utils/billingError';
import { StatusPill } from '../shared/Badges';
import { BuyResidenceDialog } from './billing/BuyResidenceDialog';
import { useBillingText } from './billing/useBillingText';
import { useApiErrorText } from '../../hooks/useApiErrorText';

interface PublishSectionProps {
  development: Development;
  billing?: ResidenceBilling;
  canPublish: boolean;
  canBuy: boolean;
}

/**
 * Status and the publish control. The first publish says it starts the free
 * trial; when publishing needs a pass, the button explains and offers it.
 */
export const PublishSection: React.FC<PublishSectionProps> = ({ development, billing, canPublish, canBuy }) => {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const notify = useNotification();
  const { refusalText } = useBillingText();
  const { setStatus, isLoading } = usePublishDevelopment(development.id);
  const [buying, setBuying] = useState(false);
  const isPublished = development.status === 'published';
  const blocked = !isPublished && billing?.publish.allowed === false ? billing.publish.reason : null;
  const startsTrial = !isPublished && billing?.publish.allowed === true && billing.publish.startsTrial;
  const agencyFree = !isPublished && billing?.publish.allowed === true && !!billing.publish.usesAgencyFree;

  const buttonLabel = (): string => {
    if (isPublished) return t('detail.unpublish', 'Unpublish');
    if (blocked) return t('billing.publishWithPass', 'Buy pass and publish');
    if (agencyFree) return t('billing.publishAgency', 'Publish · free with your agency plan');
    if (startsTrial) return t('billing.publishTrial', { days: billing?.terms.trialDays ?? 15, defaultValue: 'Publish · free for {{days}} days' });
    return t('detail.publish', 'Publish');
  };

  const onToggle = () => {
    if (blocked && canBuy) return setBuying(true);
    setStatus(isPublished ? 'draft' : 'published').catch((err: unknown) => {
      const refusal = billingRefusal(err);
      if (refusal && canBuy && refusal.code !== 'BUILDING_LIMIT') setBuying(true);
      const message = refusal ? refusalText(refusal) : apiText.text(err);
      void notify.error(t('errors.updateFailed', 'Could not save your changes.'), message);
    });
  };

  return (
    <section aria-labelledby="overview-status" className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 id="overview-status" className="text-base font-semibold text-slate-900">
        {t('manage.overview.status', 'Status')}
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <StatusPill status={development.status} />
        <span className="text-sm text-slate-600">
          {isPublished && billing && !billing.publicNow
            ? t('billing.publishedOffline', 'Published, but offline until a Residence Pass is bought.')
            : isPublished
              ? t('manage.overview.publishedHint', 'Buyers can find this residence.')
              : t('manage.overview.draftHint', 'Only your team can see this residence.')}
        </span>
      </div>
      {blocked && <p className="mt-2 text-sm text-amber-800">{refusalText({ code: blocked, message: '' })}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {canPublish && (
          <Button variant={isPublished ? 'outline' : 'default'} disabled={isLoading || (!!blocked && !canBuy)} onClick={onToggle}>
            {buttonLabel()}
          </Button>
        )}
        {isPublished && (
          <Button variant="ghost" onClick={() => navigate(paths.development(development.slug))}>
            {t('public.viewDetails', 'View public page')}
          </Button>
        )}
      </div>
      {buying && billing && <BuyResidenceDialog developmentId={development.id} kind="pass" billing={billing} onClose={() => setBuying(false)} />}
    </section>
  );
};
