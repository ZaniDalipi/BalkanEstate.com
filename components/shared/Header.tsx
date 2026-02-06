import React, { useCallback, memo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { UserIcon, Bars3Icon, UserCircleIcon } from '../../constants';
import { UserRole } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';

// Lazy load NotificationCenter - only needed for authenticated users
const NotificationCenter = lazy(() => import('@/src/shared/components/NotificationCenter'));

interface HeaderProps {
    onToggleSidebar: () => void;
    isFloating?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isFloating }) => {
  const { t } = useTranslation(['nav']);
  const { state, dispatch } = useAppContext();
  const { isAuthenticated, currentUser, activeView } = state;
  const { getLocalizedPath } = useLocalizedNavigation();

  // Center floating header only on property details page
  const isPropertyDetails = activeView === 'property-details';

  const handleAccountClick = useCallback(() => {
    if (isAuthenticated) {
        // Clear any selected items before navigating
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
        // Update URL with language prefix
        window.history.pushState({}, '', getLocalizedPath('/account'));
    } else {
        dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
    }
  }, [isAuthenticated, dispatch, getLocalizedPath]);

  const handleNewListingClick = useCallback(() => {
    if (isAuthenticated) {
        // Clear any selected items before navigating
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
        // Update URL with language prefix
        window.history.pushState({}, '', getLocalizedPath('/create-listing'));
    } else {
        dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
    }
  }, [isAuthenticated, dispatch, getLocalizedPath]);

  const handleSubscribeClick = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
    window.history.pushState({}, '', getLocalizedPath('/subscribe'));
  }, [dispatch, getLocalizedPath]);

  const AuthButton: React.FC<{ floating?: boolean }> = ({ floating }) => {
    if (isAuthenticated && currentUser) {
      return (
        <button
          onClick={handleAccountClick}
          className={`flex items-center space-x-2 font-semibold transition-colors py-1.5 px-2.5 rounded-full whitespace-nowrap ${floating ? 'text-neutral-700 bg-white hover:bg-neutral-100' : 'text-neutral-600 hover:text-primary hover:bg-neutral-100'}`}
        >
            {currentUser.avatarUrl ? (
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                <img src={currentUser.avatarUrl} alt="User Avatar" className="w-full h-full rounded-full object-cover"/>
              </div>
            ) : (
              <UserCircleIcon className="w-7 h-7 flex-shrink-0" />
            )}
            <span className="hidden sm:inline text-sm">{t('nav:myAccount')}</span>
        </button>
      );
    }
    return (
      <button
        onClick={handleAccountClick}
        className={`flex items-center space-x-2 font-semibold transition-colors py-1.5 px-2.5 rounded-full whitespace-nowrap ${floating ? 'text-neutral-700 bg-white hover:bg-neutral-100' : 'text-neutral-600 hover:text-primary hover:bg-neutral-100'}`}
      >
          <UserIcon className="w-5 h-5" />
          <span className="hidden sm:inline text-sm">{t('nav:loginRegister')}</span>
      </button>
    );
  };
  
  if (isFloating) {
    // Centered on property details, top-right on other pages
    const headerPositionClass = isPropertyDetails
      ? 'fixed top-2 left-1/2 -translate-x-1/2 z-[1001]'
      : 'fixed top-2 right-3 z-[1001]';

    return (
      <header className={headerPositionClass}>
        <nav className="flex items-center space-x-1.5 md:space-x-2 xl:space-x-3 bg-white/90 backdrop-blur-md p-1 md:p-1.5 rounded-full shadow-lg border border-neutral-200/50">
          <button
            onClick={handleSubscribeClick}
            className="bg-primary text-white px-2.5 py-1.5 md:px-3 xl:px-4 xl:py-2 rounded-full text-xs xl:text-sm font-semibold hover:bg-primary-dark transition-all shadow-sm hover:shadow-md whitespace-nowrap"
            aria-label={t('nav:subscribe')}
          >
              {t('nav:subscribe')}
          </button>
          <button
            onClick={handleNewListingClick}
            className="bg-secondary text-white px-2.5 py-1.5 md:px-3 xl:px-4 xl:py-2 rounded-full text-xs xl:text-sm font-semibold hover:bg-opacity-90 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
            aria-label={t('nav:newListing')}
          >
              <span className="md:hidden xl:inline">+ {t('nav:newListing')}</span>
              <span className="hidden md:inline xl:hidden">+ New</span>
          </button>
          <AuthButton floating />
          {isAuthenticated && (
            <Suspense fallback={null}>
              <NotificationCenter />
            </Suspense>
          )}
        </nav>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-20 flex-shrink-0">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center">
             <button onClick={onToggleSidebar} className="md:hidden text-neutral-600 hover:text-primary p-1.5 -ml-1.5" aria-label="Toggle sidebar navigation">
                 <Bars3Icon className="w-5 h-5"/>
             </button>
             <div className="hidden md:block">
                {/* Placeholder for potential future elements like a global search */}
             </div>
          </div>

          <nav className="flex justify-end items-center space-x-1.5 md:space-x-2 xl:space-x-3">
            <button
              onClick={handleSubscribeClick}
              className="bg-primary text-white px-2.5 py-1.5 md:px-3 xl:px-4 xl:py-2 rounded-full text-xs xl:text-sm font-semibold hover:bg-primary-dark transition-all shadow-sm hover:shadow-md whitespace-nowrap"
              aria-label={t('nav:subscribe')}
            >
                {t('nav:subscribe')}
            </button>
            <button
              onClick={handleNewListingClick}
              className="bg-secondary text-white px-2.5 py-1.5 md:px-3 xl:px-4 xl:py-2 rounded-full text-xs xl:text-sm font-semibold hover:bg-opacity-90 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
              aria-label={t('nav:newListing')}
            >
                <span className="md:hidden lg:inline">+ {t('nav:newListing')}</span>
                <span className="hidden md:inline lg:hidden">+ New</span>
            </button>
            <AuthButton />
            {isAuthenticated && (
              <Suspense fallback={null}>
                <NotificationCenter />
              </Suspense>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default memo(Header);