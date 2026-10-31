import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';

// Only signed-in users have notifications, so the bell loads on demand.
const NotificationCenter = lazy(() => import('@/src/shared/components/NotificationCenter'));

interface MobileTopBarActionsProps {
  isAuthenticated: boolean;
}

/** Right side of the phone top bar: the notification bell (signed in) and the home shortcut. */
export const MobileTopBarActions: React.FC<MobileTopBarActionsProps> = ({ isAuthenticated }) => {
  const { t } = useTranslation(['common']);
  return (
    <div className="flex items-center justify-end pr-1">
      {isAuthenticated && (
        <Suspense fallback={<span className="w-11" aria-hidden="true" />}>
          <NotificationCenter />
        </Suspense>
      )}
      <button
        type="button"
        onClick={() => navigate(paths.home())}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-500 active:text-primary active:opacity-70 transition-opacity"
        aria-label={t('common:aria.goHome', 'Go to home')}
      >
        <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      </button>
    </div>
  );
};
