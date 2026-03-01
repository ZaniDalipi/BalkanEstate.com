import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, UserRole } from '@/types';
import { useAppContext } from '@/context/AppContext';
import {
    LISTING_LIMITS,
    PLAN_LISTING_LIMITS,
} from '@/shared/utils/subscriptionHelpers';

interface RoleSelectorProps {
    currentUser: User;
    selectedRole: UserRole;
    onRoleSelect: (role: UserRole) => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ currentUser, selectedRole, onRoleSelect }) => {
    const { t } = useTranslation(['seller']);
    const { dispatch } = useAppContext();
    const subscription = currentUser.subscription;

    // Determine which roles to show based on user registration and subscription
    // Agency agents CAN post as private seller (individual listings outside agency)
    const hasPrivateSeller = true;

    // Only show agent option if user is registered as an agent
    // User is an agent if they have:
    // - 'agent' in their availableRoles, OR
    // - role === 'agent', OR
    // - agentId exists (registered through agent process)
    const isRegisteredAgent =
        currentUser.availableRoles?.includes('agent' as UserRole) ||
        (currentUser.role as string) === 'agent' ||
        (currentUser.role as string) === (UserRole.AGENT as string) ||
        !!currentUser.agentId ||
        !!currentUser.licenseNumber;

    const hasAgent = isRegisteredAgent;

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case UserRole.AGENT:
                return '🏢';
            case UserRole.PRIVATE_SELLER:
                return '🏠';
            default:
                return '👤';
        }
    };

    const getRoleLabel = (role: UserRole) => {
        switch (role) {
            case UserRole.AGENT:
                return t('seller:roleSelector.agent');
            case UserRole.PRIVATE_SELLER:
                return t('seller:roleSelector.privateSeller');
            default:
                return role;
        }
    };

    /**
     * Get subscription data for a role - Single Source of Truth
     * Uses the new unified subscription system
     * IMPORTANT: Always check subscription status - cancelled/expired = free tier
     */
    const getRoleSubscription = (role: UserRole) => {
        // Get subscription data from the unified subscription field
        const sub = currentUser.subscription;

        if (sub) {
            const tier = sub.tier || 'free';

            // CRITICAL: Check if subscription is actually active
            // Note: 'canceled' and 'pending_cancellation' are valid because backend only returns them when subscription hasn't expired yet
            // The backend verifies expiration date - if canceled AND expired, it returns status='expired'
            const validStatuses = ['active', 'trial', 'grace', 'canceled', 'pending_cancellation'];
            const isActiveSubscription = validStatuses.includes(sub.status || '') && sub.status !== 'expired';

            // Determine if this is a Pro-level subscription
            // ONLY if the subscription is actually active
            const proTiers = ['pro', 'agency_owner', 'agency_agent'];
            const isPro = isActiveSubscription && (proTiers.includes(tier) || (tier !== 'free' && tier !== 'buyer'));

            // Get the correct listing limit based on subscription status
            // If subscription is not active, fall back to free tier (3 listings)
            // Priority: 1) sub.listingsLimit (from DB) 2) PLAN_LISTING_LIMITS[productId] 3) LISTING_LIMITS[tier] 4) fallback to 3
            const productId = sub.productId as keyof typeof PLAN_LISTING_LIMITS | undefined;
            const limit = isActiveSubscription
                ? sub.listingsLimit || (productId && PLAN_LISTING_LIMITS[productId]) || LISTING_LIMITS[tier] || 3
                : 3; // Free tier limit

            // Get counts
            const used = sub.activeListingsCount || 0;
            const roleCount = role === UserRole.AGENT
                ? (sub.agentCount || 0)
                : (sub.privateSellerCount || 0);

            // Get promotion coupons - only if subscription is active
            const promotionCoupons: any = isActiveSubscription ? (sub.promotionCoupons || {}) : {};
            const featuredCoupons = promotionCoupons.featured || 0;
            const highlightedCoupons = promotionCoupons.highlighted || 0;
            const totalCoupons = promotionCoupons.available ?? (featuredCoupons + highlightedCoupons);
            const usedCoupons = promotionCoupons.used || 0;

            return {
                plan: isActiveSubscription ? tier : 'free',
                limit,
                used,
                roleCount,
                isActive: isActiveSubscription,
                isPro,
                // Promotion coupon details
                featuredCoupons,
                highlightedCoupons,
                totalCoupons,
                usedCoupons,
                featuredDuration: promotionCoupons.featuredDuration || (tier.includes('yearly') ? 14 : 7),
                highlightedDuration: promotionCoupons.highlightedDuration || (tier.includes('yearly') ? 14 : 7),
            };
        }

        // Fallback to legacy proSubscription if exists
        if (currentUser.proSubscription?.isActive) {
            const legacySub = currentUser.proSubscription;
            const roleCount = role === UserRole.AGENT
                ? (legacySub.agentCount || 0)
                : (legacySub.privateSellerCount || 0);

            return {
                plan: legacySub.plan || 'pro',
                limit: legacySub.totalListingsLimit || 250, // Pro yearly default
                used: legacySub.activeListingsCount || 0,
                roleCount,
                isActive: true,
                isPro: true,
                featuredCoupons: 1,
                highlightedCoupons: 1,
                totalCoupons: 2,
                usedCoupons: legacySub.promotionCoupons?.usedHighlightCoupons || 0,
                featuredDuration: 14,
                highlightedDuration: 14,
            };
        }

        // Fallback to legacy free subscription
        const freeSub = currentUser.freeSubscription;
        return {
            plan: 'free',
            limit: freeSub?.listingsLimit || 3,
            used: freeSub?.activeListingsCount || 0,
            roleCount: 0,
            isActive: true,
            isPro: false,
            featuredCoupons: 0,
            highlightedCoupons: 0,
            totalCoupons: 0,
            usedCoupons: 0,
            featuredDuration: 0,
            highlightedDuration: 0,
        };
    };

    const getPlanBadge = (plan: string) => {
        // Normalize plan name to lowercase for comparison
        const normalizedPlan = plan?.toLowerCase() || 'free';

        switch (normalizedPlan) {
            case 'trial':
                return <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{t('seller:roleSelector.badges.trial')}</span>;
            case 'pro':
            case 'pro_monthly':
            case 'pro_yearly':
                return <span className="text-xs font-semibold px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded">{t('seller:roleSelector.badges.pro')}</span>;
            case 'enterprise':
            case 'enterprise_monthly':
            case 'enterprise_yearly':
                return <span className="text-xs font-semibold px-2 py-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded">{t('seller:roleSelector.badges.enterprise', 'Enterprise')}</span>;
            case 'agency_owner':
                return <span className="text-xs font-semibold px-2 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded">{t('seller:roleSelector.badges.agencyOwner')}</span>;
            case 'agency_agent':
                return <span className="text-xs font-semibold px-2 py-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded">{t('seller:roleSelector.badges.agencyAgent')}</span>;
            case 'buyer':
                return <span className="text-xs font-semibold px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded">{t('seller:roleSelector.badges.buyer')}</span>;
            case 'free':
                return <span className="text-xs font-semibold px-2 py-0.5 bg-gray-200 text-neutral-700 rounded">{t('seller:roleSelector.badges.free')}</span>;
            case 'none':
                return <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 text-red-600 rounded">{t('seller:roleSelector.badges.proRequired')}</span>;
            default:
                // For any other paid plan, show as Pro
                if (normalizedPlan && normalizedPlan !== 'free' && normalizedPlan !== 'buyer') {
                    return <span className="text-xs font-semibold px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded">{t('seller:roleSelector.badges.pro')}</span>;
                }
                return null;
        }
    };

    return (
        <div className="glass-fieldset border-blue-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-bold text-gray-800">{t('seller:roleSelector.title')}</h3>
                <div className="flex-1 glass-divider"></div>
            </div>

            <p className="text-sm text-gray-400 mb-4">
                {t('seller:roleSelector.description')}
            </p>

            <div className={`grid grid-cols-1 ${hasAgent ? 'sm:grid-cols-2' : ''} gap-4`}>
                {hasPrivateSeller && (
                    <RoleCard
                        role={UserRole.PRIVATE_SELLER}
                        icon={getRoleIcon(UserRole.PRIVATE_SELLER)}
                        label={getRoleLabel(UserRole.PRIVATE_SELLER)}
                        subscription={getRoleSubscription(UserRole.PRIVATE_SELLER)}
                        isSelected={selectedRole === UserRole.PRIVATE_SELLER}
                        onSelect={() => onRoleSelect(UserRole.PRIVATE_SELLER)}
                        getPlanBadge={getPlanBadge}
                    />
                )}

                {hasAgent && (
                    <RoleCard
                        role={UserRole.AGENT}
                        icon={getRoleIcon(UserRole.AGENT)}
                        label={getRoleLabel(UserRole.AGENT)}
                        subscription={getRoleSubscription(UserRole.AGENT)}
                        isSelected={selectedRole === UserRole.AGENT}
                        onSelect={() => onRoleSelect(UserRole.AGENT)}
                        getPlanBadge={getPlanBadge}
                        agencyName={currentUser.agencyName}
                    />
                )}
            </div>

            {/* Info message for non-agents */}
            {!isRegisteredAgent && (
                <div className="mt-4 p-3 glass-fieldset border-blue-200">
                    <div className="flex items-start gap-2">
                        <span className="text-blue-600 text-lg">💼</span>
                        <div>
                            <p className="text-sm font-medium text-blue-600">
                                {t('seller:roleSelector.becomeAgent.title', 'Want to post as an agent?')}
                            </p>
                            <p className="text-xs text-blue-500/70 mt-0.5">
                                {t('seller:roleSelector.becomeAgent.description', 'You can register as a real estate agent from your Profile Settings to unlock agent features and higher listing limits.')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface RoleCardProps {
    role: UserRole;
    icon: string;
    label: string;
    subscription: {
        plan: string;
        limit: number;
        used: number;
        isActive: boolean;
        isPro?: boolean;
        roleCount?: number;
        // Promotion coupons
        featuredCoupons?: number;
        highlightedCoupons?: number;
        totalCoupons?: number;
        usedCoupons?: number;
        featuredDuration?: number;
        highlightedDuration?: number;
    } | null;
    isSelected: boolean;
    onSelect: () => void;
    getPlanBadge: (plan: string) => React.ReactNode;
    agencyName?: string;
}

const RoleCard: React.FC<RoleCardProps> = ({
    role,
    icon,
    label,
    subscription,
    isSelected,
    onSelect,
    getPlanBadge,
    agencyName
}) => {
    const { t } = useTranslation(['seller']);
    const { dispatch } = useAppContext();
    const remaining = subscription ? subscription.limit - subscription.used : 0;
    const isLimitReached = subscription ? (subscription.plan === 'none' || subscription.used >= subscription.limit) : false;

    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={isLimitReached}
            className={`
                relative p-4 rounded-xl text-left transition-all duration-300
                ${isSelected
                    ? 'glass-panel border-blue-300 shadow-lg shadow-blue-200/30'
                    : 'glass-panel-light hover:bg-gray-100'
                }
                ${isLimitReached ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            {isSelected && (
                <div className="absolute top-2 right-2">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                </div>
            )}

            <div className="flex items-start gap-3">
                <span className="text-3xl">{icon}</span>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-800">{label}</h4>
                        {subscription && getPlanBadge(subscription.plan)}
                    </div>

                    {agencyName && (
                        <p className="text-xs text-gray-400 mb-2">{agencyName}</p>
                    )}

                    {subscription ? (
                        subscription.plan === 'none' ? (
                            <div className="space-y-2">
                                <div className="p-3 glass-fieldset border-red-200 rounded-lg">
                                    <p className="text-xs text-red-600 font-medium mb-1">
                                        {t('seller:roleSelector.proRequired.title')}
                                    </p>
                                    <p className="text-xs text-red-600">
                                        {t('seller:roleSelector.proRequired.description')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="w-full px-3 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold rounded-lg hover:from-amber-500 hover:to-orange-600 transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
                                    }}
                                >
                                    {t('seller:roleSelector.proRequired.button')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Show shared limit info for Pro users */}
                                {subscription.isPro ? (
                                    <div className="mb-2 p-2 glass-fieldset border-amber-200 rounded">
                                        <p className="text-xs text-amber-600 font-medium">
                                            {t('seller:roleSelector.sharedLimit', { used: subscription.used, limit: subscription.limit })}
                                        </p>
                                        <p className="text-xs text-amber-500 mt-0.5">
                                            {t('seller:roleSelector.asRole', { count: subscription.roleCount || 0, role: role === UserRole.AGENT ? t('seller:roleSelector.agent').toLowerCase() : t('seller:roleSelector.privateSeller').toLowerCase() })}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400">{t('seller:roleSelector.listings')}</span>
                                        <span className={`font-semibold ${isLimitReached ? 'text-red-600' : 'text-gray-700'}`}>
                                            {subscription.used} / {subscription.limit}
                                        </span>
                                    </div>
                                )}

                                {/* Progress bar */}
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            isLimitReached
                                                ? 'bg-red-500'
                                                : remaining <= 2
                                                    ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${Math.min((subscription.used / subscription.limit) * 100, 100)}%` }}
                                    />
                                </div>

                                {isLimitReached ? (
                                    <p className="text-xs text-red-600 font-medium mt-1">
                                        {subscription.isPro ? t('seller:roleSelector.limitReachedShared') : t('seller:roleSelector.limitReachedUpgrade')}
                                    </p>
                                ) : remaining <= 2 ? (
                                    <p className="text-xs text-amber-600 font-medium mt-1">
                                        {t('seller:roleSelector.remainingListings', { count: remaining })} {subscription.isPro ? t('seller:roleSelector.shared') : ''}
                                    </p>
                                ) : (
                                    <p className="text-xs text-emerald-600 font-medium mt-1">
                                        {t('seller:roleSelector.availableListings', { count: remaining })} {subscription.isPro ? t('seller:roleSelector.shared') : ''}
                                    </p>
                                )}

                                {/* Promotion coupons for Pro users */}
                                {subscription.isPro && (subscription.featuredCoupons || subscription.highlightedCoupons) ? (
                                    <div className="mt-2 p-2 glass-fieldset border-purple-200 rounded text-xs space-y-1.5">
                                        <p className="text-purple-600 font-semibold flex items-center gap-1">
                                            <span>🎟️</span> Promotion Coupons
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {subscription.featuredCoupons !== undefined && (
                                                <div className="bg-gray-50 p-1.5 rounded">
                                                    <p className="text-purple-600 font-medium">
                                                        ⭐ Featured: {subscription.featuredCoupons}
                                                    </p>
                                                    <p className="text-purple-500 text-[11px]">
                                                        {subscription.featuredDuration} days each
                                                    </p>
                                                </div>
                                            )}
                                            {subscription.highlightedCoupons !== undefined && (
                                                <div className="bg-gray-50 p-1.5 rounded">
                                                    <p className="text-amber-500 font-medium">
                                                        🔥 Highlighted: {subscription.highlightedCoupons}
                                                    </p>
                                                    <p className="text-amber-500 text-[11px]">
                                                        {subscription.highlightedDuration} days each
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {subscription.usedCoupons ? (
                                            <p className="text-purple-500 text-[11px]">
                                                Used this month: {subscription.usedCoupons}
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        )
                    ) : (
                        <p className="text-xs text-gray-400">{t('seller:roleSelector.noSubscriptionData')}</p>
                    )}
                </div>
            </div>
        </button>
    );
};

export default RoleSelector;
