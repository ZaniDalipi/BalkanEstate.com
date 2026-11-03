import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { useAppContext } from '@/context/AppContext';
import NotificationCenter from '@/shared/components/NotificationCenter';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';

const PILL = 'hidden min-h-[40px] items-center rounded-full px-3.5 text-[13px] font-semibold transition';

/** The app-wide actions every profile header carries: subscribe, new listing, notifications, account. */
export const TopBarAccountActions: React.FC = () => {
  const { t } = useTranslation('nav');
  const { state, dispatch } = useAppContext();
  const user = state.isAuthenticated ? state.currentUser : null;
  const openAuth = (view: 'login' | 'signup') => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view } });

  return (
    <>
      <button type="button" onClick={() => navigate(paths.pricing())} className={`${PILL} bg-primary/10 text-primary hover:bg-primary/15 lg:inline-flex`}>
        {t('subscribe')}
      </button>
      <button
        type="button"
        onClick={() => (user ? navigate(paths.createListing()) : openAuth('signup'))}
        className={`${PILL} bg-secondary/15 text-amber-700 hover:bg-secondary/25 xl:inline-flex`}
      >
        + {t('newListing')}
      </button>
      <NotificationCenter />
      <button
        type="button"
        onClick={() => (user ? navigate(paths.account()) : openAuth('login'))}
        aria-label={user ? t('myAccount') : t('loginRegister')}
        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/60 text-neutral-700 ring-1 ring-black/[0.06] transition hover:bg-white"
      >
        {user ? (
          <span className="h-8 w-8 overflow-hidden rounded-full">
            {user.avatarUrl ? (
              <img src={optimizeImageUrl(user.avatarUrl, { width: 64 }) || user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <DefaultAvatar gender={user.gender} seed={user.id || user.name} avatarOptions={user.avatarOptions} />
            )}
          </span>
        ) : (
          <User className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </>
  );
};
