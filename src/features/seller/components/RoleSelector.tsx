import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, UserRole } from '@/types';
import { useAppContext } from '@/context/AppContext';
import {
    LISTING_LIMITS,
    PROMOTION_CONFIGS,
    canPostAsRole,
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

    // Determine which roles to show based on subscription
    // Agency agents can ONLY post as agent (not as private seller)
    const isAgencyAgent = subscription?.tier === 'agency_agent';
    const hasPrivateSeller = !isAgencyAgent; // Hide private seller for agency agents
    const hasAgent = true; // Always show agent option

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
     */
    const getRoleSubscription = (role: UserRole) => {
        // Get subscription data from the unified subscription field
        const sub = currentUser.subscription;

        if (sub) {
            const tier = sub.tier || 'free';

            // Determine if this is a Pro-level subscription
            const proTiers = ['pro', 'agency_owner', 'agency_agent'];
            const isPro = proTiers.includes(tier) || (sub.status === 'active' && tier !== 'free' && tier !== 'buyer');

            // Get the correct listing limit based on tier
            const limit = sub.listingsLimit ?? LISTING_LIMITS[tier] ?? 3;

            // Get counts
            const used = sub.activeListingsCount || 0;
            const roleCount = role === UserRole.AGENT
                ? (sub.agentCount || 0)
                : (sub.privateSellerCount || 0);

            // Get promotion coupons
            const promotionCoupons = sub.promotionCoupons || {};
            const featuredCoupons = promotionCoupons.featured || 0;
            const highlightedCoupons = promotionCoupons.highlighted || 0;
            const totalCoupons = promotionCoupons.available ?? (featuredCoupons + highlightedCoupons);
            const usedCoupons = promotionCoupons.used || 0;

            return {
                plan: tier,
                limit,
                used,
                roleCount,
                isActive: sub.status === 'active' || sub.status === 'trial',
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
                limit: legacySub.totalListingsLimit || 25,
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
                return <span className="text-xs font-semibold px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded">{t('seller:roleSelector.badges.free')}</span>;
            case 'none':
                return <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 text-red-700 rounded">{t('seller:roleSelector.badges.proRequired')}</span>;
            default:
                // For any other paid plan, show as Pro
                if (normalizedPlan && normalizedPlan !== 'free' && normalizedPlan !== 'buyer') {
                    return <span className="text-xs font-semibold px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded">{t('seller:roleSelector.badges.pro')}</span>;
                }
                return null;
        }
    };

    return (
        <div className="bg-white border-2 border-primary/20 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-bold text-neutral-800">{t('seller:roleSelector.title')}</h3>
                <div className="flex-1 h-px bg-neutral-200"></div>
            </div>

            <p className="text-sm text-neutral-600 mb-4">
                {t('seller:roleSelector.description')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    const remaining = subscription ? subscription.limit - subscription.used : 0;
    const isLimitReached = subscription ? (subscription.plan === 'none' || subscription.used >= subscription.limit) : false;

    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={isLimitReached}
            className={`
                relative p-4 rounded-lg border-2 text-left transition-all duration-200
                ${isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-neutral-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }
                ${isLimitReached ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            {isSelected && (
                <div className="absolute top-2 right-2">
                    <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                </div>
            )}

            <div className="flex items-start gap-3">
                <span className="text-3xl">{icon}</span>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-neutral-800">{label}</h4>
                        {subscription && getPlanBadge(subscription.plan)}
                    </div>

                    {agencyName && (
                        <p className="text-xs text-neutral-600 mb-2">{agencyName}</p>
                    )}

                    {subscription ? (
                        subscription.plan === 'none' ? (
                            <div className="space-y-2">
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-xs text-red-700 font-medium mb-1">
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
                                        dispatch({ type: 'TOGGLE_PRICING_MODAL', payload: { isOpen: true } });
                                    }}
                                >
                                    {t('seller:roleSelector.proRequired.button')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Show shared limit info for Pro users */}
                                {subscription.isPro ? (
                                    <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded">
                                        <p className="text-xs text-amber-800 font-medium">
                                            {t('seller:roleSelector.sharedLimit', { used: subscription.used, limit: subscription.limit })}
                                        </p>
                                        <p className="text-xs text-amber-700 mt-0.5">
                                            {t('seller:roleSelector.asRole', { count: subscription.roleCount || 0, role: role === UserRole.AGENT ? t('seller:roleSelector.agent').toLowerCase() : t('seller:roleSelector.privateSeller').toLowerCase() })}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-neutral-600">{t('seller:roleSelector.listings')}</span>
                                        <span className={`font-semibold ${isLimitReached ? 'text-red-600' : 'text-neutral-800'}`}>
                                            {subscription.used} / {subscription.limit}
                                        </span>
                                    </div>
                                )}

                                {/* Progress bar */}
                                <div className="w-full bg-neutral-200 rounded-full h-1.5">
                                    <div
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            isLimitReached
                                                ? 'bg-red-500'
                                                : remaining <= 2
                                                    ? 'bg-amber-500'
                                                    : 'bg-green-500'
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
                                    <p className="text-xs text-green-600 font-medium mt-1">
                                        {t('seller:roleSelector.availableListings', { count: remaining })} {subscription.isPro ? t('seller:roleSelector.shared') : ''}
                                    </p>
                                )}

                                {/* Promotion coupons for Pro users */}
                                {subscription.isPro && (subscription.featuredCoupons || subscription.highlightedCoupons) ? (
                                    <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs space-y-1.5">
                                        <p className="text-purple-800 font-semibold flex items-center gap-1">
                                            <span>🎟️</span> Promotion Coupons
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {subscription.featuredCoupons !== undefined && (
                                                <div className="bg-white/60 p-1.5 rounded">
                                                    <p className="text-purple-700 font-medium">
                                                        ⭐ Featured: {subscription.featuredCoupons}
                                                    </p>
                                                    <p className="text-purple-500 text-[10px]">
                                                        {subscription.featuredDuration} days each
                                                    </p>
                                                </div>
                                            )}
                                            {subscription.highlightedCoupons !== undefined && (
                                                <div className="bg-white/60 p-1.5 rounded">
                                                    <p className="text-amber-700 font-medium">
                                                        🔥 Highlighted: {subscription.highlightedCoupons}
                                                    </p>
                                                    <p className="text-amber-500 text-[10px]">
                                                        {subscription.highlightedDuration} days each
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {subscription.usedCoupons ? (
                                            <p className="text-purple-600 text-[10px]">
                                                Used this month: {subscription.usedCoupons}
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        )
                    ) : (
                        <p className="text-xs text-neutral-500">{t('seller:roleSelector.noSubscriptionData')}</p>
                    )}
                </div>
            </div>
        </button>
    );
};

export default RoleSelector;
