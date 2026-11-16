import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';

export type ListingNoticeTone = 'info' | 'error' | 'success';

interface ListingActionNoticeProps {
  id?: string;
  tone: ListingNoticeTone;
  message: string;
  /** One follow-up the seller can take right away (retry, add photos). */
  action?: { label: string; onPress: () => void };
  onDismiss: () => void;
}

const TONES: Record<ListingNoticeTone, { box: string; hover: string; icon: SoftIconName }> = {
  info: { box: 'border-amber-200 bg-amber-50 text-amber-900', hover: 'hover:bg-amber-100', icon: 'info' },
  error: { box: 'border-red-200 bg-red-50 text-red-800', hover: 'hover:bg-red-100', icon: 'warning' },
  success: { box: 'border-green-200 bg-green-50 text-green-800', hover: 'hover:bg-green-100', icon: 'check' },
};

/**
 * The line under a card's action buttons: why an action can't run, that it
 * failed (with a way to retry), or that it worked. Errors and reasons are
 * announced at once; a confirmation waits its turn.
 */
export const ListingActionNotice: React.FC<ListingActionNoticeProps> = ({ id, tone, message, action, onDismiss }) => {
  const { t } = useTranslation(['seller']);
  const look = TONES[tone];

  return (
    <div
      id={id}
      role={tone === 'success' ? 'status' : 'alert'}
      data-tone={tone}
      onClick={(e) => e.stopPropagation()}
      className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border py-1 pl-3 pr-1 text-sm ${look.box}`}
    >
      <SoftIcon name={look.icon} className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 py-1.5">{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onPress}
          className="min-h-[44px] rounded-lg px-2 font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('seller:myListings.actionBlocked.dismiss', 'Dismiss')}
        className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${look.hover}`}
      >
        <SoftIcon name="xmark" className="h-4 w-4" />
      </button>
    </div>
  );
};
