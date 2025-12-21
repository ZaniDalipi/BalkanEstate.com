import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { AppView, UserRole } from '../../types';
import { LogoIcon, AgentsIcon, SearchIcon, MagnifyingGlassPlusIcon, HeartIcon, EnvelopeIcon, UserCircleIcon, UsersIcon, ArrowLeftOnRectangleIcon, XMarkIcon, PencilIcon, StarIconSolid, BuildingOfficeIcon, ShieldCheckIcon, SparklesIcon } from '../../constants';

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
    const { state, dispatch, logout } = useAppContext();
    const { activeView, isAuthenticated, currentUser, conversations } = state;

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

            // Update browser URL
            const route = view === 'search' ? '/' : `/${view}`;
            window.history.pushState({}, '', route);
        }
        onClose(); // Close sidebar on mobile after navigation
    };

    const handleNewListingClick = () => {
        if (isAuthenticated) {
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
        dispatch({ type: 'TOGGLE_SUBSCRIPTION_MODAL', payload: { isOpen: true } });
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
      { view: 'search' as AppView, label: 'Search', icon: <SearchIcon /> },
      { view: 'explore-cities' as AppView, label: 'Explore Cities', icon: <SparklesIcon /> },
      { view: 'saved-searches' as AppView, label: 'Saved Searches', icon: <MagnifyingGlassPlusIcon /> },
      { view: 'saved-properties' as AppView, label: 'Saved Properties', icon: <HeartIcon /> },
      { view: 'agents' as AppView, label: 'Top Agents', icon: <AgentsIcon /> },
      { view: 'agencies' as AppView, label: 'Agencies', icon: <BuildingOfficeIcon /> },
    ];

    // Add admin panel for admin users
    const navItems = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
      ? [...baseNavItems, { view: 'admin' as AppView, label: 'Admin Panel', icon: <ShieldCheckIcon /> }]
      : baseNavItems;

    return (
        <>
            {/* Overlay for mobile */}
            <div 
                className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 h-full bg-white border-r border-neutral-200 z-40 flex flex-col transition-all duration-300 ease-in-out group overflow-hidden ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} md:w-20 md:translate-x-0 hover:md:w-64`}>
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
                            <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">+ New Listing</span>
                        </button>
                        <button
                            onClick={handleSubscriptionClick}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors w-full text-left md:justify-center group-hover:md:justify-start text-neutral-700 hover:bg-neutral-100`}
                        >
                            <div className={`w-5 h-5 flex-shrink-0 text-neutral-700`}><StarIconSolid /></div>
                            <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">Subscription</span>
                        </button>
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
                            <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">Inbox</span>
                        </button>
                    </div>
                </nav>

                <div className="p-1.5 border-t border-neutral-200 flex-shrink-0">
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
                                {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover"/> : <UserCircleIcon />}
                                </div>
                                <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">My Account</span>
                            </button>
                            <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors w-full text-left text-red-600 hover:bg-red-50 md:justify-center group-hover:md:justify-start">
                                <ArrowLeftOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
                                <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">Logout</span>
                            </button>
                        </div>
                    ) : (
                         <button onClick={() => { dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } }); onClose(); }} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors w-full text-left text-neutral-700 hover:bg-neutral-100 md:justify-center group-hover:md:justify-start">
                            <UserCircleIcon className="w-5 h-5 text-neutral-700 flex-shrink-0" />
                            <span className="md:hidden group-hover:md:inline whitespace-nowrap text-sm">Login / Register</span>
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;