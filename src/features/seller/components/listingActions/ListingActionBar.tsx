import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import type { ListingAction, ListingActionId } from '../../utils/listingActions';
import { ListingActionButton } from './ListingActionButton';

interface ListingActionBarProps {
  actions: ListingAction[];
  onAction: (id: ListingActionId) => void;
  /** Opens the listing editor — offered when a blocked action needs a fix there. */
  onEdit: () => void;
}

/**
 * The action row of a "My listings" card. Buttons share one width and height
 * and wrap into as many equal columns as the card has room for, so the row
 * looks the same on phones, tablets and desktops. Pressing a blocked action
 * explains why next to the row instead of doing nothing.
 */
export const ListingActionBar: React.FC<ListingActionBarProps> = ({ actions, onAction, onEdit }) => {
  const { t } = useTranslation(['seller']);
  const reasonId = useId();
  const [explainedId, setExplainedId] = useState<ListingActionId | null>(null);
  // Derived, so the message disappears by itself once the action is usable.
  const explained = actions.find((a) => a.id === explainedId && a.blocked);

  const press = (action: ListingAction) => {
    if (action.blocked) { setExplainedId(action.id); return; }
    setExplainedId(null);
    onAction(action.id);
  };

  return (
    <div className="mt-4">
      <div
        role="group"
        aria-label={t('seller:myListings.actionsLabel', 'Listing actions')}
        className="grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(min(100%,8.25rem),1fr))] gap-2"
      >
        {actions.map((action) => (
          <ListingActionButton key={action.id} action={action} reasonId={reasonId} onPress={press} />
        ))}
      </div>
      {explained?.blocked && (
        <div
          id={reasonId}
          role="alert"
          className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          <SoftIcon name="info" className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {t(explained.blocked.key, explained.blocked.defaultValue, explained.blocked.values)}
          </span>
          {explained.blocked.fix === 'edit' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="min-h-11 rounded-lg px-2 font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('seller:myListings.actionBlocked.addPhotos', 'Add photos')}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExplainedId(null); }}
            aria-label={t('seller:myListings.actionBlocked.dismiss', 'Dismiss')}
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <SoftIcon name="xmark" className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
