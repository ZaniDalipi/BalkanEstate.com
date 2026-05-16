import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { useNavigationDirection } from '@/src/components/ui/ViewTransition';
import { AppView, UserRole, Conversation } from '@/types';
import { LogoIcon, AgentsIcon, SearchIcon, MagnifyingGlassPlusIcon, HeartIcon, EnvelopeIcon, UserCircleIcon, UsersIcon, ArrowLeftOnRectangleIcon, XMarkIcon, PencilIcon, StarIconSolid, BuildingOfficeIcon, ShieldCheckIcon, GlobeAltIcon, ChartBarIcon } from '@/constants';
import LanguageSwitcher from '@/src/components/LanguageSwitcher';
import UserAvatar from '@/components/shared/UserAvatar';

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
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors w-full text-left md:justify-center group-hover:md:justify-start relative ${
        isActive
          ? 'bg-primary-light text-primary-dark'
          : 'text-neutral-700 hover:bg-neutral-100'
      }`}
    >
      <div className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-neutral-700'} relative`}>
        {icon}
        {badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{label}</span>
    </button>
  );
};

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation(['nav', 'common', 'auth']);
    const { state, dispatch, logout } = useAppContext();
    const { setDirection } = useNavigationDirection();
    const { activeView, isAuthenticated, currentUser, conversations } = state;

    // Calculate total unread messages
    const totalUnreadCount = (conversations as Conversation[]).reduce((total: number, conversation: Conversation) => {
        const unreadCount = conversation.messages?.filter(m => !m.isRead && m.senderId !== currentUser?.id).length || 0;
        return total + unreadCount;
    }, 0);

    const handleNavClick = (view: AppView) => {
        const needsAuth = ['inbox', 'account', 'saved-searches', 'saved-properties', 'agency-dashboard'].includes(view);
        if (needsAuth && !isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
        } else {
            // Set transition direction: morph for tab-like switches, forward for drill-in views
            const morphViews = new Set(['search', 'saved-properties', 'saved-searches', 'inbox', 'account', 'agency-dashboard', 'admin']);
            setDirection(morphViews.has(view) ? 'morph' : 'forward');
            // Clear selected agency/property when navigating to different views
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });

            // Update browser URL
            const route = view === 'search' ? '/' : `/${view}`;
            window.history.pushState({}, '', route);
        }
        onClose(); // Close sidebar on mobile after navigation
    };

    const handleNewListingClick = () => {
        if (isAuthenticated) {
            setDirection('morph');
            // Clear selected agency when creating new listing
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
            window.history.pushState({}, '', '/create-listing');
        } else {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
        }
        onClose();
    };

    const handleSubscriptionClick = () => {
        setDirection('forward');
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
        const currentLang = window.location.pathname.split('/')[1] || 'en';
        const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
        const lang = validLangs.includes(currentLang) ? currentLang : 'en';
        window.history.pushState({}, '', `/${lang}/subscribe`);
        onClose();
    };

    const handleLogout = () => {
        logout();
        // After logout, reset to a default public view and clear any selected items
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
        window.history.pushState({}, '', '/');
        onClose();
    };

    const baseNavItems = [
      { view: 'search' as AppView, label: t('nav:search'), icon: <SearchIcon /> },
      { view: 'explore-cities' as AppView, label: t('nav:exploreCities'), icon: <GlobeAltIcon /> },
      { view: 'saved-searches' as AppView, label: t('nav:savedSearches'), icon: <MagnifyingGlassPlusIcon /> },
      { view: 'saved-properties' as AppView, label: t('nav:savedProperties'), icon: <HeartIcon /> },
      { view: 'agents' as AppView, label: t('nav:topAgents'), icon: <AgentsIcon /> },
      { view: 'agencies' as AppView, label: t('nav:agencies'), icon: <BuildingOfficeIcon /> },
    ];

    // Add agency dashboard for users who belong to an agency
    const isAgencyMember = isAuthenticated && currentUser?.agencyId &&
      (currentUser?.role === 'agent' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin');

    // Add admin panel for admin users
    let navItems = [...baseNavItems];
    if (isAgencyMember) {
      navItems.push({ view: 'agency-dashboard' as AppView, label: t('nav:agencyDashboard', 'Agency Dashboard'), icon: <ChartBarIcon /> });
    }
    if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
      navItems.push({ view: 'admin' as AppView, label: t('nav:adminPanel'), icon: <ShieldCheckIcon /> });
    }

    return (
        <>
            {/* Overlay for mobile */}
            <div 
                className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full bg-white border-r border-neutral-200 z-50 flex flex-col transition-all duration-300 ease-in-out group overflow-hidden ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} md:w-20 md:translate-x-0 hover:md:w-64`}
                style={{
                    paddingTop: 'env(safe-area-inset-top, 0px)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    paddingLeft: 'env(safe-area-inset-left, 0px)',
                }}
            >
                <div className="flex items-center p-3 h-[56px] border-b border-neutral-200 flex-shrink-0 md:justify-center group-hover:md:justify-start">
                    <button
                        onClick={() => handleNavClick('search')}
                        className="flex items-center space-x-2"
                    >
                        <LogoIcon className="w-7 h-7 text-primary flex-shrink-0" />
                        <h1 className="text-lg font-bold text-neutral-800 md:hidden group-hover:md:inline whitespace-nowrap">
                            Balkan <span className="text-primary">Estate</span>
                        </h1>
                    </button>
                    <button onClick={onClose} className="md:hidden absolute right-3 top-4 text-neutral-700 hover:text-neutral-800">
                        <XMarkIcon className="w-5 h-5"/>
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
                     <div className="px-1.5 pt-1.5 mt-1.5 border-t border-neutral-100 space-y-0.5">
                        <button
                            onClick={handleNewListingClick}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors w-full text-white bg-secondary hover:bg-opacity-90 md:justify-center group-hover:md:justify-start"
                        >
                            <PencilIcon className="w-5 h-5 flex-shrink-0" />
                            <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">+ {t('nav:newListing')}</span>
                        </button>
                        <button
                            onClick={handleSubscriptionClick}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors w-full text-left md:justify-center group-hover:md:justify-start text-neutral-700 hover:bg-neutral-100`}
                        >
                            <div className={`w-5 h-5 flex-shrink-0 text-neutral-700`}><StarIconSolid /></div>
                            <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{t('nav:subscription')}</span>
                        </button>
                        {isAuthenticated && (
                            <button
                                onClick={() => handleNavClick('analytics')}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors w-full text-left md:justify-center group-hover:md:justify-start ${
                                    activeView === 'analytics'
                                        ? 'bg-primary-light text-primary-dark'
                                        : 'text-neutral-700 hover:bg-neutral-100'
                                }`}
                            >
                                <div className={`w-5 h-5 flex-shrink-0 ${activeView === 'analytics' ? 'text-primary' : 'text-neutral-700'}`}>
                                    <ChartBarIcon />
                                </div>
                                <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{t('nav:analytics')}</span>
                            </button>
                        )}
                        <button
                            onClick={() => handleNavClick('inbox')}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors w-full text-left md:justify-center group-hover:md:justify-start relative ${
                                activeView === 'inbox'
                                    ? 'bg-primary-light text-primary-dark'
                                    : 'text-neutral-700 hover:bg-neutral-100'
                            }`}
                        >
                            <div className={`w-5 h-5 flex-shrink-0 ${activeView === 'inbox' ? 'text-primary' : 'text-neutral-700'} relative`}>
                                <EnvelopeIcon />
                                {totalUnreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
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
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors w-full text-left md:justify-center group-hover:md:justify-start ${
                                    activeView === 'account'
                                    ? 'bg-primary-light text-primary-dark'
                                    : 'text-neutral-700 hover:bg-neutral-100'
                                }`}
                            >
                                <div className="w-5 h-5 flex-shrink-0">
                                <UserAvatar src={currentUser.avatarUrl} gender={currentUser.gender} seed={currentUser.id || currentUser.name} avatarOptions={currentUser.avatarOptions} className="w-full h-full rounded-full object-cover" />
                                </div>
                                <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{t('nav:myAccount')}</span>
                            </button>
                            <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors w-full text-left text-red-600 hover:bg-red-50 md:justify-center group-hover:md:justify-start">
                                <ArrowLeftOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
                                <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{t('auth:logout')}</span>
                            </button>
                        </div>
                    ) : (
                         <button onClick={() => { dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } }); onClose(); }} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors w-full text-left text-neutral-700 hover:bg-neutral-100 md:justify-center group-hover:md:justify-start">
                            <UserCircleIcon className="w-5 h-5 text-neutral-700 flex-shrink-0" />
                            <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">{t('nav:loginRegister')}</span>
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;