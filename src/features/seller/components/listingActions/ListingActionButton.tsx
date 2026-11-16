import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import type { ListingAction } from '../../utils/listingActions';
import {
  LISTING_ACTION_BASE, LISTING_ACTION_BLOCKED, LISTING_ACTION_LABEL, LISTING_ACTION_SPAN,
  LISTING_ACTION_SPINNER, LISTING_ACTION_TONES, LISTING_ACTION_WAITING,
} from './listingActionStyles';

/** `working`: this action is running. `waiting`: another action of the card is. */
export type ListingActionButtonState = 'ready' | 'working' | 'waiting';

interface ListingActionButtonProps {
  action: ListingAction;
  /** Id of the reason text shown under the bar, when this action is blocked. */
  reasonId?: string;
  /** Full row or half row on narrow cards. */
  span?: 'full' | 'half';
  state?: ListingActionButtonState;
  onPress: (action: ListingAction) => void;
}

/** One action of a listing card: same size as its siblings, icon + label. */
export const ListingActionButton: React.FC<ListingActionButtonProps> = ({
  action, reasonId, span = 'half', state = 'ready', onPress,
}) => {
  const { t } = useTranslation(['seller', 'rental', 'account']);
  const label = t(action.label.key, action.label.defaultValue, action.label.values);
  const hint = action.blocked
    ? t(action.blocked.key, action.blocked.defaultValue, action.blocked.values)
    : t(action.hint.key, action.hint.defaultValue, action.hint.values);
  const working = state === 'working';
  // Kept focusable (aria-disabled, not disabled) so focus stays on the button
  // the seller pressed and returns nowhere unexpected when the work is done.
  const inactive = Boolean(action.blocked) || state !== 'ready';
  const look = working ? '' : state === 'waiting' ? LISTING_ACTION_WAITING : action.blocked ? LISTING_ACTION_BLOCKED : '';

  return (
    <button
      type="button"
      data-action={action.id}
      data-state={state}
      title={hint}
      aria-disabled={inactive || undefined}
      aria-busy={working || undefined}
      aria-describedby={action.blocked ? reasonId : undefined}
      onClick={(e) => { e.stopPropagation(); onPress(action); }}
      className={`${LISTING_ACTION_BASE} ${LISTING_ACTION_SPAN[span]} ${LISTING_ACTION_TONES[action.tone]} ${look}`}
    >
      {working ? (
        <span className={LISTING_ACTION_SPINNER} aria-hidden="true" />
      ) : (
        <SoftIcon name={action.icon} className="h-5 w-5 shrink-0 motion-safe:transition-transform motion-safe:group-hover:scale-110" />
      )}
      <span className={LISTING_ACTION_LABEL}>{label}</span>
      {working && <span className="sr-only">{t('seller:myListings.actionWorking', 'Working…')}</span>}
    </button>
  );
};
