import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { AppView } from '../../types';
import { SearchIcon, HeartIcon, EnvelopeIcon, UserCircleIcon, PencilIcon } from '../../constants';

const BottomNav: React.FC = () => {
    const { t } = useTranslation(['nav']);
    const { state, dispatch } = useAppContext();
    const { activeView, isAuthenticated, currentUser, conversations } = state;

    // Calculate total unread messages
    const totalUnreadCount = conversations.reduce((total, conversation) => {
        const unreadCount = conversation.messages?.filter(m => !m.isRead && m.senderId !== currentUser?.id).length || 0;
        return total + unreadCount;
    }, 0);

    const handleNavClick = (view: AppView) => {
        const needsAuth = ['inbox', 'account', 'saved-properties'].includes(view);
        if (needsAuth && !isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
        } else {
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });

            const route = view === 'search' ? '/' : `/${view}`;
            window.history.pushState({}, '', route);
        }
    };

    const handleNewListingClick = () => {
        if (isAuthenticated) {
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
            window.history.pushState({}, '', '/create-listing');
        } else {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
        }
    };

    const navItems = [
        { view: 'search' as AppView, label: t('nav:search'), icon: SearchIcon },
        { view: 'saved-properties' as AppView, label: t('nav:saved'), icon: HeartIcon },
        { view: 'create-listing' as AppView, label: t('nav:sell'), icon: PencilIcon, isSpecial: true },
        { view: 'inbox' as AppView, label: t('nav:inbox'), icon: EnvelopeIcon, badge: totalUnreadCount },
        { view: 'account' as AppView, label: t('nav:account'), icon: UserCircleIcon },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/30 z-50 safe-area-inset-bottom shadow-lg shadow-black/5">
            <div className="flex items-center justify-around px-1.5 py-1.5">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeView === item.view;
                    const isSpecial = item.isSpecial;

                    if (isSpecial) {
                        return (
                            <button
                                key={item.view}
                                onClick={handleNewListingClick}
                                className="flex flex-col items-center justify-center flex-1 py-1.5 relative"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-secondary to-orange-400 rounded-full flex items-center justify-center shadow-xl shadow-secondary/30 -mt-5 border-2 border-white/50">
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xs font-medium text-neutral-600 mt-1">{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={item.view}
                            onClick={() => handleNavClick(item.view)}
                            className="flex flex-col items-center justify-center flex-1 py-1.5 relative"
                        >
                            <div className="relative">
                                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-neutral-600'}`} />
                                {item.badge && item.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={`text-xs font-medium mt-0.5 ${isActive ? 'text-primary' : 'text-neutral-600'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
