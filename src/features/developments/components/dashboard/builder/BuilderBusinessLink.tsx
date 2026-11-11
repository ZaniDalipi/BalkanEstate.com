import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { SoftIcon } from '@/src/shared/illustrations';
import { useMyBusinessListings } from '@/src/features/business-directory/hooks/useBusinessListings';
import type { Development } from '../../../types';
import { useApiErrorText } from '../../../hooks/useApiErrorText';
import { useBuilderBusiness } from '../../../hooks/useBuilderBusiness';
import { FormSelect } from '../../shared/FormSelect';
import { LinkedBusinessCard } from './LinkedBusinessCard';

interface BuilderBusinessLinkProps {
  development: Development;
  canEdit: boolean;
}

const BTN = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60';

/**
 * The builder's company in the Business Directory: link one of the user's own
 * businesses, and buyers see its details (kept up to date there) on the
 * residence and the company page, and the residence on the business's page.
 * Only a business the user owns can be linked; with none, the way to add one.
 */
export const BuilderBusinessLink: React.FC<BuilderBusinessLinkProps> = ({ development, canEdit }) => {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const { listings, isLoading, error, refetch } = useMyBusinessListings(canEdit);
  const { link, busy } = useBuilderBusiness(development.id);
  const live = listings.filter((l) => l.isActive);
  const linkedId = development.builder?.businessListingId;
  const [choice, setChoice] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const picked = choice || live[0]?.id || '';

  const run = async (businessId: string | null) => {
    setFailure(null);
    try {
      await link(businessId);
      setChoice('');
    } catch (err) {
      setFailure(apiText.text(err));
    }
  };

  let body: React.ReactNode;
  if (linkedId) {
    body = <LinkedBusinessCard business={listings.find((l) => l.id === linkedId)} canEdit={canEdit} busy={busy} onUnlink={() => void run(null)} />;
  } else if (!canEdit) {
    body = <p className="text-sm text-slate-600">{t('builderBusiness.notLinked', 'Not linked to a Business Directory company.')}</p>;
  } else if (isLoading) {
    body = <div aria-busy="true" className="h-11 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />;
  } else if (error) {
    body = (
      <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
        {t('builderBusiness.loadError', 'Your businesses could not be loaded.')}
        <button type="button" onClick={() => void refetch()} className={`${BTN} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>
          <SoftIcon name="refresh" className="h-5 w-5" />
          {t('explorer.showcase.retry', 'Try again')}
        </button>
      </div>
    );
  } else if (live.length === 0) {
    body = (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{t('builderBusiness.none', 'You have no company in the Business Directory yet. Add it once and link it to all your residences.')}</p>
        <button type="button" onClick={() => navigate(paths.businessListingNew())} className={`${BTN} bg-slate-900 text-white hover:bg-slate-800`}>
          <SoftIcon name="plus" className="h-5 w-5" />
          {t('builderBusiness.add', 'Add your company')}
        </button>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <FormSelect
            label={t('builderBusiness.pick', 'Your company')}
            options={live.map((l) => ({ value: l.id, label: [l.name, l.city].filter(Boolean).join(' · ') }))}
            value={picked}
            onChange={(e) => setChoice(e.target.value)}
            disabled={busy}
          />
        </div>
        <button type="button" onClick={() => void run(picked)} disabled={busy || !picked} className={`${BTN} bg-primary text-white hover:bg-primary/90`}>
          {t('builderBusiness.link', 'Link company')}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-3 flex items-center gap-3">
        <SoftIcon name="store" className="h-9 w-9 shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{t('builderBusiness.title', 'Company in the Business Directory')}</h3>
          <p className="text-xs text-slate-600">{t('builderBusiness.intro', 'Linked, buyers see its details and page; its page lists this residence. Only companies you own can be linked.')}</p>
        </div>
      </div>
      {body}
      {failure && <p role="alert" className="mt-2 text-sm text-red-600">{failure}</p>}
    </div>
  );
};
