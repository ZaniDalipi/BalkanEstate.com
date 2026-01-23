import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { AppView, UserRole } from '../../types';
import { LogoIcon, AgentsIcon, SearchIcon, MagnifyingGlassPlusIcon, HeartIcon, EnvelopeIcon, UserCircleIcon, UsersIcon, ArrowLeftOnRectangleIcon, XMarkIcon, PencilIcon, StarIconSolid, BuildingOfficeIcon, ShieldCheckIcon, SparklesIcon, ChartBarIcon, CurrencyDollarIcon, ChevronDownIcon, ChevronUpIcon, CalculatorIcon, WrenchScrewdriverIcon, InformationCircleIcon } from '../../constants';
import LanguageSwitcher from '../../src/components/LanguageSwitcher';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';

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

// Tools Section Component with expandable menu
const ToolsSection: React.FC<{
  activeView: AppView;
  onNavClick: (view: AppView) => void;
  onClose: () => void;
}> = ({ activeView, onNavClick, onClose }) => {
  const { t } = useTranslation(['nav']);
  const [isExpanded, setIsExpanded] = useState(false);
  const { getLocalizedPath } = useLocalizedNavigation();

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
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors w-full text-left md:justify-center group-hover:md:justify-start ${
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
              onClick={() => {
                onNavClick(item.view);
                onClose();
              }}
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

    // Calculate total unread messages
    const totalUnreadCount = conversations.reduce((total, conversation) => {
        const unreadCount = conversation.messages?.filter(m => !m.isRead && m.senderId !== currentUser?.id).length || 0;
        return total + unreadCount;
    }, 0);

    const handleNavClick = (view: AppView) => {
        const needsAuth = ['inbox', 'account', 'saved-searches', 'saved-properties'].includes(view);
        if (needsAuth && !isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
        } else {
            // Clear selected agency/property when navigating to different views
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });

            // Update browser URL with language prefix
            const route = view === 'search' ? '/' : `/${view}`;
            window.history.pushState({}, '', getLocalizedPath(route));
        }
        onClose(); // Close sidebar on mobile after navigation
    };

    const handleNewListingClick = () => {
        if (isAuthenticated) {
            // Clear selected agency when creating new listing
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
            window.history.pushState({}, '', getLocalizedPath('/create-listing'));
        } else {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
        }
        onClose();
    };

    const handleSubscriptionClick = () => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
        window.history.pushState({}, '', getLocalizedPath('/subscribe'));
        onClose();
    };

    const handleLogout = () => {
        logout();
        // After logout, reset to a default public view and clear any selected items
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
        window.history.pushState({}, '', getLocalizedPath('/'));
        onClose();
    };

    const baseNavItems = [
      { view: 'search' as AppView, label: t('nav:search'), icon: <SearchIcon /> },
      { view: 'explore-cities' as AppView, label: t('nav:exploreCities'), icon: <SparklesIcon /> },
      { view: 'saved-searches' as AppView, label: t('nav:savedSearches'), icon: <MagnifyingGlassPlusIcon /> },
      { view: 'saved-properties' as AppView, label: t('nav:savedProperties'), icon: <HeartIcon /> },
      { view: 'agents' as AppView, label: t('nav:topAgents'), icon: <AgentsIcon /> },
      { view: 'agencies' as AppView, label: t('nav:agencies'), icon: <BuildingOfficeIcon /> },
      { view: 'how-it-works' as AppView, label: t('nav:howItWorks'), icon: <InformationCircleIcon /> },
    ];

    // Add admin panel for admin users
    const navItems = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
      ? [...baseNavItems, { view: 'admin' as AppView, label: t('nav:adminPanel'), icon: <ShieldCheckIcon /> }]
      : baseNavItems;

    return (
        <>
            {/* Overlay for mobile */}
            <div 
                className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 h-full bg-white border-r border-neutral-200 z-50 flex flex-col transition-all duration-300 ease-in-out group overflow-hidden ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} md:w-20 md:translate-x-0 hover:md:w-64`}>
                <div className="flex items-center p-3 h-[56px] border-b border-neutral-200 flex-shrink-0 md:justify-center group-hover:md:justify-start">
                    <button
                        onClick={() => handleNavClick('search')}
                        className="flex items-center space-x-2"
                    >
                        <LogoIcon className="w-7 h-7 text-primary flex-shrink-0" />
                        <h1 className="text-lg font-bold text-neutral-800 md:hidden group-hover:md:inline whitespace-nowrap">
                            Balkan<span className="text-primary">Estate</span><sup className="text-primary text-xs font-bold ml-0.5">AI</sup>
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

                    {/* Tools Section */}
                    <ToolsSection
                        activeView={activeView}
                        onNavClick={handleNavClick}
                        onClose={onClose}
                    />

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
                                <div className="w-5 h-5 flex-shrink-0 rounded-full overflow-hidden bg-neutral-100">
                                {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt="avatar" className="w-full h-full object-cover"/> : <UserCircleIcon className="w-full h-full text-neutral-400" />}
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