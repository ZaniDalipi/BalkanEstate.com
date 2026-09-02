import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, Loader2 } from 'lucide-react';

export interface SaveCityButtonProps {
  cityName: string;
  isSaved: boolean;
  /** False when nobody is signed in — the control explains itself instead of failing. */
  canSave: boolean;
  isPending: boolean;
  onToggle: () => void;
}

/**
 * Follow / unfollow control on a city card.
 *
 * Presentational: it renders the state it is given and reports intent. The
 * card sits inside a clickable tile, so the click is stopped here rather than
 * relying on every caller to remember.
 */
const SaveCityButton: React.FC<SaveCityButtonProps> = ({
  cityName, isSaved, canSave, isPending, onToggle,
}) => {
  const { t } = useTranslation(['exploreCities']);

  const label = !canSave
    ? t('saved.signInToSave', 'Sign in to follow cities')
    : isSaved
      ? t('saved.unfollowCity', 'Stop following {{city}}', { city: cityName })
      : t('saved.followCity', 'Follow {{city}} for market updates', { city: cityName });

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={isSaved}
      disabled={isPending}
      onClick={event => {
        event.stopPropagation();
        onToggle();
      }}
      className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-60 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-white/70 ${
        isSaved
          ? 'bg-primary text-white hover:bg-primary-dark'
          : 'bg-white/90 text-neutral-600 hover:bg-white hover:text-primary'
      }`}
    >
      {isPending
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />}
    </button>
  );
};

export default SaveCityButton;
