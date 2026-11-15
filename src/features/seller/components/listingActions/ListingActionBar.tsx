import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { listingActionSpan, type ListingAction, type ListingActionId } from '../../utils/listingActions';
import { LISTING_ACTION_GRID } from './listingActionStyles';
import { ListingActionButton } from './ListingActionButton';

interface ListingActionBarProps {
  actions: ListingAction[];
  onAction: (id: ListingActionId) => void;
  /** Opens the listing editor — offered when a blocked action needs a fix there. */
  onEdit: () => void;
}

/**
 * The action row of a "My listings" card. Sized by the card, not the screen
 * (a container query): wide cards show every action as an equal tile in one
 * row; narrow cards put the main action on its own row and pair the rest, so
 * no row is left half empty. Pressing a blocked action
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
    <div className="@container mt-4">
      <div
        role="group"
        aria-label={t('seller:myListings.actionsLabel', 'Listing actions')}
        className={LISTING_ACTION_GRID}
      >
        {actions.map((action, i) => (
          <ListingActionButton
            key={action.id}
            action={action}
            reasonId={reasonId}
            span={listingActionSpan(i, actions.length)}
            onPress={press}
          />
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
              className="min-h-[44px] rounded-lg px-2 font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('seller:myListings.actionBlocked.addPhotos', 'Add photos')}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExplainedId(null); }}
            aria-label={t('seller:myListings.actionBlocked.dismiss', 'Dismiss')}
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <SoftIcon name="xmark" className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
