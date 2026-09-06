import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { AppView, UserRole } from '../../types';
import { runPageTransition } from '@/app/navigation/pageTransition';
import { setNavigationDirection, type NavigationDirection } from '@/app/navigation/navHistory';
import { preloadView } from '@/app/navigation/routePreload';
import {
  AUTH_REQUIRED_VIEWS,
  directionFor,
  isNavigationNeeded,
  resolveRoute,
} from '@/app/navigation/sidebarNavigation';
import { createLogger } from '@/shared/utils/logger';
import { LogoIcon, AgentsIcon, SearchIcon, MagnifyingGlassPlusIcon, HeartIcon, EnvelopeIcon, UserCircleIcon, UsersIcon, ArrowLeftOnRectangleIcon, XMarkIcon, PencilIcon, StarIconSolid, BuildingOfficeIcon, BuildingStorefrontIcon, ShieldCheckIcon, SparklesIcon, ChartBarIcon, CurrencyDollarIcon, ChevronDownIcon, ChevronUpIcon, CalculatorIcon, WrenchScrewdriverIcon, InformationCircleIcon, RentIcon, HomeIcon, BookOpenIcon, LuxuryVillaIcon } from '../../constants';
import LanguageSwitcher from '../../src/components/LanguageSwitcher';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import UserAvatar from './UserAvatar';

const navLogger = createLogger('SidebarNav');

/**
 * Warm the chunk behind a destination as soon as the user shows intent.
 *
 * `pointerenter` covers a mouse on its way to the row; `pointerdown` covers a
 * finger, which is the case that matters — a tap holds for 80-200ms between
 * down and click, and that is the whole fetch for a chunk already in the HTTP
 * cache. The alternative is starting the fetch on click, where it lands inside
 * the page transition and gets captured as an empty frame.
 */
function preloadHandlers(view: AppView) {
  const warm = () => preloadView(view);
  return { onPointerEnter: warm, onPointerDown: warm, onFocus: warm };
}

const NavItem: React.FC<{
  view: AppView;
  label: string;
  icon: React.ReactNode;
  activeView: AppView;
  onClick: (view: AppView) => void;
  badge?: number;
}> = ({ view, label, icon, activeView, onClick, badge }) => {
  const isActive = view === activeView;
  return (
    <button
      onClick={() => onClick(view)}
      {...preloadHandlers(view)}
      aria-label={badge && badge > 0 ? `${label} (${badge} unread)` : label}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center gap-2.5 px-3 py-3 rounded-lg font-semibold transition-colors w-full text-left md:justify-center group-hover:md:justify-start relative min-h-[44px] ${
        isActive
          ? 'bg-primary-light text-primary-dark'
          : 'text-neutral-700 hover:bg-neutral-100'
      }`}
    >
      <div className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-neutral-700'} relative`} aria-hidden="true">
        {icon}
        {badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ring-2 ring-white shadow" aria-hidden="true">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{label}</span>
    </button>
  );
};

// Tools Section Component with expandable menu
const ToolsSection: React.FC<{
  activeView: AppView;
  onNavClick: (view: AppView) => void;
}> = ({ activeView, onNavClick }) => {
  const { t } = useTranslation(['nav']);
  const [isExpanded, setIsExpanded] = useState(false);

  const toolItems = [
    { view: 'valuation' as AppView, label: t('nav:valuation'), icon: <CurrencyDollarIcon /> },
    { view: 'mortgage-calculator' as AppView, label: t('nav:mortgageCalculator'), icon: <CalculatorIcon /> },
  ];

  const isToolActive = toolItems.some(item => item.view === activeView);

  return (
    <div className="mt-1">
      {/* Tools Header - Expandable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className={`flex items-center gap-2.5 px-3 py-3 rounded-lg font-semibold transition-colors w-full text-left md:justify-center group-hover:md:justify-start min-h-[44px] ${
          isToolActive ? 'bg-primary-light text-primary-dark' : 'text-neutral-700 hover:bg-neutral-100'
        }`}
      >
        <div className={`w-5 h-5 flex-shrink-0 ${isToolActive ? 'text-primary' : 'text-neutral-700'}`}>
          <WrenchScrewdriverIcon />
        </div>
        <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm flex-1">{t('nav:extras')}</span>
        <div className="md:hidden group-hover:md:block">
          {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </div>
      </button>

      {/* Expandable Items */}
      <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="pl-4 space-y-0.5 pt-0.5">
          {toolItems.map(item => (
            <button
              key={item.view}
              onClick={() => onNavClick(item.view)}
              {...preloadHandlers(item.view)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors w-full text-left md:justify-center group-hover:md:justify-start text-sm ${
                activeView === item.view
                  ? 'bg-primary-light text-primary-dark'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <div className={`w-4 h-4 flex-shrink-0 ${activeView === item.view ? 'text-primary' : 'text-neutral-600'}`}>
                {item.icon}
              </div>
              <span className="md:hidden group-hover:md:inline whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation(['nav', 'common', 'auth']);
    const { state, dispatch, logout } = useAppContext();
    const { activeView, isAuthenticated, currentUser, conversations } = state;
    const { getLocalizedPath } = useLocalizedNavigation();

    // Calculate total unread messages using the per-conversation unread count fields
    const totalUnreadCount = conversations.reduce((total, conversation) => {
        const isBuyer = String(conversation.buyerId) === String(currentUser?.id);
        const unread = isBuyer ? (conversation.buyerUnreadCount || 0) : (conversation.sellerUnreadCount || 0);
        return total + unread;
    }, 0);

    /**
     * Navigate to a sidebar destination.
     *
     * Everything a tap has to do happens in one place and in one order, which
     * is the whole point: the drawer used to dispatch, push a URL and close
     * itself as three independent things, so the new page committed on the
     * same frame that the drawer started sliding shut and the content behind
     * it started un-blurring. Three animations and a route change competing
     * for one frame is what "laggy" was.
     *
     * Now the view change and the drawer closing are handed to
     * `runPageTransition` together. The browser captures the screen as it is —
     * drawer open, old page behind it — runs the update, captures the result,
     * and animates between the two on the compositor: the page swishes across
     * while the drawer slides off it, both off the main thread, while React
     * commits underneath. Where the View Transitions API is missing, or the
     * user asked for reduced motion, `runPageTransition` simply calls the
     * update and the drawer closes with its own CSS transition exactly as
     * before.
     */
    const navigateTo = useCallback((
        view: AppView,
        options?: { direction?: NavigationDirection },
    ) => {
        if (AUTH_REQUIRED_VIEWS.has(view) && !isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
            onClose();
            return;
        }

        const route = resolveRoute(view);
        if (!route.isValid || !route.path) {
            // A destination with no route would be pushed to the URL as
            // `/undefined` and resolved to the not-found page — a dead end
            // dressed up as a navigation. Stay put instead.
            navLogger.error('Blocked navigation to a view with no route', { view, error: route.error });
            onClose();
            return;
        }

        // Tapping the entry you are already on: no history entry, no
        // transition against an identical page, just close the drawer.
        const needed = isNavigationNeeded(view, {
            activeView,
            hasSelectedProperty: !!state.selectedProperty,
            hasSelectedAgency: !!state.selectedAgencyId,
            hasSelectedAgent: !!state.selectedAgentId,
            hasSelectedBusinessListing: !!state.selectedBusinessListingId,
        });
        if (!needed) {
            onClose();
            return;
        }

        // Last chance to warm the chunk. Usually a no-op — the pointer that
        // pressed this row already started the fetch — but a keyboard
        // activation or a synthetic click never sent a pointer event.
        preloadView(view);

        const direction = options?.direction ?? directionFor(activeView, view);
        const localizedPath = getLocalizedPath(route.path);

        // Tell `ViewTransition` which way this arrival should move before the
        // navigation fires; it refines the choice once it knows which view
        // actually landed (a composer rises, a change of context dissolves).
        setNavigationDirection(direction);

        runPageTransition(direction, () => {
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });

            // On mobile/tablet, always open the property search on the map
            // first so users land on the map when navigating in from the
            // sidebar. The rentals view manages its own mobileView (defaults
            // to map).
            if (view === 'search') {
                dispatch({ type: 'UPDATE_SEARCH_PAGE_STATE', payload: { mobileView: 'map' } });
            }

            dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });

            try {
                window.history.pushState({}, '', localizedPath);
            } catch (error) {
                // pushState throws in a handful of real situations (a sandboxed
                // frame, a rate-limited burst). The view has already changed, so
                // losing the URL is a worse-but-working navigation, not a
                // failed one — never let it take the page down with it.
                navLogger.warn('Could not update the URL for a sidebar navigation', { path: localizedPath, error });
            }

            // Closed inside the update, not before it: the drawer has to still
            // be open when the browser captures the outgoing frame, or it
            // vanishes instead of sliding away.
            onClose();
        });
    }, [
        activeView,
        dispatch,
        getLocalizedPath,
        isAuthenticated,
        onClose,
        state.selectedAgencyId,
        state.selectedAgentId,
        state.selectedBusinessListingId,
        state.selectedProperty,
    ]);

    const handleNavClick = useCallback((view: AppView) => navigateTo(view), [navigateTo]);

    const handleNewListingClick = useCallback(() => {
        if (!isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
            onClose();
            return;
        }
        // Forward, so `ViewTransition` resolves it to the sheet motion the
        // composer already uses everywhere else: it rises over the page that
        // opened it rather than replacing it sideways.
        navigateTo('create-listing', { direction: 'forward' });
    }, [dispatch, isAuthenticated, navigateTo, onClose]);

    const handleSubscriptionClick = useCallback(() => navigateTo('pricing'), [navigateTo]);

    const handleLogout = useCallback(() => {
        // Logging out first, and unconditionally: `navigateTo` declines to move
        // when you are already on the destination, and signing out while the
        // search page is open is exactly that case.
        logout();
        // A change of who you are, not a step through the app — it dissolves.
        navigateTo('search', { direction: 'morph' });
    }, [logout, navigateTo]);

    // Luxury villas are their own curated market (for rent OR for sale), so the
    // entry is always visible — a permanent home in the sidebar.
    const baseNavItems = [
      { view: 'home' as AppView, label: t('nav:home'), icon: <HomeIcon /> },
      { view: 'search' as AppView, label: t('nav:search'), icon: <SearchIcon /> },
      { view: 'rentals' as AppView, label: t('nav:rentals'), icon: <RentIcon /> },
      { view: 'villas' as AppView, label: t('nav:villas'), icon: <LuxuryVillaIcon className="h-5 w-5 text-[#FFA500]" /> },
      { view: 'explore-cities' as AppView, label: t('nav:exploreCities'), icon: <SparklesIcon /> },
      { view: 'saved-searches' as AppView, label: t('nav:savedSearches'), icon: <MagnifyingGlassPlusIcon /> },
      { view: 'saved-properties' as AppView, label: t('nav:savedProperties'), icon: <HeartIcon /> },
      { view: 'agents' as AppView, label: t('nav:topAgents'), icon: <AgentsIcon /> },
      { view: 'agencies' as AppView, label: t('nav:agencies'), icon: <BuildingOfficeIcon /> },
      { view: 'business-directory' as AppView, label: t('nav:businessDirectory'), icon: <BuildingStorefrontIcon /> },
      { view: 'how-it-works' as AppView, label: t('nav:howItWorks'), icon: <InformationCircleIcon /> },
      { view: 'blog' as AppView, label: t('nav:blog', 'Blog & Articles'), icon: <BookOpenIcon /> },
    ];

    // Add admin panel for admin users
    const navItems = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
      ? [...baseNavItems, { view: 'admin' as AppView, label: t('nav:adminPanel'), icon: <ShieldCheckIcon /> }]
      : baseNavItems;

    // Close sidebar on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <>
            {/* Overlay for mobile.
                `invisible` when closed, not just `opacity-0`: this is a
                full-viewport `backdrop-blur`, and an element at zero opacity
                is still painted, so the blur was being resampled over the
                whole screen on every frame for the entire session — while
                showing nothing. `visibility` is transitioned alongside
                opacity so the fade out is kept: it flips to hidden only once
                the transition finishes, and back to visible as soon as it
                starts. */}
            <div
                data-app-scrim={isOpen ? 'open' : 'closed'}
                className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden transition-[opacity,visibility] duration-200 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            ></div>

            {/* Sidebar */}
            {/* `data-app-drawer="open"` is what gives the drawer a view transition
                name of its own while it is on screen (see index.css). Without it
                the drawer rides along in the `root` snapshot and cross-fades with
                the rest of the chrome; with it, it slides off to the left on the
                compositor as the page swishes across underneath — the two halves
                of one gesture rather than two unrelated fades. Closed, it is
                unnamed, so the desktop rail (always on screen, never moving) is
                untouched. */}
            <aside
                data-app-drawer={isOpen ? 'open' : 'closed'}
                className={`fixed top-0 left-0 h-full bg-white border-r border-neutral-200 z-50 flex flex-col transition-transform duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] group overflow-hidden ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 invisible md:visible'} md:w-20 md:translate-x-0 hover:md:w-64`}
                aria-label={t('nav:mainNavigation', 'Main navigation')}
                style={{
                  paddingTop: 'env(safe-area-inset-top, 0px)',
                  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                  paddingLeft: 'env(safe-area-inset-left, 0px)',
                  WebkitBackfaceVisibility: 'hidden',
                }}
            >
                <div className="flex items-center justify-between p-3 h-[56px] border-b border-neutral-200 flex-shrink-0 md:justify-center group-hover:md:justify-start">
                    <button
                        onClick={() => handleNavClick('home')}
                        {...preloadHandlers('home')}
                        className="flex items-center space-x-2"
                        aria-label={t('nav:goToHome', 'Go to home page')}
                    >
                        <LogoIcon className="w-7 h-7 text-primary flex-shrink-0" aria-hidden="true" />
                        <h1 className="text-lg font-bold text-neutral-800 md:hidden group-hover:md:inline whitespace-nowrap">
                            Balkan<span className="text-primary">Estate</span><sup className="text-primary text-xs font-bold ml-0.5">AI</sup>
                        </h1>
                    </button>
                    <button
                        onClick={onClose}
                        className="md:hidden p-1 text-neutral-700 hover:text-neutral-800"
                        aria-label={t('nav:closeMenu', 'Close navigation menu')}
                    >
                        <XMarkIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                <nav className="flex-grow p-1.5 space-y-0.5 overflow-y-auto">
                    {navItems.map(item => (
                         <NavItem
                            key={item.view}
                            view={item.view}
                            label={item.label}
                            icon={item.icon}
                            activeView={activeView}
                            onClick={handleNavClick}
                            badge={item.view === 'inbox' ? totalUnreadCount : undefined}
                        />
                    ))}

                    {/* Tools Section */}
                    <ToolsSection
                        activeView={activeView}
                        onNavClick={handleNavClick}
                    />

                     <div className="px-1.5 pt-1.5 mt-1.5 border-t border-neutral-100 space-y-0.5">
                        <button
                            onClick={handleNewListingClick}
                            {...preloadHandlers('create-listing')}
                            className="flex items-center gap-2.5 px-3 py-3 rounded-lg font-semibold transition-colors w-full text-white bg-secondary min-h-[44px] hover:bg-opacity-90 md:justify-center group-hover:md:justify-start"
                            aria-label={t('nav:createNewListing', 'Create a new listing')}
                        >
                            <PencilIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                            <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">+ {t('nav:newListing')}</span>
                        </button>
                        <button
                            onClick={handleSubscriptionClick}
                            {...preloadHandlers('pricing')}
                            className={`flex items-center gap-2.5 px-3 py-3 rounded-lg font-semibold transition-colors w-full text-left min-h-[44px] md:justify-center group-hover:md:justify-start text-neutral-700 hover:bg-neutral-100`}
                            aria-label={t('nav:viewSubscription', 'View subscription plans')}
                        >
                            <div className={`w-5 h-5 flex-shrink-0 text-neutral-700`} aria-hidden="true"><StarIconSolid /></div>
                            <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{t('nav:subscription')}</span>
                        </button>
                        {isAuthenticated && (
                            <button
                                onClick={() => handleNavClick('analytics')}
                                {...preloadHandlers('analytics')}
                                className={`flex items-center gap-2.5 px-3 py-3 rounded-lg font-semibold transition-colors w-full text-left min-h-[44px] md:justify-center group-hover:md:justify-start ${
                                    activeView === 'analytics'
                                        ? 'bg-primary-light text-primary-dark'
                                        : 'text-neutral-700 hover:bg-neutral-100'
                                }`}
                                aria-label={t('nav:viewAnalytics', 'View analytics dashboard')}
                                aria-current={activeView === 'analytics' ? 'page' : undefined}
                            >
                                <div className={`w-5 h-5 flex-shrink-0 ${activeView === 'analytics' ? 'text-primary' : 'text-neutral-700'}`} aria-hidden="true">
                                    <ChartBarIcon />
                                </div>
                                <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{t('nav:analytics')}</span>
                            </button>
                        )}
                        <button
                            onClick={() => handleNavClick('inbox')}
                            {...preloadHandlers('inbox')}
                            className={`flex items-center gap-2.5 px-3 py-3 rounded-lg font-semibold transition-colors w-full text-left min-h-[44px] md:justify-center group-hover:md:justify-start relative ${
                                activeView === 'inbox'
                                    ? 'bg-primary-light text-primary-dark'
                                    : 'text-neutral-700 hover:bg-neutral-100'
                            }`}
                            aria-label={totalUnreadCount > 0 ? t('nav:inboxWithUnread', 'Inbox ({{count}} unread)', { count: totalUnreadCount }) : t('nav:inbox')}
                            aria-current={activeView === 'inbox' ? 'page' : undefined}
                        >
                            <div className={`w-5 h-5 flex-shrink-0 ${activeView === 'inbox' ? 'text-primary' : 'text-neutral-700'} relative`} aria-hidden="true">
                                <EnvelopeIcon />
                                {totalUnreadCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ring-2 ring-white shadow" aria-hidden="true">
                                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                    </span>
                                )}
                            </div>
                            <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{t('nav:inbox')}</span>
                        </button>
                    </div>
                </nav>

                <div className="p-1.5 border-t border-neutral-200 flex-shrink-0 space-y-0.5">
                    {/* Language Switcher */}
                    <LanguageSwitcher variant="sidebar" />

                    {isAuthenticated && currentUser ? (
                        <div className="space-y-0.5">
                             <button
                                onClick={() => handleNavClick('account')}
                                {...preloadHandlers('account')}
                                className={`flex items-center gap-2.5 px-3 py-3 rounded-lg font-semibold transition-colors w-full text-left min-h-[44px] md:justify-center group-hover:md:justify-start ${
                                    activeView === 'account'
                                    ? 'bg-primary-light text-primary-dark'
                                    : 'text-neutral-700 hover:bg-neutral-100'
                                }`}
                                aria-label={t('nav:goToAccount', 'Go to my account')}
                                aria-current={activeView === 'account' ? 'page' : undefined}
                            >
                                <div className="w-5 h-5 flex-shrink-0 rounded-full overflow-hidden bg-neutral-100">
                                <UserAvatar src={currentUser.avatarUrl} alt={t('nav:userAvatar', 'User avatar')} gender={currentUser.gender} seed={currentUser.id || currentUser.name} avatarOptions={currentUser.avatarOptions} className="w-full h-full object-cover" />
                                </div>
                                <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{t('nav:myAccount')}</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2.5 px-3 py-3 rounded-lg font-semibold transition-colors w-full text-left min-h-[44px] text-red-600 hover:bg-red-50 md:justify-center group-hover:md:justify-start"
                                aria-label={t('auth:logoutAccount', 'Log out of your account')}
                            >
                                <ArrowLeftOnRectangleIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                                <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{t('auth:buttons.logout')}</span>
                            </button>
                        </div>
                    ) : (
                         <button
                            onClick={() => { dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } }); onClose(); }}
                            className="flex items-center gap-2.5 px-3 py-3 rounded-lg font-semibold transition-colors w-full text-left min-h-[44px] text-neutral-700 hover:bg-neutral-100 md:justify-center group-hover:md:justify-start"
                            aria-label={t('nav:loginOrRegister', 'Login or register an account')}
                         >
                            <UserCircleIcon className="w-5 h-5 text-neutral-700 flex-shrink-0" aria-hidden="true" />
                            <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{t('nav:loginRegister')}</span>
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;