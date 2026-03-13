import React, { useCallback, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, User } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useNavigationDirection } from '@/src/components/ui/ViewTransition';
import NotificationCenter from '../NotificationCenter';
import UserAvatar from '@/components/shared/UserAvatar';

interface HeaderProps {
  onToggleSidebar: () => void;
  isFloating?: boolean;
}

const authBaseClasses = `
  flex items-center justify-center gap-2 font-semibold transition-all
  min-h-[44px] px-3 sm:px-4 rounded-full whitespace-nowrap
  touch-manipulation select-none
  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50
`;

const glassAuthStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(245,245,247,0.85))',
  boxShadow: '0 4px 6px rgba(0,0,0,0.08), 0 0 15px rgba(0,0,0,0.04), inset 2px 2px 1px 0 rgba(255,255,255,0.6), inset -1px -1px 1px 1px rgba(255,255,255,0.4)',
  transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 2.2)',
};

const authButtonClassName = `${authBaseClasses} relative overflow-hidden backdrop-blur-md text-neutral-700 border border-white/40 hover:-translate-y-px hover:brightness-105`;

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isFloating }) => {
  const { t } = useTranslation(['nav']);
  const { state, dispatch } = useAppContext();
  const { setDirection } = useNavigationDirection();
  const { isAuthenticated, currentUser } = state;

  const handleAccountClick = useCallback(() => {
    if (isAuthenticated) {
      setDirection('morph');
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
      window.history.pushState({}, '', '/account');
    } else {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
    }
  }, [isAuthenticated, dispatch, setDirection]);

  const handleNewListingClick = useCallback(() => {
    if (isAuthenticated) {
      setDirection('morph');
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
      window.history.pushState({}, '', '/create-listing');
    } else {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
    }
  }, [isAuthenticated, dispatch, setDirection]);

  const handleSubscribeClick = useCallback(() => {
    setDirection('forward');
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
    const currentLang = window.location.pathname.split('/')[1] || 'en';
    const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
    const lang = validLangs.includes(currentLang) ? currentLang : 'en';
    window.history.pushState({}, '', `/${lang}/subscribe`);
  }, [dispatch, setDirection]);

  // Inline auth button JSX - NOT defined as a component to avoid remount on every render
  const authButtonContent = useMemo(() => {
    if (isAuthenticated && currentUser) {
      return (
        <button
          onClick={handleAccountClick}
          className={authButtonClassName}
          style={glassAuthStyle}
          aria-label={t('nav:myAccount')}
        >
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
            <UserAvatar src={currentUser.avatarUrl} gender={currentUser.gender} seed={currentUser.id || currentUser.name} avatarOptions={currentUser.avatarOptions} />
          </div>
          <span className="relative z-10 hidden sm:inline text-sm">{t('nav:myAccount')}</span>
        </button>
      );
    }
    return (
      <button
        onClick={handleAccountClick}
        className={authButtonClassName}
        style={glassAuthStyle}
        aria-label={t('nav:loginRegister')}
      >
        <div className="absolute inset-0 z-0 rounded-[inherit]" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <User className="relative z-10 w-5 h-5" aria-hidden="true" />
        <span className="relative z-10 hidden sm:inline text-sm">{t('nav:loginRegister')}</span>
      </button>
    );
  }, [isAuthenticated, currentUser, handleAccountClick, t]);

  if (isFloating) {
    return (
      <header className="absolute top-0 right-0 z-[1001] p-2 sm:p-3 landscape:p-2" role="banner">
        <nav
          className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 bg-white/70 backdrop-blur-xl p-1.5 rounded-full shadow-xl shadow-black/10 border border-white/30"
          role="navigation"
          aria-label={t('nav:mainNavigation', 'Main navigation')}
        >
          <button
            onClick={handleSubscribeClick}
            className="min-h-[40px] sm:min-h-[44px] bg-gradient-to-r from-primary to-primary-dark text-white px-3 py-2 sm:px-4 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all shadow-md whitespace-nowrap touch-manipulation select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 active:scale-[0.98]"
            aria-label={t('nav:subscribe')}
          >
            <span className="hidden xs:inline">{t('nav:subscribe')}</span>
            <span className="xs:hidden">PRO</span>
          </button>
          <button
            onClick={handleNewListingClick}
            className="hidden sm:flex min-h-[40px] sm:min-h-[44px] bg-gradient-to-r from-secondary to-orange-400 text-white px-3 py-2 sm:px-4 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-secondary/30 transition-all shadow-md whitespace-nowrap touch-manipulation select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-secondary/50 active:scale-[0.98] items-center"
            aria-label={t('nav:newListing')}
          >
            + {t('nav:newListing')}
          </button>
          <NotificationCenter />
          {authButtonContent}
        </nav>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-20 flex-shrink-0" role="banner">
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center py-1.5 sm:py-2 landscape:py-1">
          <div className="flex items-center">
            <button
              onClick={onToggleSidebar}
              className="md:hidden text-neutral-600 hover:text-primary min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 rounded-lg hover:bg-neutral-100 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={t('nav:toggleSidebar', 'Toggle sidebar navigation')}
              aria-expanded="false"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <nav
            className="flex justify-end items-center gap-1.5 sm:gap-2 lg:gap-3"
            role="navigation"
            aria-label={t('nav:mainNavigation', 'Main navigation')}
          >
            <button
              onClick={handleSubscribeClick}
              className="min-h-[40px] sm:min-h-[44px] bg-primary text-white px-3 py-2 sm:px-4 rounded-full text-sm font-semibold hover:bg-primary-dark transition-all shadow-sm hover:shadow-md whitespace-nowrap touch-manipulation select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 active:bg-primary-dark"
              aria-label={t('nav:subscribe')}
            >
              {t('nav:subscribe')}
            </button>
            <button
              onClick={handleNewListingClick}
              className="min-h-[40px] sm:min-h-[44px] bg-secondary text-white px-3 py-2 sm:px-4 rounded-full text-sm font-semibold hover:bg-orange-600 transition-all shadow-sm hover:shadow-md whitespace-nowrap touch-manipulation select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-secondary/50 active:bg-orange-600"
              aria-label={t('nav:newListing')}
            >
              <span className="hidden sm:inline">+ {t('nav:newListing')}</span>
              <span className="sm:hidden">+ {t('nav:sell', 'Sell')}</span>
            </button>
            <NotificationCenter />
            {authButtonContent}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default memo(Header);
