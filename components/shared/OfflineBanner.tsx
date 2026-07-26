import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';

/**
 * A slim banner shown when the app is running from cached data with no network.
 *
 * It reassures the user that the app still works offline and that they're looking
 * at the properties/searches they saved before. It disappears automatically the
 * moment connectivity returns (see the online/offline handling in AppContext).
 */
const OfflineBanner: React.FC = () => {
  const { t } = useTranslation(['common']);
  const { state } = useAppContext();

  if (!state.isOfflineMode) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex-shrink-0 flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-medium px-4 py-2 z-30"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) * 0.5)' }}
    >
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728m9.9 2.829a5 5 0 010 7.07m-7.07 0a5 5 0 010-7.07M12 12h.01M3 3l18 18"
        />
      </svg>
      <span>
        {t('common:offline.banner', "You're offline — showing your saved items")}
      </span>
    </div>
  );
};

export default OfflineBanner;
