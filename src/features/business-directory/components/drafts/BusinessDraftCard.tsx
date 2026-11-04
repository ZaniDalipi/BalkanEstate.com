import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import type { BusinessDraftSummary } from '../../utils/businessDrafts';

interface BusinessDraftCardProps {
  draft: BusinessDraftSummary;
  onContinue: () => void;
  onDiscard: () => void;
}

const formatDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** A new business that was started on this device but not published yet. */
const BusinessDraftCard: React.FC<BusinessDraftCardProps> = ({ draft, onContinue, onDiscard }) => {
  const { t } = useTranslation('businessDirectory');
  const name = draft.name || t('myBusinesses.drafts.untitled', 'Untitled business');
  const place = [draft.city, draft.country].filter(Boolean).join(', ');

  return (
    <article className="bg-white rounded-2xl border-2 border-dashed border-amber-300 p-4 flex flex-col gap-3" aria-label={name}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
          <SoftIcon name="pencil" className="w-7 h-7" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 mb-1">
            {t('myBusinesses.drafts.badge', 'Draft')}
          </span>
          <h4 className={`font-bold truncate ${draft.name ? 'text-neutral-900' : 'text-neutral-500 italic'}`}>{name}</h4>
          <p className="text-xs text-neutral-500 truncate">
            {[draft.category ? t(`categories.${draft.category}`) : '', place].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        {t('myBusinesses.drafts.savedAt', { date: formatDate(draft.savedAt), defaultValue: 'Saved on this device on {{date}}' })}
        {' · '}
        {t('myBusinesses.drafts.keptUntil', { date: formatDate(draft.expiresAt), defaultValue: 'kept until {{date}}' })}
      </p>
      <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
        <button
          type="button"
          onClick={onContinue}
          className="flex-1 min-h-[44px] px-3 py-2 bg-gradient-to-r from-primary to-blue-600 text-white text-sm font-semibold rounded-xl hover:shadow-md transition-all"
        >
          {t('myBusinesses.drafts.continue', 'Continue')}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="min-h-[44px] px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-colors"
        >
          {t('myBusinesses.drafts.discard', 'Discard')}
        </button>
      </div>
    </article>
  );
};

export default BusinessDraftCard;
