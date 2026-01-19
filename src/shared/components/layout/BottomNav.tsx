import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { AppView } from '../../types';
import { SearchIcon, HeartIcon, EnvelopeIcon, UserCircleIcon, PencilIcon } from '../../constants';

const BottomNav: React.FC = () => {
    const { t } = useTranslation(['nav']);
    const { state, dispatch } = useAppContext();
    const { activeView, isAuthenticated, currentUser, conversations } = state;

    // Calculate total unread messages
    const totalUnreadCount = useMemo(() => {
        return conversations.reduce((total, conversation) => {
            const unreadCount = conversation.messages?.filter(m => !m.isRead && m.senderId !== currentUser?.id).length || 0;
            return total + unreadCount;
        }, 0);
    }, [conversations, currentUser?.id]);

    const handleNavClick = useCallback((view: AppView) => {
        const needsAuth = ['inbox', 'account', 'saved-properties'].includes(view);
        if (needsAuth && !isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
        } else {
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });

            const route = view === 'search' ? '/' : `/${view}`;
            window.history.pushState({}, '', route);
        }
    }, [dispatch, isAuthenticated]);

    const handleNewListingClick = useCallback(() => {
        if (isAuthenticated) {
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
            window.history.pushState({}, '', '/create-listing');
        } else {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
        }
    }, [dispatch, isAuthenticated]);

    const navItems = useMemo(() => [
        { view: 'search' as AppView, label: t('nav:search'), icon: SearchIcon },
        { view: 'saved-properties' as AppView, label: t('nav:saved'), icon: HeartIcon },
        { view: 'create-listing' as AppView, label: t('nav:sell'), icon: PencilIcon, isSpecial: true },
        { view: 'inbox' as AppView, label: t('nav:inbox'), icon: EnvelopeIcon, badge: totalUnreadCount },
        { view: 'account' as AppView, label: t('nav:account'), icon: UserCircleIcon },
    ], [t, totalUnreadCount]);

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/30 z-50 shadow-lg shadow-black/5 pb-[env(safe-area-inset-bottom)]"
            role="navigation"
            aria-label={t('nav:bottomNavigation', 'Bottom navigation')}
        >
            <div className="flex items-center justify-around px-1 landscape:px-2 py-1 landscape:py-0.5">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeView === item.view;
                    const isSpecial = item.isSpecial;

                    if (isSpecial) {
                        return (
                            <button
                                key={item.view}
                                onClick={handleNewListingClick}
                                className="flex flex-col items-center justify-center flex-1 min-h-[56px] landscape:min-h-[48px] py-1.5 landscape:py-1 relative touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset rounded-lg"
                                aria-label={item.label}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                <div className="w-10 h-10 landscape:w-9 landscape:h-9 bg-gradient-to-br from-secondary to-orange-400 rounded-full flex items-center justify-center shadow-xl shadow-secondary/30 -mt-4 landscape:-mt-3 border-2 border-white/50 active:scale-95 transition-transform">
                                    <Icon className="w-5 h-5 landscape:w-4 landscape:h-4 text-white" aria-hidden="true" />
                                </div>
                                <span className="text-[10px] landscape:text-[9px] font-medium text-neutral-600 mt-1 landscape:mt-0.5">{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={item.view}
                            onClick={() => handleNavClick(item.view)}
                            className={`
                                flex flex-col items-center justify-center flex-1
                                min-h-[56px] landscape:min-h-[48px] min-w-[48px]
                                py-1.5 landscape:py-1 relative touch-manipulation
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset rounded-lg
                                active:bg-neutral-100/50 transition-colors
                            `}
                            aria-label={item.badge && item.badge > 0 ? `${item.label} (${item.badge} unread)` : item.label}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <div className="relative">
                                <Icon
                                    className={`w-5 h-5 landscape:w-[18px] landscape:h-[18px] transition-colors ${isActive ? 'text-primary' : 'text-neutral-600'}`}
                                    aria-hidden="true"
                                />
                                {item.badge && item.badge > 0 && (
                                    <span
                                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                                        aria-hidden="true"
                                    >
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] landscape:text-[9px] font-medium mt-0.5 transition-colors ${isActive ? 'text-primary' : 'text-neutral-600'}`}>
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
