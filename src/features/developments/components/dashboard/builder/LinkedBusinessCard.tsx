import React from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { SoftIcon } from '@/src/shared/illustrations';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';

interface LinkedBusinessCardProps {
  /** The linked business when it is one of the user's (a teammate may have linked theirs). */
  business?: BusinessListing;
  canEdit: boolean;
  busy: boolean;
  onUnlink: () => void;
}

const BTN = 'inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60';

/** The company the builder is linked to: its logo and name, its directory page, and Unlink. */
export const LinkedBusinessCard: React.FC<LinkedBusinessCardProps> = ({ business, canEdit, busy, onUnlink }) => {
  const { t } = useTranslation('developments');
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      {business?.logoUrl ? (
        <img src={optimizeImageUrl(business.logoUrl, { width: 96, height: 96 })} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain ring-1 ring-slate-200" />
      ) : (
        <SoftIcon name="building" className="h-12 w-12 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{business?.name ?? t('builderBusiness.linkedOther', 'A linked company')}</p>
        <p className="text-xs text-emerald-700">{t('builderBusiness.linked', 'Linked: buyers see its Business Directory details')}</p>
        {!business?.isActive && business && <p className="text-xs text-amber-700">{t('builderBusiness.inactive', 'It is not live in the directory, so buyers see the fields below for now.')}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {business && (
          <button type="button" onClick={() => navigate(paths.businessListing(business.slug || business.id))} className={`${BTN} border border-slate-200 bg-white text-slate-800 hover:border-primary/40`}>
            {t('builderBusiness.view', 'View its page')}
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={onUnlink} disabled={busy} className={`${BTN} text-red-700 hover:bg-red-50`}>
            {t('builderBusiness.unlink', 'Unlink')}
          </button>
        )}
      </div>
    </div>
  );
};
