import React, { useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, User, UserCircle } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import NotificationCenter from '../NotificationCenter';

interface HeaderProps {
  onToggleSidebar: () => void;
  isFloating?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isFloating }) => {
  const { t } = useTranslation(['nav']);
  const { state, dispatch } = useAppContext();
  const { isAuthenticated, currentUser } = state;

  const handleAccountClick = useCallback(() => {
    if (isAuthenticated) {
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
      window.history.pushState({}, '', '/account');
    } else {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
    }
  }, [isAuthenticated, dispatch]);

  const handleNewListingClick = useCallback(() => {
    if (isAuthenticated) {
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
      window.history.pushState({}, '', '/create-listing');
    } else {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
    }
  }, [isAuthenticated, dispatch]);

  const handleSubscribeClick = useCallback(() => {
    dispatch({ type: 'TOGGLE_SUBSCRIPTION_MODAL', payload: { isOpen: true } });
  }, [dispatch]);

  const AuthButton: React.FC<{ floating?: boolean }> = ({ floating }) => {
    if (isAuthenticated && currentUser) {
      return (
        <button
          onClick={handleAccountClick}
          className={`flex items-center space-x-2 font-semibold transition-colors py-1.5 px-2.5 rounded-full whitespace-nowrap ${
            floating
              ? 'text-neutral-700 bg-white hover:bg-neutral-100'
              : 'text-neutral-600 hover:text-primary hover:bg-neutral-100'
          }`}
        >
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt="User Avatar"
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <UserCircle className="w-7 h-7" />
          )}
          <span className="hidden sm:inline text-sm">{t('nav:myAccount')}</span>
        </button>
      );
    }
    return (
      <button
        onClick={handleAccountClick}
        className={`flex items-center space-x-2 font-semibold transition-colors py-1.5 px-2.5 rounded-full whitespace-nowrap ${
          floating
            ? 'text-neutral-700 bg-white hover:bg-neutral-100'
            : 'text-neutral-600 hover:text-primary hover:bg-neutral-100'
        }`}
      >
        <User className="w-5 h-5" />
        <span className="hidden sm:inline text-sm">{t('nav:loginRegister')}</span>
      </button>
    );
  };

  if (isFloating) {
    return (
      <header className="absolute top-0 right-0 z-[1001] p-3">
        <nav className="flex items-center space-x-2 sm:space-x-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-md">
          <button
            onClick={handleSubscribeClick}
            className="bg-primary text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm font-semibold hover:bg-primary-dark transition-all shadow-sm hover:shadow-md whitespace-nowrap"
            aria-label={t('nav:subscribe')}
          >
            {t('nav:subscribe')}
          </button>
          <button
            onClick={handleNewListingClick}
            className="bg-secondary text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm font-semibold hover:bg-opacity-90 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
            aria-label={t('nav:newListing')}
          >
            + {t('nav:newListing')}
          </button>
          <NotificationCenter />
          <AuthButton floating />
        </nav>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-20 flex-shrink-0">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center">
            <button
              onClick={onToggleSidebar}
              className="md:hidden text-neutral-600 hover:text-primary p-1.5 -ml-1.5"
              aria-label="Toggle sidebar navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex justify-end items-center space-x-2 sm:space-x-3">
            <button
              onClick={handleSubscribeClick}
              className="bg-primary text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm font-semibold hover:bg-primary-dark transition-all shadow-sm hover:shadow-md whitespace-nowrap"
              aria-label={t('nav:subscribe')}
            >
              {t('nav:subscribe')}
            </button>
            <button
              onClick={handleNewListingClick}
              className="bg-secondary text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm font-semibold hover:bg-opacity-90 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
              aria-label={t('nav:newListing')}
            >
              + {t('nav:newListing')}
            </button>
            <NotificationCenter />
            <AuthButton />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default memo(Header);
