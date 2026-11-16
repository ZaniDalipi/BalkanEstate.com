import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listingActionSpan, type ListingAction, type ListingActionId } from '../../utils/listingActions';
import type { ListingFeedback } from '../../hooks/useListingTasks';
import type { ListingTaskId } from '../../utils/listingActionFeedback';
import { LISTING_ACTION_GRID } from './listingActionStyles';
import { ListingActionButton } from './ListingActionButton';
import { ListingActionNotice } from './ListingActionNotice';

interface ListingActionBarProps {
  actions: ListingAction[];
  onAction: (id: ListingActionId) => void;
  /** Opens the listing editor — offered when a blocked action needs a fix there. */
  onEdit: () => void;
  /** What this card is doing right now; its button shows a spinner and the rest wait. */
  pendingTask?: ListingTaskId | null;
  /** Result of the last action: a confirmation, or why it failed. */
  feedback?: ListingFeedback | null;
  onDismissFeedback?: () => void;
}

/**
 * The action row of a "My listings" card. Sized by the card, not the screen
 * (a container query): wide cards show every action as an equal tile in one
 * row; narrow cards put the main action on its own row and pair the rest, so
 * no row is left half empty. Every press gets an answer under the row: why a
 * blocked action can't run, a spinner while one works, then that it worked or
 * why it didn't.
 */
export const ListingActionBar: React.FC<ListingActionBarProps> = ({
  actions, onAction, onEdit, pendingTask = null, feedback = null, onDismissFeedback,
}) => {
  const { t } = useTranslation(['seller']);
  const reasonId = useId();
  const [explainedId, setExplainedId] = useState<ListingActionId | null>(null);
  // Derived, so the message disappears by itself once the action is usable.
  const explained = actions.find((a) => a.id === explainedId && a.blocked);
  const busy = pendingTask !== null;

  const press = (action: ListingAction) => {
    if (busy) return;
    if (action.blocked) {
      onDismissFeedback?.();
      setExplainedId(action.id);
      return;
    }
    setExplainedId(null);
    onAction(action.id);
  };

  return (
    <div className="@container mt-4">
      <div
        role="group"
        aria-label={t('seller:myListings.actionsLabel', 'Listing actions')}
        aria-busy={busy || undefined}
        className={LISTING_ACTION_GRID}
      >
        {actions.map((action, i) => (
          <ListingActionButton
            key={action.id}
            action={action}
            reasonId={reasonId}
            span={listingActionSpan(i, actions.length)}
            state={pendingTask === action.id ? 'working' : busy ? 'waiting' : 'ready'}
            onPress={press}
          />
        ))}
      </div>
      {explained?.blocked && !busy && (
        <ListingActionNotice
          id={reasonId}
          tone="info"
          message={t(explained.blocked.key, explained.blocked.defaultValue, explained.blocked.values)}
          action={explained.blocked.fix === 'edit'
            ? { label: t('seller:myListings.actionBlocked.addPhotos', 'Add photos'), onPress: onEdit }
            : undefined}
          onDismiss={() => setExplainedId(null)}
        />
      )}
      {feedback && !busy && !explained && (
        <ListingActionNotice
          tone={feedback.kind}
          message={t(feedback.text.key, feedback.text.defaultValue, feedback.text.values)}
          action={feedback.retry
            ? { label: t('seller:myListings.actionError.retry', 'Try again'), onPress: feedback.retry }
            : undefined}
          onDismiss={() => onDismissFeedback?.()}
        />
      )}
    </div>
  );
};
