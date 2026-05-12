import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { AppView } from '../../types';
import { SearchIcon, HeartIcon, EnvelopeIcon, UserCircleIcon, PencilIcon } from '../../constants';
import UserAvatar from './UserAvatar';
import { usePWAEnvironment } from '@/src/app/hooks/usePWAEnvironment';

const BottomNav: React.FC = () => {
    const { t } = useTranslation(['nav']);
    const { state, dispatch } = useAppContext();
    const { getLocalizedPath } = useLocalizedNavigation();
    const { activeView, isAuthenticated, currentUser, conversations } = state;
    const { orientation } = usePWAEnvironment();

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

            const route = view === 'home' ? '/' : view === 'search' ? '/search' : `/${view}`;
            window.history.pushState({}, '', getLocalizedPath(route));
        }
    };

    const handleNewListingClick = () => {
        if (isAuthenticated) {
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
            window.history.pushState({}, '', getLocalizedPath('/create-listing'));
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

    // In landscape on short screens, labels are hidden to preserve vertical space
    const isLandscape = orientation === 'landscape';

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-50"
            aria-label={t('nav:mainNavigation', 'Main navigation')}
            style={{
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                paddingLeft: 'env(safe-area-inset-left, 0px)',
                paddingRight: 'env(safe-area-inset-right, 0px)',
            }}
        >
            <div className={`flex items-center justify-around px-1.5 ${isLandscape ? 'py-0.5' : 'py-1.5'}`}>
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
                                aria-label={t('nav:createNewListing', 'Create a new listing')}
                            >
                                <div className={`bg-secondary rounded-full flex items-center justify-center shadow-lg ${isLandscape ? 'w-8 h-8 -mt-2' : 'w-10 h-10 -mt-5'}`}>
                                    <Icon className="w-5 h-5 text-white" aria-hidden="true" />
                                </div>
                                {!isLandscape && (
                                    <span className="text-xs font-medium text-neutral-600 mt-1">{item.label}</span>
                                )}
                            </button>
                        );
                    }

                    // Show avatar for account tab if user is authenticated
                    const isAccountTab = item.view === 'account';
                    const showAvatar = isAccountTab && isAuthenticated && currentUser?.avatarUrl;

                    const ariaLabel = item.badge && item.badge > 0
                        ? `${item.label} (${item.badge} ${t('nav:unread', 'unread')})`
                        : item.label;

                    return (
                        <button
                            key={item.view}
                            onClick={() => handleNavClick(item.view)}
                            className="flex flex-col items-center justify-center flex-1 py-1.5 relative"
                            aria-label={ariaLabel}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <div className="relative">
                                {showAvatar ? (
                                    <div className={`rounded-full overflow-hidden ring-2 ${isActive ? 'ring-primary/50' : 'ring-white/60'} shadow-sm ${isLandscape ? 'w-5 h-5' : 'w-5 h-5'}`}>
                                        <UserAvatar
                                            src={currentUser.avatarUrl}
                                            gender={currentUser.gender}
                                            seed={currentUser.id || currentUser.name}
                                            avatarOptions={currentUser.avatarOptions}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <Icon
                                        className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-neutral-600'}`}
                                        aria-hidden="true"
                                    />
                                )}
                                {item.badge !== undefined && item.badge > 0 && (
                                    <span
                                        className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1"
                                        aria-hidden="true"
                                    >
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </div>
                            {!isLandscape && (
                                <span className={`text-xs font-medium mt-0.5 ${isActive ? 'text-primary' : 'text-neutral-600'}`}>
                                    {item.label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
