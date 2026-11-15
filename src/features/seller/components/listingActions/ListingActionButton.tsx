import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import type { ListingAction } from '../../utils/listingActions';
import { LISTING_ACTION_BASE, LISTING_ACTION_BLOCKED, LISTING_ACTION_TONES } from './listingActionStyles';

interface ListingActionButtonProps {
  action: ListingAction;
  /** Id of the reason text shown under the bar, when this action is blocked. */
  reasonId?: string;
  onPress: (action: ListingAction) => void;
}

/** One action of a listing card: same size as its siblings, icon + label. */
export const ListingActionButton: React.FC<ListingActionButtonProps> = ({ action, reasonId, onPress }) => {
  const { t } = useTranslation(['seller', 'rental', 'account']);
  const label = t(action.label.key, action.label.defaultValue, action.label.values);
  const hint = action.blocked
    ? t(action.blocked.key, action.blocked.defaultValue, action.blocked.values)
    : t(action.hint.key, action.hint.defaultValue, action.hint.values);

  return (
    <button
      type="button"
      data-action={action.id}
      title={hint}
      aria-disabled={action.blocked ? true : undefined}
      aria-describedby={action.blocked ? reasonId : undefined}
      onClick={(e) => { e.stopPropagation(); onPress(action); }}
      className={`${LISTING_ACTION_BASE} ${LISTING_ACTION_TONES[action.tone]} ${action.blocked ? LISTING_ACTION_BLOCKED : ''}`}
    >
      <SoftIcon name={action.icon} className="h-5 w-5 shrink-0 motion-safe:transition-transform motion-safe:group-hover:scale-110" />
      <span className="line-clamp-2 min-w-0 text-center break-words">{label}</span>
    </button>
  );
};
