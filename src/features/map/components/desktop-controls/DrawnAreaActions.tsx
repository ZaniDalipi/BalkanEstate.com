import React from 'react';
import { useTranslation } from 'react-i18next';
import { SearchPlusIcon } from '@/constants';
import XmarkIcon from '@/src/components/ui/XmarkIcon';

export interface DrawnAreaActionsProps {
  isAuthenticated: boolean;
  isSaving: boolean;
  onSaveSearch: () => void;
  onClear: () => void;
}

/** Save / Clear for a drawn area, on liquid glass under the layer dock. */
const DrawnAreaActions: React.FC<DrawnAreaActionsProps> = ({ isAuthenticated, isSaving, onSaveSearch, onClear }) => {
  const { t } = useTranslation('search');
  return (
    <div className="thumb-glass relative flex items-center gap-2 rounded-full p-1.5 animate-fade-in">
      {isAuthenticated && (
        <button
          type="button"
          onClick={onSaveSearch}
          disabled={isSaving}
          className="flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-blue-600 px-4 text-xs font-semibold text-white shadow-md transition-shadow hover:shadow-lg disabled:opacity-50"
          aria-busy={isSaving}
        >
          <SearchPlusIcon className="h-4 w-4" />
          <span>{isSaving ? t('map.saving') : t('map.saveArea')}</span>
        </button>
      )}
      <button
        type="button"
        onClick={onClear}
        className="flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-rose-600 px-4 text-xs font-semibold text-white shadow-md transition-shadow hover:shadow-lg"
      >
        <XmarkIcon className="h-3.5 w-3.5" strokeWidth={3} />
        <span>{t('map.clearArea')}</span>
      </button>
    </div>
  );
};

export default DrawnAreaActions;
