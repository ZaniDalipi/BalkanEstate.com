import React, { useCallback, memo, lazy, Suspense, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Bars3Icon } from '../../constants';
import { NavPicture } from '@/src/shared/illustrations';
import { UserRole } from '../../types';
import { useAppContext } from '../../context/AppContext';
import UserAvatar from './UserAvatar';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { useShortLandscape } from '@/src/hooks/useMediaQuery';
import { useHideOnScroll } from '@/src/shared/hooks/useHideOnScroll';

// Lazy load NotificationCenter - only needed for authenticated users
const NotificationCenter = lazy(() => import('@/src/shared/components/NotificationCenter'));

interface HeaderProps {
    onToggleSidebar: () => void;
    isFloating?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isFloating }) => {
  const { t } = useTranslation(['nav']);
  const { state, dispatch } = useAppContext();
  const { isAuthenticated, currentUser } = state;
  // A phone turned sideways gets the desktop layout with ~400px of height:
  // the floating bar shrinks and slides away while the page scrolls down.
  const isShortLandscape = useShortLandscape();
  const isHiddenByScroll = useHideOnScroll(Boolean(isFloating) && isShortLandscape);

  // Publish how much of the top-right corner the floating bar takes, as
  // --floating-header-w on <html>, so other floating chrome (the search pills
  // on Search / Rentals / Villas) can stop short of it instead of sliding
  // underneath and losing its buttons. 0 whenever this bar isn't on screen.
  const floatingRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = floatingRef.current;
    if (!isFloating || !el) {
      root.style.setProperty('--floating-header-w', '0px');
      return;
    }
    const publish = () => {
      const r = el.getBoundingClientRect();
      // Its width plus its gap from the right edge plus a small breathing gap.
      const taken = Math.max(0, Math.round(window.innerWidth - r.left + 8));
      root.style.setProperty('--floating-header-w', `${taken}px`);
    };
    publish();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publish) : null;
    ro?.observe(el);
    window.addEventListener('resize', publish);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', publish);
      root.style.setProperty('--floating-header-w', '0px');
    };
  }, [isFloating]);

  const handleAccountClick = useCallback(() => {
    if (isAuthenticated) {
        // Clear any selected items before navigating
        // Update URL with language prefix
        navigate(paths.account());
    } else {
        dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
    }
  }, [isAuthenticated, dispatch]);

  const handleNewListingClick = useCallback(() => {
    if (isAuthenticated) {
        // Clear any selected items before navigating
        // Update URL with language prefix
        navigate(paths.createListing());
    } else {
        dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
    }
  }, [isAuthenticated, dispatch]);

  const handleSubscribeClick = useCallback(() => {
    navigate(paths.pricing());
  }, [dispatch]);

  const AuthButton: React.FC<{ floating?: boolean }> = ({ floating }) => {
    if (isAuthenticated && currentUser) {
      return (
        <button
          onClick={handleAccountClick}
          className="relative flex items-center space-x-2 landscape:space-x-0 font-semibold transition-all duration-700 py-1.5 px-2.5 landscape:p-1 rounded-full whitespace-nowrap overflow-hidden backdrop-blur-md text-neutral-700 border border-white/40 hover:-translate-y-px hover:brightness-105"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(245,245,247,0.85))',
            boxShadow: '0 4px 6px rgba(0,0,0,0.08), 0 0 15px rgba(0,0,0,0.04), inset 2px 2px 1px 0 rgba(255,255,255,0.6), inset -1px -1px 1px 1px rgba(255,255,255,0.4)',
            transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 2.2)',
          }}
        >
            <div className="w-7 h-7 landscape:w-6 landscape:h-6 rounded-full overflow-hidden flex-shrink-0">
              <UserAvatar src={currentUser.avatarUrl} gender={currentUser.gender} seed={currentUser.id || currentUser.name} avatarOptions={currentUser.avatarOptions} />
            </div>
            <span className="hidden sm:inline landscape:hidden text-sm">{t('nav:myAccount')}</span>
        </button>
      );
    }
    return (
      <button
        onClick={handleAccountClick}
        className="relative flex items-center space-x-2 landscape:space-x-0 font-semibold transition-all duration-700 py-1.5 px-2.5 landscape:p-1 rounded-full whitespace-nowrap overflow-hidden backdrop-blur-md text-neutral-700 border border-white/40 hover:-translate-y-px hover:brightness-105"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(245,245,247,0.85))',
          boxShadow: '0 4px 6px rgba(0,0,0,0.08), 0 0 15px rgba(0,0,0,0.04), inset 2px 2px 1px 0 rgba(255,255,255,0.6), inset -1px -1px 1px 1px rgba(255,255,255,0.4)',
          transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 2.2)',
        }}
      >
          <div className="absolute inset-0 z-0 rounded-[inherit]" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <NavPicture name="account" className="relative z-10 w-6 h-6 landscape:w-5 landscape:h-5" />
          <span className="relative z-10 hidden sm:inline landscape:hidden text-sm">{t('nav:loginRegister')}</span>
      </button>
    );
  };
  
  // Shared glass button styles
  const subscribeGlassStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(2,82,205,0.92), rgba(59,130,246,0.92))',
    boxShadow: '0 6px 6px rgba(2,82,205,0.25), 0 0 20px rgba(2,82,205,0.1), inset 2px 2px 1px 0 rgba(255,255,255,0.35), inset -1px -1px 1px 1px rgba(255,255,255,0.2)',
    transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 2.2)',
  };
  const newListingGlassStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(255,149,0,0.92), rgba(255,94,58,0.92))',
    boxShadow: '0 6px 6px rgba(255,149,0,0.25), 0 0 20px rgba(255,149,0,0.1), inset 2px 2px 1px 0 rgba(255,255,255,0.35), inset -1px -1px 1px 1px rgba(255,255,255,0.2)',
    transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 2.2)',
  };
  const glassButtonClasses = "relative overflow-hidden backdrop-blur-md text-white px-3 py-1.5 sm:px-3.5 sm:py-2 md:px-4 lg:px-5 lg:py-2.5 landscape:px-3 landscape:py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm landscape:text-xs font-semibold transition-all duration-700 hover:-translate-y-px hover:brightness-110 active:brightness-95 whitespace-nowrap border border-white/25";

  if (isFloating) {
    // Note: Header is hidden entirely on property details via App.tsx showHeader logic
    // PropertyDetailsPage has its own complete header with back, share, favorite, profile
    return (
      <header
        ref={floatingRef}
        className={`fixed z-[1001] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${isHiddenByScroll ? '-translate-y-[calc(100%+16px)] opacity-0 pointer-events-none' : ''}`}
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
        }}
      >
        <nav
          className="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 landscape:gap-1 bg-white/70 backdrop-blur-xl p-1 sm:p-1.5 landscape:p-1 rounded-full border border-white/40"
          style={{ boxShadow: '0 6px 6px rgba(0,0,0,0.12), 0 0 20px rgba(0,0,0,0.06), inset 2px 2px 1px 0 rgba(255,255,255,0.6), inset -1px -1px 1px 1px rgba(255,255,255,0.5)' }}
        >
          <button
            onClick={handleSubscribeClick}
            className={glassButtonClasses}
            style={subscribeGlassStyle}
            aria-label={t('nav:subscribe')}
          >
            <span className="relative z-10">{t('nav:subscribe')}</span>
            <div className="absolute inset-0 z-0 rounded-[inherit]" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </button>
          <button
            onClick={handleNewListingClick}
            className={glassButtonClasses}
            style={newListingGlassStyle}
            aria-label={t('nav:newListing')}
          >
            <span className="relative z-10 sm:hidden">+</span>
            <span className="relative z-10 hidden sm:inline lg:hidden landscape:inline">{t('common:ui.header.new', '+ New')}</span>
            <span className="relative z-10 hidden lg:inline landscape:hidden">+ {t('nav:newListing')}</span>
            <div className="absolute inset-0 z-0 rounded-[inherit]" style={{ background: 'rgba(255,255,255,0.15)' }} />
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
    <header
      className="bg-white shadow-sm sticky top-0 z-20 flex-shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center py-1.5 sm:py-2">
          <div className="flex items-center">
             <button onClick={onToggleSidebar} className="md:hidden text-neutral-600 hover:text-primary p-1.5 -ml-1.5" aria-label={t('common:ui.header.toggleSidebarNavigation', 'Toggle sidebar navigation')}>
                 <Bars3Icon className="w-5 h-5"/>
             </button>
             <div className="hidden md:block">
                {/* Placeholder for potential future elements like a global search */}
             </div>
          </div>

          <nav className="flex justify-end items-center gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3">
            <button
              onClick={handleSubscribeClick}
              className={glassButtonClasses}
              style={subscribeGlassStyle}
              aria-label={t('nav:subscribe')}
            >
              <span className="relative z-10">{t('nav:subscribe')}</span>
              <div className="absolute inset-0 z-0 rounded-[inherit]" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </button>
            <button
              onClick={handleNewListingClick}
              className={glassButtonClasses}
              style={newListingGlassStyle}
              aria-label={t('nav:newListing')}
            >
              <span className="relative z-10 sm:hidden">+</span>
              <span className="relative z-10 hidden sm:inline lg:hidden">{t('common:ui.header.new', '+ New')}</span>
              <span className="relative z-10 hidden lg:inline">+ {t('nav:newListing')}</span>
              <div className="absolute inset-0 z-0 rounded-[inherit]" style={{ background: 'rgba(255,255,255,0.15)' }} />
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