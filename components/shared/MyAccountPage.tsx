import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import MyListings from './MyListings';
import SubscriptionManagement from './SubscriptionManagement';
import ProfileStatistics from './ProfileStatistics';
import MyPromotions from './MyPromotions';
import MyMeasurements from './MyMeasurements';

const ViewingRequestsTab = lazy(() => import('./ViewingRequestsTab'));
const MyBusinessListings = lazy(() => import('./MyBusinessListings'));
const MyListingFeeds = lazy(() => import('../../src/features/listing-sources/components/MyListingFeeds'));
import { User, UserRole, Agency } from '../../types';
import { BuildingOfficeIcon, BuildingStorefrontIcon, ChartBarIcon, UserCircleIcon, ArrowLeftOnRectangleIcon, XMarkIcon, MapPinIcon, CreditCardIcon, ShieldCheckIcon, SparklesIcon, CalendarIcon, HomeIcon, ClockIcon, ExclamationTriangleIcon, CheckCircleIcon, GlobeAltIcon } from '../../constants';
import DefaultAvatar from './DefaultAvatar';
import AvatarCustomizer, { type AvatarOptions, parseAvatarOptions, getDefaultAvatarOptions } from './AvatarCustomizer';
import AgentLicenseModal from './AgentLicenseModal';
import AgencyManagementSection from './AgencyManagementSection';
import { switchRole, joinAgencyByInvitationCode, getAgencies, updateAgentProfile, changeEmail } from '../../services/apiService';
import { submitLicense, getLicenseFormatHint } from '../../src/features/credentials/api/licenseApi';
import Footer from './Footer';
import PhoneInput from '../../src/shared/components/ui/PhoneInput';
import { BALKAN_LOCATIONS } from '../../utils/balkanLocations';
import MapLocationPicker from '../../src/features/seller/components/MapLocationPicker';
import { SEO } from '../../src/components/seo';
import { useConfirmation } from '../../src/shared/hooks/useConfirmation';
import { useNotification } from '../../src/shared/hooks/useNotification';
import { buildLocalizedPath } from '../../src/utils/languageRouting';
import { API_URL } from '../../src/shared/api/config';
import { csrfHeaders, ensureCsrfToken } from '../../src/shared/api/httpClient';
import { apiLogger } from '../../src/shared/utils/logger';
import { tokenService } from '../../src/shared/api/tokenService';
import PushNotificationToggle from '../../src/features/notifications/components/PushNotificationToggle';

// Common languages spoken in the Balkan region
const BALKAN_LANGUAGES = [
  'English', 'Serbian', 'Croatian', 'Slovenian', 'Bosnian', 'Macedonian',
  'Albanian', 'Montenegrin', 'Bulgarian', 'Romanian', 'Greek', 'Turkish',
  'Hungarian', 'German', 'Italian', 'French', 'Russian', 'Spanish'
];

// Balkan countries for license submission
const BALKAN_COUNTRIES = [
  { code: 'RS', name: 'Serbia' },
  { code: 'HR', name: 'Croatia' },
  { code: 'BA', name: 'Bosnia & Herzegovina' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'AL', name: 'Albania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'GR', name: 'Greece' },
  { code: 'RO', name: 'Romania' },
  { code: 'XK', name: 'Kosovo' },
  { code: 'SI', name: 'Slovenia' },
];

type AccountTab = 'listings' | 'performance' | 'profile' | 'subscription' | 'security' | 'promotions' | 'measurements' | 'viewings' | 'businesses' | 'feeds';

// Map URL slugs to account tabs
const tabRouteMap: Record<string, AccountTab> = {
    'listings': 'listings',
    'my-listings': 'listings',
    'promotions': 'promotions',
    'my-promotions': 'promotions',
    'performance': 'performance',
    'stats': 'performance',
    'statistics': 'performance',
    'subscription': 'subscription',
    'profile': 'profile',
    'settings': 'profile',
    'profile-settings': 'profile',
    'security': 'security',
    'measurements': 'measurements',
    'my-measurements': 'measurements',
    'viewings': 'viewings',
    'viewing-requests': 'viewings',
    'businesses': 'businesses',
    'my-businesses': 'businesses',
    'feeds': 'feeds',
    'listing-feeds': 'feeds',
    'external-feeds': 'feeds',
};

// Map account tabs to URL slugs
const tabToRouteMap: Record<AccountTab, string> = {
    'listings': 'listings',
    'promotions': 'promotions',
    'performance': 'performance',
    'subscription': 'subscription',
    'profile': 'profile',
    'security': 'security',
    'measurements': 'measurements',
    'viewings': 'viewings',
    'businesses': 'businesses',
    'feeds': 'feeds',
};

const TabButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    tabKey: AccountTab;
    hasUnread?: boolean;
}> = ({ label, icon, isActive, onClick, tabKey, hasUnread }) => {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onClick();
    };

    return (
        <a
            href={buildLocalizedPath(`/account/${tabToRouteMap[tabKey]}`)}
            onClick={handleClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all w-full text-left backdrop-blur-sm border ${
                isActive
                    ? 'bg-white/60 text-primary-dark border-white/60 shadow-sm'
                    : 'text-neutral-600 hover:bg-white/40 border-transparent hover:border-white/30'
            }`}
        >
            {icon}
            <span className="flex-1">{label}</span>
            {hasUnread && (
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0 animate-pulse" />
            )}
        </a>
    );
};

const ROLE_HINTS: Record<UserRole, { icon: string; titleKey: string; descKey: string; features: string[]; color: string }> = {
    [UserRole.BUYER]: {
        icon: '🔍',
        titleKey: 'roles.hints.buyer.title',
        descKey: 'roles.hints.buyer.description',
        features: ['roles.hints.buyer.f1', 'roles.hints.buyer.f2', 'roles.hints.buyer.f3'],
        color: 'blue',
    },
    [UserRole.PRIVATE_SELLER]: {
        icon: '🏠',
        titleKey: 'roles.hints.privateSeller.title',
        descKey: 'roles.hints.privateSeller.description',
        features: ['roles.hints.privateSeller.f1', 'roles.hints.privateSeller.f2', 'roles.hints.privateSeller.f3'],
        color: 'emerald',
    },
    [UserRole.AGENT]: {
        icon: '🏢',
        titleKey: 'roles.hints.agent.title',
        descKey: 'roles.hints.agent.description',
        features: ['roles.hints.agent.f1', 'roles.hints.agent.f2', 'roles.hints.agent.f3'],
        color: 'indigo',
    },
    [UserRole.ADMIN]: {
        icon: '⚙️',
        titleKey: 'roles.hints.admin.title',
        descKey: 'roles.hints.admin.description',
        features: [],
        color: 'gray',
    },
    [UserRole.SUPER_ADMIN]: {
        icon: '🛡️',
        titleKey: 'roles.hints.superAdmin.title',
        descKey: 'roles.hints.superAdmin.description',
        features: [],
        color: 'gray',
    },
};

const ROLE_HINT_DEFAULTS: Record<UserRole, { title: string; description: string; features: string[] }> = {
    [UserRole.BUYER]: {
        title: 'Buyer',
        description: 'Browse and save properties. No listing or agent features.',
        features: ['Search & filter all properties', 'Save favourite listings', 'Request viewings & contact agents'],
    },
    [UserRole.PRIVATE_SELLER]: {
        title: 'Private Seller',
        description: 'List your own properties without agency affiliation.',
        features: ['Post up to your plan\'s listing limit', 'Manage & promote your listings', 'Receive direct buyer inquiries'],
    },
    [UserRole.AGENT]: {
        title: 'Real Estate Agent',
        description: 'Full professional tools. Requires a valid license number.',
        features: ['Agent profile & verified badge', 'Higher listing limits & promotions', 'Join or manage an agency'],
    },
    [UserRole.ADMIN]: {
        title: 'Admin',
        description: 'Platform administration.',
        features: [],
    },
    [UserRole.SUPER_ADMIN]: {
        title: 'Super Admin',
        description: 'Full platform administration.',
        features: [],
    },
};

const RoleSelector: React.FC<{
    selectedRole: UserRole;
    originalRole: UserRole;
    agencyId?: string;
    agencyName?: string;
    onChange: (role: UserRole) => void;
}> = ({ selectedRole, originalRole, agencyId, agencyName, onChange }) => {
    const { t } = useTranslation(['account']);
    const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

    const roles: { id: UserRole; labelKey: string; icon: string }[] = [
        { id: UserRole.BUYER, labelKey: 'roles.buyer', icon: '🔍' },
        { id: UserRole.PRIVATE_SELLER, labelKey: 'roles.privateSeller', icon: '🏠' },
        { id: UserRole.AGENT, labelKey: 'roles.agent', icon: '🏢' },
    ];

    const isAgencyMember = !!agencyId;

    const isDisabled = (role: UserRole) =>
        originalRole === UserRole.AGENT && role === UserRole.BUYER;

    const handleRoleClick = (role: UserRole) => {
        if (isDisabled(role)) return;
        if (role === selectedRole) {
            setPendingRole(null);
            return;
        }
        setPendingRole(role);
    };

    const handleConfirm = () => {
        if (pendingRole) {
            onChange(pendingRole);
            setPendingRole(null);
        }
    };

    const handleCancel = () => {
        setPendingRole(null);
    };

    const hintRole = pendingRole;
    const hint = hintRole ? (ROLE_HINT_DEFAULTS[hintRole]) : null;
    const hintConfig = hintRole ? ROLE_HINTS[hintRole] : null;

    const colorMap: Record<string, string> = {
        blue: 'bg-blue-50/80 border-blue-200/60 text-blue-800',
        emerald: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-800',
        indigo: 'bg-indigo-50/80 border-indigo-200/60 text-indigo-800',
        gray: 'bg-gray-50/80 border-gray-200/60 text-gray-800',
    };
    const confirmColorMap: Record<string, string> = {
        blue: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
        emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
        indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200',
        gray: 'bg-gray-600 hover:bg-gray-700 text-white shadow-gray-200',
    };
    const featureDotMap: Record<string, string> = {
        blue: 'bg-blue-500',
        emerald: 'bg-emerald-500',
        indigo: 'bg-indigo-500',
        gray: 'bg-gray-500',
    };

    return (
        <div className="space-y-3">
            {/* Role Pills */}
            <div className="flex items-center gap-1 bg-white/30 backdrop-blur-md p-1 rounded-2xl border border-white/40 shadow-sm">
                {roles.map(role => {
                    const active = selectedRole === role.id;
                    const isPending = pendingRole === role.id;
                    const disabled = isDisabled(role.id);
                    return (
                        <button
                            key={role.id}
                            type="button"
                            onClick={() => handleRoleClick(role.id)}
                            disabled={disabled}
                            aria-pressed={active}
                            title={disabled ? t('roles.agentCannotSwitchToBuyer') : ''}
                            className={`
                                flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-semibold
                                transition-all duration-200 flex-1 min-w-0
                                ${active
                                    ? 'bg-white/70 text-primary shadow-md backdrop-blur-sm border border-white/50'
                                    : isPending
                                    ? 'bg-white/50 text-neutral-700 border border-white/40 ring-2 ring-primary/20'
                                    : disabled
                                    ? 'text-neutral-400 cursor-not-allowed opacity-50'
                                    : 'text-neutral-600 hover:bg-white/40 border border-transparent'
                                }
                            `}
                        >
                            <span className="text-base leading-none hidden xs:inline sm:inline">{role.icon}</span>
                            <span className="truncate">{t(role.labelKey)}</span>
                        </button>
                    );
                })}
            </div>

            {/* Agency member warning when trying to switch to Private Seller */}
            {hintRole === UserRole.PRIVATE_SELLER && isAgencyMember && (
                <div className="rounded-2xl border p-4 backdrop-blur-sm transition-all duration-200 animate-in fade-in slide-in-from-top-2 bg-amber-50/80 border-amber-200/60 text-amber-800">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0 mt-0.5">&#x26A0;&#xFE0F;</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight">
                                {t('roles.agencyMemberWarning.title', 'You are part of an agency')}
                            </p>
                            <p className="text-xs mt-0.5 opacity-80">
                                {t('roles.agencyMemberWarning.description', 'To switch your profile to Private Seller, you must leave {{agencyName}} first. Note: You can still post individual listings as a private seller without switching your profile role.', { agencyName: agencyName || 'your agency' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-current/20 bg-white/40 hover:bg-white/60 transition-colors"
                        >
                            {t('roles.hints.cancel', 'Cancel')}
                        </button>
                    </div>
                </div>
            )}

            {/* Role Hint Card (normal, non-agency-blocked) */}
            {hintRole && hint && hintConfig && !(hintRole === UserRole.PRIVATE_SELLER && isAgencyMember) && (
                <div className={`rounded-2xl border p-4 backdrop-blur-sm transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${colorMap[hintConfig.color]}`}>
                    <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0 mt-0.5">{hintConfig.icon}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight">{hint.title}</p>
                            <p className="text-xs mt-0.5 opacity-80">{hint.description}</p>
                            {hint.features.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                    {hint.features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-xs opacity-90">
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${featureDotMap[hintConfig.color]}`} />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-current/20 bg-white/40 hover:bg-white/60 transition-colors"
                        >
                            {t('roles.hints.cancel', 'Cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl shadow-lg transition-all ${confirmColorMap[hintConfig.color]}`}
                        >
                            {t('roles.hints.switchTo', 'Switch to')} {hint.title}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const LoginHistorySection: React.FC = () => {
    const { t } = useTranslation(['account']);
    const [loginHistory, setLoginHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        const fetchLoginHistory = async () => {
            try {
                const { getLoginHistory } = await import('../../services/apiService');
                const history = await getLoginHistory();
                setLoginHistory(history);
            } catch (error) {
            } finally {
                setIsLoading(false);
            }
        };

        fetchLoginHistory();
    }, []);

    const displayedHistory = showAll ? loginHistory : loginHistory.slice(0, 5);

    const formatTimestamp = (timestamp: Date) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getBrowserInfo = (userAgent?: string) => {
        if (!userAgent) return t('security.unknown');
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return t('security.unknownBrowser');
    };

    if (isLoading) {
        return (
            <div className="bg-blue-50/60 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-4">
                <p className="text-sm text-blue-700">{t('security.loadingLoginHistory')}</p>
            </div>
        );
    }

    return (
        <div className="bg-blue-50/60 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1">
                    <h4 className="font-semibold text-blue-800 text-sm mb-2">{t('security.recentLoginActivity')}</h4>
                    {loginHistory.length === 0 ? (
                        <p className="text-sm text-blue-700">{t('security.noLoginHistory')}</p>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {displayedHistory.map((entry, index) => (
                                    <div key={index} className="bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/40">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    {entry.success ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                            ✓ {t('security.success')}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                            ✗ {t('security.failed')}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-600">{formatTimestamp(entry.timestamp)}</span>
                                                </div>
                                                <div className="mt-1 text-xs text-gray-600">
                                                    <p className="flex items-center gap-1">
                                                        <span className="font-medium">{t('security.ip')}:</span> {entry.ipAddress || t('security.unknown')}
                                                    </p>
                                                    <p className="flex items-center gap-1">
                                                        <span className="font-medium">{t('security.device')}:</span> {getBrowserInfo(entry.userAgent)}
                                                    </p>
                                                    {!entry.success && entry.failureReason && (
                                                        <p className="flex items-center gap-1 text-red-600">
                                                            <span className="font-medium">{t('security.reason')}:</span> {entry.failureReason}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {loginHistory.length > 5 && (
                                <button
                                    type="button"
                                    onClick={() => setShowAll(!showAll)}
                                    className="mt-3 text-sm text-blue-700 hover:text-blue-800 font-medium"
                                >
                                    {showAll ? t('security.showLess') : t('security.showAll', { count: loginHistory.length })}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const PasswordToggleButton: React.FC<{ show: boolean; onToggle: () => void }> = ({ show, onToggle }) => (
    <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
        ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        )}
    </button>
);

const passwordInputClasses = "w-full px-4 py-2 pr-10 bg-white/40 backdrop-blur-sm border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-white/60 transition-all shadow-sm";

const ChangePasswordSection: React.FC = () => {
    const { t } = useTranslation(['account']);
    const { state, dispatch, checkAuthStatus } = useAppContext();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const hasPassword = state.currentUser?.hasPassword === true;
    const isSocialAccount = state.currentUser?.provider && state.currentUser.provider !== 'local';

    const validatePasswordStrength = (pw: string): string | null => {
        if (pw.length < 8) return t('security.passwordMinLength', 'Password must be at least 8 characters');
        if (!/[A-Z]/.test(pw)) return t('security.passwordNeedsUppercase', 'Password must contain an uppercase letter');
        if (!/[a-z]/.test(pw)) return t('security.passwordNeedsLowercase', 'Password must contain a lowercase letter');
        if (!/\d/.test(pw)) return t('security.passwordNeedsNumber', 'Password must contain a number');
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) return t('security.passwordNeedsSpecial', 'Password must contain a special character');
        return null;
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const strengthError = validatePasswordStrength(newPassword);
        if (strengthError) { setError(strengthError); return; }
        if (newPassword !== confirmPassword) { setError(t('security.passwordsDoNotMatch')); return; }

        setIsLoading(true);
        try {
            const { changePassword } = await import('../../services/apiService');
            await changePassword(currentPassword, newPassword);
            setSuccess(t('security.passwordChangedSuccess'));
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
            setTimeout(() => {
                dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: false, user: null } });
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
                dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: 'login' });
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to change password');
        } finally { setIsLoading(false); }
    };

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const strengthError = validatePasswordStrength(newPassword);
        if (strengthError) { setError(strengthError); return; }
        if (newPassword !== confirmPassword) { setError(t('security.passwordsDoNotMatch')); return; }

        setIsLoading(true);
        try {
            const { setPasswordForSocialUser } = await import('../../services/apiService');
            await setPasswordForSocialUser(newPassword);
            setSuccess(t('security.passwordSetSuccess', 'Password set successfully! You can now also log in with your email and password.'));
            setNewPassword(''); setConfirmPassword('');
            // Refresh user state to reflect the provider change
            await checkAuthStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to set password');
        } finally { setIsLoading(false); }
    };

    const alertBox = (type: 'error' | 'success', message: string) => {
        const isErr = type === 'error';
        return (
            <div className={`mb-4 p-3 ${isErr ? 'bg-red-50/60 border-red-200/50' : 'bg-green-50/60 border-green-200/50'} backdrop-blur-sm border rounded-xl flex items-start gap-2`}>
                <svg className={`w-5 h-5 ${isErr ? 'text-red-600' : 'text-green-600'} mt-0.5 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isErr
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    }
                </svg>
                <p className={`${isErr ? 'text-red-800' : 'text-green-800'} text-sm`}>{message}</p>
            </div>
        );
    };

    // Social account without password: show "Set Password" form
    if (isSocialAccount && !hasPassword) {
        return (
            <div className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-neutral-800 mb-2">{t('security.setPassword', 'Set a Password')}</h3>
                <p className="text-sm text-neutral-500 mb-4">
                    {t('security.setPasswordDescription', 'You signed in with a social account. Set a password to also be able to log in with your email and password.')}
                </p>

                {error && alertBox('error', error)}
                {success && alertBox('success', success)}

                <form onSubmit={handleSetPassword} className="space-y-4">
                    <div>
                        <label htmlFor="newPasswordSet" className="block text-sm font-medium text-gray-700 mb-1">{t('security.newPassword')}</label>
                        <div className="relative">
                            <input type={showNewPassword ? "text" : "password"} id="newPasswordSet" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={passwordInputClasses} required disabled={isLoading} />
                            <PasswordToggleButton show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{t('security.passwordRequirements')}</p>
                    </div>
                    <div>
                        <label htmlFor="confirmPasswordSet" className="block text-sm font-medium text-gray-700 mb-1">{t('security.confirmNewPassword')}</label>
                        <div className="relative">
                            <input type={showConfirmPassword ? "text" : "password"} id="confirmPasswordSet" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={passwordInputClasses} required disabled={isLoading} />
                            <PasswordToggleButton show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full px-4 py-2 bg-primary/80 backdrop-blur-sm text-white font-medium rounded-xl hover:bg-primary transition-all shadow-lg shadow-primary/20 border border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? t('security.settingPassword', 'Setting password...') : t('security.setPassword', 'Set a Password')}
                    </button>
                </form>
            </div>
        );
    }

    // Local auth user: show "Change Password" form
    return (
        <div className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">{t('security.changePassword')}</h3>

            {error && alertBox('error', error)}
            {success && alertBox('success', success)}

            <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">{t('security.currentPassword')}</label>
                    <div className="relative">
                        <input type={showCurrentPassword ? "text" : "password"} id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={passwordInputClasses} required disabled={isLoading} />
                        <PasswordToggleButton show={showCurrentPassword} onToggle={() => setShowCurrentPassword(!showCurrentPassword)} />
                    </div>
                </div>
                <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">{t('security.newPassword')}</label>
                    <div className="relative">
                        <input type={showNewPassword ? "text" : "password"} id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={passwordInputClasses} required disabled={isLoading} />
                        <PasswordToggleButton show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{t('security.passwordRequirements')}</p>
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">{t('security.confirmNewPassword')}</label>
                    <div className="relative">
                        <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={passwordInputClasses} required disabled={isLoading} />
                        <PasswordToggleButton show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                    </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full px-4 py-2 bg-primary/80 backdrop-blur-sm text-white font-medium rounded-xl hover:bg-primary transition-all shadow-lg shadow-primary/20 border border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? t('security.changingPassword') : t('security.changePassword')}
                </button>
            </form>
        </div>
    );
};

const DeleteAgencySection: React.FC = () => {
    const { t } = useTranslation(['account']);
    const { state, dispatch, checkAuthStatus } = useAppContext();
    const { confirm } = useConfirmation();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    const agencyId = state.currentUser?.agencyId;
    if (!agencyId) return null;

    const handleDeleteAgency = async () => {
        setError('');
        const confirmed = await confirm({
            title: t('security.deleteAgencyTitle', 'Delete Agency'),
            message: t('security.deleteAgencyConfirm', 'This will permanently delete your agency. All agents will be transferred to a Pro monthly plan for the remaining duration of the agency subscription. This cannot be undone.'),
            confirmLabel: t('security.deleteAgencyButton', 'Yes, Delete Agency'),
            cancelLabel: t('security.cancelButton', 'Cancel'),
            type: 'danger',
        });
        if (!confirmed) return;

        setIsDeleting(true);
        try {
            await ensureCsrfToken();
            const response = await fetch(`${API_URL}/agencies/${agencyId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${tokenService.getAccessToken()}`,
                    ...csrfHeaders(),
                },
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || t('security.deleteAgencyFailed', 'Failed to delete agency'));
                return;
            }
            await checkAuthStatus();
            dispatch({ type: 'SHOW_ALERT', payload: { type: 'success', title: t('security.agencyDeleted', 'Agency Deleted'), message: data.message } });
        } catch {
            setError(t('security.deleteAgencyFailed', 'Failed to delete agency'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-red-50/60 backdrop-blur-sm border border-red-200/50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
                <BuildingOfficeIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <h4 className="font-semibold text-red-800 text-sm">{t('security.deleteAgency', 'Delete Agency')}</h4>
                    <p className="text-sm text-red-700 mt-1">
                        {t('security.deleteAgencyDescription', 'Permanently delete your agency. Active agents will be transferred to Pro monthly plan until the current subscription expires.')}
                    </p>
                    {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                    <button
                        type="button"
                        onClick={handleDeleteAgency}
                        disabled={isDeleting}
                        className="mt-3 px-4 py-2 bg-red-600/80 backdrop-blur-sm text-white font-medium rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-600/20 border border-red-500/30 text-sm disabled:opacity-50"
                    >
                        {isDeleting ? t('security.deleting', 'Deleting...') : t('security.deleteAgency', 'Delete Agency')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DeleteAccountSection: React.FC = () => {
    const { t } = useTranslation(['account']);
    const { state, dispatch } = useAppContext();
    const { confirm } = useConfirmation();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    const hasPassword = state.currentUser?.hasPassword === true;

    const handleDeleteAccount = async () => {
        setError('');
        if (hasPassword && !password.trim()) {
            setError(t('security.passwordRequiredToDelete', 'Please enter your password to confirm deletion'));
            return;
        }

        const confirmed = await confirm({
            title: t('security.deleteAccountTitle', 'Delete Account'),
            message: t('security.deleteAccountConfirm', 'This action is PERMANENT and cannot be undone. All your data, listings, and subscriptions will be deleted. Are you sure?'),
            confirmLabel: t('security.deleteAccountButton', 'Yes, Delete My Account'),
            cancelLabel: t('security.cancelButton', 'Cancel'),
            type: 'danger',
        });

        if (!confirmed) return;

        setIsDeleting(true);
        try {
            const { encryptSensitiveFields } = await import('@/src/shared/api/payloadEncryption');
            let body: Record<string, any> = {};
            if (hasPassword) {
                body = await encryptSensitiveFields({ password }, ['password']);
            }

            await ensureCsrfToken();
            const response = await fetch(`${API_URL}/auth/delete-account`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenService.getAccessToken()}`,
                    ...csrfHeaders(),
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();
            if (!response.ok) {
                setError(data.message || t('security.deleteAccountFailed', 'Failed to delete account'));
                return;
            }

            // Immediately clear all auth state and redirect
            localStorage.removeItem('balkan_estate_token');
            localStorage.removeItem('balkan_estate_refresh_token');
            dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: false, user: null } });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
        } catch {
            setError(t('security.deleteAccountFailed', 'Failed to delete account'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-red-50/60 backdrop-blur-sm border border-red-200/50 rounded-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <div>
                    <h4 className="font-semibold text-red-800 text-sm">{t('security.deleteAccount', 'Delete Account')}</h4>
                    <p className="text-sm text-red-700 mt-1">
                        {t('security.deleteAccountDescription', 'Permanently delete your account and all associated data. This action cannot be undone.')}
                    </p>
                </div>
            </div>

            {hasPassword && (
                <div className="mb-4">
                    <label htmlFor="deletePassword" className="block text-sm font-medium text-red-800 mb-1">
                        {t('security.enterPasswordToConfirm', 'Enter your password to confirm')}
                    </label>
                    <div className="relative max-w-sm">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="deletePassword"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            placeholder={t('security.password', 'Password')}
                            className="w-full px-4 py-2 pr-10 border border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:border-red-300 bg-white/60 backdrop-blur-sm"
                            disabled={isDeleting}
                        />
                        <PasswordToggleButton show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-100/60 border border-red-300/50 rounded-xl flex items-start gap-2">
                    <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || (hasPassword && !password.trim())}
                className="px-5 py-2.5 bg-red-600/80 backdrop-blur-sm text-white font-medium rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-600/20 border border-red-500/30 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isDeleting ? t('security.deleting', 'Deleting...') : t('security.deleteAccount', 'Delete Account')}
            </button>
        </div>
    );
};

const SecuritySettings: React.FC<{ logoutAllDevices: () => Promise<void> }> = ({ logoutAllDevices }) => {
    const { t } = useTranslation(['account']);
    const { dispatch } = useAppContext();
    const { confirm } = useConfirmation();

    const handleLogoutAllDevices = async () => {
        const confirmed = await confirm({
            title: t('security.logoutAllDevicesTitle', 'Logout All Devices'),
            message: t('security.confirmLogoutAllDevices'),
            confirmLabel: t('security.logoutButton', 'Logout All'),
            cancelLabel: t('security.cancelButton', 'Cancel'),
            type: 'warning',
        });

        if (confirmed) {
            await logoutAllDevices();
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-neutral-800 mb-2">{t('security.title')}</h2>
                <p className="text-neutral-600">{t('security.description')}</p>
            </div>

            {/* Change Password */}
            <ChangePasswordSection />

            {/* Logout from All Devices */}
            <div className="bg-yellow-50/60 backdrop-blur-sm border border-yellow-200/50 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                        <h4 className="font-semibold text-yellow-800 text-sm">{t('security.logoutAllDevices')}</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                            {t('security.logoutAllDevicesDescription')}
                        </p>
                        <button
                            type="button"
                            onClick={handleLogoutAllDevices}
                            className="mt-3 px-4 py-2 bg-yellow-600/80 backdrop-blur-sm text-white font-medium rounded-xl hover:bg-yellow-600 transition-all shadow-lg shadow-yellow-600/20 border border-yellow-500/30 text-sm"
                        >
                            {t('security.logoutAllDevices')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Login History */}
            <LoginHistorySection />

            {/* Delete Account */}
            <DeleteAccountSection />
        </div>
    );
};

const ProfileSettings: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const { t } = useTranslation(['account']);
    const { updateUser, dispatch } = useAppContext();
    const { success } = useNotification();
    const { confirm } = useConfirmation();
    const [formData, setFormData] = useState<User>(user);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
    const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
    const [error, setError] = useState('');
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [invitationCode, setInvitationCode] = useState('');
    const [isJoiningAgency, setIsJoiningAgency] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isAvatarCustomizerOpen, setIsAvatarCustomizerOpen] = useState(false);
    const [agentData, setAgentData] = useState({
        languages: user.languages || ['English'],
        specializations: user.specializations?.join(', ') || '',
        serviceAreas: user.serviceAreas || [],
        yearsOfExperience: user.yearsOfExperience ?? '',
        city: user.city || '',
        country: user.country || '',
        streetAddress: user.address || '',
        lat: user.lat ?? 0,
        lng: user.lng ?? 0,
    });

    // License submission form state (for agents who registered without a license)
    const [showLicenseForm, setShowLicenseForm] = useState(false);
    const [licenseInput, setLicenseInput] = useState('');
    const [licenseCountryInput, setLicenseCountryInput] = useState('');
    const [licenseFormatHint, setLicenseFormatHint] = useState('');
    const [licenseSubmitting, setLicenseSubmitting] = useState(false);
    const [licenseError, setLicenseError] = useState<string | null>(null);
    const [licenseSuccess, setLicenseSuccess] = useState(false);

    // Fetch format hint when license country changes
    useEffect(() => {
        if (!licenseCountryInput) {
            setLicenseFormatHint('');
            return;
        }
        let cancelled = false;
        getLicenseFormatHint(licenseCountryInput)
            .then((res) => { if (!cancelled) setLicenseFormatHint(res.formatHint); })
            .catch(() => { if (!cancelled) setLicenseFormatHint(''); });
        return () => { cancelled = true; };
    }, [licenseCountryInput]);

    const handleLicenseFormSubmit = async () => {
        const trimmed = licenseInput.trim();
        if (!trimmed || !licenseCountryInput) return;

        setLicenseSubmitting(true);
        setLicenseError(null);
        try {
            const result = await submitLicense({ licenseNumber: trimmed, country: licenseCountryInput });
            setLicenseSuccess(true);
            setShowLicenseForm(false);
            // Update local state so the UI reflects the new license
            setFormData(prev => ({
                ...prev,
                licenseNumber: result.licenseNumber,
                licenseVerified: false,
            }));
            dispatch({ type: 'UPDATE_USER', payload: { ...formData, licenseNumber: result.licenseNumber, licenseVerified: false } });
        } catch (err: unknown) {
            const error = err as { formatHint?: string; message?: string };
            const msg = error.formatHint
                ? `Invalid format. Expected: ${error.formatHint}`
                : error.message || 'Failed to submit license';
            setLicenseError(msg);
        } finally {
            setLicenseSubmitting(false);
        }
    };

    const handleAgencyClick = async () => {
        if (formData?.agencyId) {
            try {
                const response = await fetch(`${API_URL}/agencies/${formData.agencyId}`, { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    dispatch({ type: 'SET_SELECTED_AGENCY', payload: data.agency });
                    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
                }
            } catch (error) {
                // Failed to fetch agency details
            }
        }
    };

    useEffect(() => {
        setFormData(user);
        setAgentData(prev => ({
            ...prev,
            languages: user.languages || ['English'],
            specializations: user.specializations?.join(', ') || '',
            serviceAreas: user.serviceAreas || [],
            yearsOfExperience: user.yearsOfExperience || 0,
            city: user.city || '',
            country: user.country || '',
            streetAddress: user.address || '',
            // Preserve agent lat/lng if already set (user object may not have agent coordinates)
            lat: user.lat ?? prev.lat,
            lng: user.lng ?? prev.lng,
        }));

        // Fetch latest agent data if user is an agent
        if (user.role === UserRole.AGENT && user.id) {
            fetchLatestAgentData(user.id);
        }
    }, [user]);

    // Fetch latest agent data from backend
    const fetchLatestAgentData = async (userId: string) => {
        try {
            const token = tokenService.getAccessToken();
            if (!token) return;

            const response = await fetch(`${API_URL}/agents/user/${userId}`, {
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                apiLogger.warn(`Failed to fetch agent data: HTTP ${response.status}`);
                return;
            }

            const data = await response.json();
            if (data.agent) {
                const agent = data.agent;
                setAgentData(prev => ({
                    ...prev,
                    languages: agent.languages || ['English'],
                    specializations: agent.specializations?.join(', ') || '',
                    serviceAreas: agent.serviceAreas || [],
                    yearsOfExperience: agent.yearsOfExperience || 0,
                    lat: agent.lat ?? prev.lat,
                    lng: agent.lng ?? prev.lng,
                }));
                setFormData(prevUser => ({
                    ...prevUser,
                    languages: agent.languages || prevUser.languages,
                    specializations: agent.specializations || prevUser.specializations,
                    serviceAreas: agent.serviceAreas || prevUser.serviceAreas,
                    yearsOfExperience: agent.yearsOfExperience || prevUser.yearsOfExperience,
                    lat: agent.lat ?? prevUser.lat,
                    lng: agent.lng ?? prevUser.lng,
                }));
            }
        } catch (error) {
        }
    };

    // Fetch agencies when component mounts or when user is an agent
    useEffect(() => {
        const fetchAgencies = async () => {
            if (formData.role === UserRole.AGENT) {
                try {
                    const response = await getAgencies();
                    setAgencies(response.agencies || []);
                } catch (error) {
                    setAgencies([]);
                }
            }
        };
        fetchAgencies();
    }, [formData.role]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        if (id === 'phone') {
            setFormData(prev => ({ ...prev, phone: value }));
        } else {
            setFormData(prev => ({ ...prev, [id]: value }));
        }
    };

    const handleRoleChange = async (role: UserRole) => {
        setError('');

        // If switching to agent and never been an agent before, require license verification
        if (role === UserRole.AGENT && !user.licenseNumber) {
            setPendingRole(role);
            setIsLicenseModalOpen(true);
            return;
        }

        // If switching to agent or private_seller but user has no phone, open modal to collect it
        if ((role === UserRole.AGENT || role === UserRole.PRIVATE_SELLER) && !user.phone) {
            setPendingRole(role);
            setIsLicenseModalOpen(true);
            return;
        }

        // For other role switches (including agent ↔ private_seller with phone on file), allow freely
        try {
            setIsSaving(true);
            const updatedUser = await switchRole(role);
            dispatch({ type: 'UPDATE_USER', payload: updatedUser });
            setFormData(updatedUser);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to switch role');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLicenseSubmit = async (licenseData: { licenseNumber: string; licenseCountry?: string; phone?: string; agencyInvitationCode?: string; agentId?: string; selectedAgencyId?: string; languages?: string[] }) => {
        setIsSaving(true);
        setError('');
        try {
            const roleToSwitch = pendingRole || formData.role;
            const updatedUser = await switchRole(roleToSwitch, licenseData);

            // Also save the profile form data (name, phone, gender, city, etc.)
            // that the user may have filled in on the background form
            const parsedSpecializations = agentData.specializations
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            const basicUserData = {
                name: formData.name,
                phone: licenseData.phone || formData.phone,
                city: agentData.city,
                country: agentData.country,
                address: agentData.streetAddress || '',
                avatarUrl: formData.avatarUrl,
                gender: formData.gender || 'male',
            };

            let finalUser = updatedUser;
            try {
                const savedUser = await updateUser(basicUserData);
                finalUser = { ...savedUser, ...updatedUser, phone: basicUserData.phone || updatedUser.phone };
            } catch {
                // Profile save failed, but role switch succeeded — continue
            }

            // Use languages from the license modal if provided, otherwise fall back to profile form
            const modalLanguages = licenseData.languages && licenseData.languages.length > 0
                ? licenseData.languages
                : agentData.languages;

            // If switching to agent, also save agent-specific fields
            if (roleToSwitch === UserRole.AGENT) {
                const yearsExp = agentData.yearsOfExperience === '' ? 0 : Number(agentData.yearsOfExperience) || 0;
                try {
                    const updatedAgent = await updateAgentProfile({
                        languages: modalLanguages,
                        specializations: parsedSpecializations,
                        serviceAreas: agentData.serviceAreas,
                        yearsOfExperience: yearsExp,
                        lat: agentData.lat,
                        lng: agentData.lng,
                    });
                    finalUser = {
                        ...finalUser,
                        languages: updatedAgent.languages || modalLanguages,
                        specializations: updatedAgent.specializations || parsedSpecializations,
                        serviceAreas: updatedAgent.serviceAreas || agentData.serviceAreas,
                        yearsOfExperience: updatedAgent.yearsOfExperience !== undefined ? updatedAgent.yearsOfExperience : yearsExp,
                        lat: updatedAgent.lat !== undefined ? updatedAgent.lat : agentData.lat,
                        lng: updatedAgent.lng !== undefined ? updatedAgent.lng : agentData.lng,
                    };
                } catch {
                    // Agent profile save failed — still use modal languages
                    finalUser = { ...finalUser, languages: modalLanguages };
                }
            }

            // Always sync languages from the modal into the profile form state
            setAgentData(prev => ({ ...prev, languages: finalUser.languages || modalLanguages }));

            // Update context and form data
            dispatch({ type: 'UPDATE_USER', payload: finalUser });
            setFormData(finalUser);

            // Close modal and show success
            setIsLicenseModalOpen(false);
            setPendingRole(null);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to switch role';
            setError(errorMessage);
            // Re-throw so modal can catch and display error
            throw err;
        } finally {
            setIsSaving(false);
        }
    };

    const handleLanguageToggle = (language: string) => {
        setAgentData(prev => ({
            ...prev,
            languages: prev.languages.includes(language)
                ? prev.languages.filter(l => l !== language)
                : [...prev.languages, language]
        }));
    };

    const handleAddServiceArea = (locationName: string) => {
        if (!agentData.serviceAreas.includes(locationName)) {
            setAgentData(prev => ({
                ...prev,
                serviceAreas: [...prev.serviceAreas, locationName]
            }));
        }
    };

    const handleRemoveServiceArea = (locationName: string) => {
        setAgentData(prev => ({
            ...prev,
            serviceAreas: prev.serviceAreas.filter(area => area !== locationName)
        }));
    };

    const handleSetMainLocation = (city: string, country: string) => {
        setAgentData(prev => ({
            ...prev,
            city,
            country
        }));
    };

    const handleLocationChange = (lat: number, lng: number) => {
        setAgentData(prev => ({
            ...prev,
            lat,
            lng
        }));
    };

    const handleAddressChange = (address: string) => {
        setAgentData(prev => ({
            ...prev,
            streetAddress: address
        }));
    };

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();

        // If email has changed, confirm and handle separately
        if (formData.email !== user.email) {
            const confirmed = await confirm({
                title: t('profile.emailChangeTitle', 'Change Email Address?'),
                message: t('profile.emailChangeConfirm', 'Changing your email to "{{email}}" will require you to verify the new address. You will be logged out and need to verify before logging back in.').replace('{{email}}', formData.email),
                confirmLabel: t('profile.emailChangeButton', 'Change Email & Logout'),
                variant: 'warning',
            });

            if (!confirmed) return;

            setIsSaving(true);
            try {
                await changeEmail(formData.email);
                // Logout the user after successful email change
                onLogout();
                return;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to change email');
                setIsSaving(false);
                return;
            }
        }

        setIsSaving(true);

        try {
            // Prepare the data to be saved
            const parsedSpecializations = agentData.specializations
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            // Basic user data for updateUser
            const basicUserData = {
                name: formData.name,
                phone: formData.phone,
                city: agentData.city,
                country: agentData.country,
                address: agentData.streetAddress || '',
                avatarUrl: formData.avatarUrl,
                gender: formData.gender || 'male',
            };

            // Update UI immediately (optimistic update)
            const yearsExp = agentData.yearsOfExperience === '' ? 0 : Number(agentData.yearsOfExperience) || 0;
            const optimisticData = {
                ...formData,
                languages: agentData.languages,
                specializations: parsedSpecializations,
                serviceAreas: agentData.serviceAreas,
                yearsOfExperience: yearsExp,
                city: agentData.city,
                country: agentData.country,
                lat: agentData.lat,
                lng: agentData.lng,
            };
            setFormData(optimisticData);

            // Update basic user profile
            const savedUser = await updateUser(basicUserData);

            // If agent, also update agent-specific fields
            let finalUser = {
                ...savedUser,
                languages: agentData.languages,
                specializations: parsedSpecializations,
                serviceAreas: agentData.serviceAreas,
                yearsOfExperience: yearsExp,
                lat: agentData.lat,
                lng: agentData.lng,
            };

            if (formData.role === UserRole.AGENT) {
                const agentProfileData = {
                    languages: agentData.languages,
                    specializations: parsedSpecializations,
                    serviceAreas: agentData.serviceAreas,
                    yearsOfExperience: yearsExp,
                    lat: agentData.lat,
                    lng: agentData.lng,
                };

                try {
                    const updatedAgent = await updateAgentProfile(agentProfileData);
                    // Merge agent data with user data
                    finalUser = {
                        ...savedUser,
                        languages: updatedAgent.languages || agentData.languages,
                        specializations: updatedAgent.specializations || parsedSpecializations,
                        serviceAreas: updatedAgent.serviceAreas || agentData.serviceAreas,
                        yearsOfExperience: updatedAgent.yearsOfExperience !== undefined ? updatedAgent.yearsOfExperience : agentData.yearsOfExperience,
                        lat: updatedAgent.lat !== undefined ? updatedAgent.lat : agentData.lat,
                        lng: updatedAgent.lng !== undefined ? updatedAgent.lng : agentData.lng,
                    };
                } catch (agentError) {
                    // Continue with user data even if agent update fails
                }
            }

            // Sync with server response to ensure consistency
            setFormData(finalUser);
            setAgentData(prev => ({
                ...prev,
                languages: finalUser.languages || ['English'],
                specializations: finalUser.specializations?.join(', ') || '',
                serviceAreas: finalUser.serviceAreas || [],
                yearsOfExperience: finalUser.yearsOfExperience || 0,
                city: finalUser.city || '',
                country: finalUser.country || '',
                lat: finalUser.lat ?? prev.lat,
                lng: finalUser.lng ?? prev.lng,
            }));

            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (error) {
            // Revert to previous state on error
            setFormData(user);
            setAgentData({
                languages: user.languages || ['English'],
                specializations: user.specializations?.join(', ') || '',
                serviceAreas: user.serviceAreas || [],
                yearsOfExperience: user.yearsOfExperience || 0,
                city: user.city || '',
                country: user.country || '',
                streetAddress: '',
                lat: user.lat ?? 0,
                lng: user.lng ?? 0,
            });
            setError('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleJoinByInvitationCode = async () => {
        if (!invitationCode.trim()) {
            setError(t('joinAgency.enterCode'));
            return;
        }

        setIsJoiningAgency(true);
        setError('');
        try {
            await ensureCsrfToken();
            const response = await fetch(`${API_URL}/agencies/join-by-code`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenService.getAccessToken()}`,
                    ...csrfHeaders(),
                },
                body: JSON.stringify({ invitationCode }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to join agency');
            }

            const data = await response.json();

            // Update user in context with new agency info
            if (data.user) {
                dispatch({ type: 'UPDATE_USER', payload: data.user });
                setFormData(prev => ({
                    ...prev,
                    agencyName: data.user.agencyName,
                    agencyId: data.user.agencyId,
                }));
            }

            setIsSaved(true);
            setInvitationCode('');
            setError('');
            await success('Joined Agency', `Successfully joined ${data.agency.name}!`);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to join agency');
        } finally {
            setIsJoiningAgency(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError(t('errors.selectImage'));
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError(t('errors.imageTooLarge'));
            return;
        }

        setIsUploadingAvatar(true);
        setError('');

        try {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            const formData = new FormData();
            formData.append('avatar', file);

            await ensureCsrfToken();
            const response = await fetch(`${API_URL}/auth/upload-avatar`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${tokenService.getAccessToken()}`,
                    ...csrfHeaders(),
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to upload avatar');
            }

            const data = await response.json();

            // Merge server response; avatarOptions is null (cleared by backend)
            dispatch({ type: 'UPDATE_USER', payload: { ...data.user, avatarOptions: null } });
            setFormData(prev => ({ ...prev, ...data.user }));
            setIsSaved(true);
            setTimeout(() => {
                setIsSaved(false);
                setAvatarPreview(null);
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload avatar');
            setAvatarPreview(null);
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleGenderChange = (newGender: 'male' | 'female' | 'other') => {
        // When gender changes, reset avatarOptions so the avatar reflects the new gender
        const defaults = getDefaultAvatarOptions(newGender);
        const currentOptions = parseAvatarOptions(formData.avatarOptions);

        if (currentOptions) {
            // Adapt existing options: swap hair to gender-appropriate default, clear facial hair for female
            const adapted: AvatarOptions = {
                ...currentOptions,
                top: defaults.top,
                facialHair: newGender === 'female' ? '' : currentOptions.facialHair,
            };
            setFormData(prev => ({
                ...prev,
                gender: newGender,
                avatarOptions: JSON.stringify(adapted),
            }));
        } else {
            setFormData(prev => ({ ...prev, gender: newGender }));
        }
    };

    const handleSaveAvatarOptions = async (options: AvatarOptions) => {
        setError('');
        try {
            await ensureCsrfToken();
            const response = await fetch(`${API_URL}/auth/save-avatar-options`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${tokenService.getAccessToken()}`,
                    'Content-Type': 'application/json',
                    ...csrfHeaders(),
                },
                body: JSON.stringify({ avatarOptions: options }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to save avatar');
            }
            const data = await response.json();
            // Merge server response; avatarUrl is null (cleared by backend)
            dispatch({ type: 'UPDATE_USER', payload: { ...data.user, avatarUrl: null } });
            setFormData(prev => ({ ...prev, ...data.user, avatarUrl: undefined }));
            setAvatarPreview(null);
            success(t('profile.success', 'Success'), t('profile.avatarSaved', 'Avatar saved successfully'));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save avatar options');
        }
    };

    const handleUploadPhotoFromCustomizer = async (file: File) => {
        setIsUploadingAvatar(true);
        setError('');
        try {
            const reader = new FileReader();
            reader.onloadend = () => setAvatarPreview(reader.result as string);
            reader.readAsDataURL(file);

            const formDataUpload = new FormData();
            formDataUpload.append('avatar', file);

            await ensureCsrfToken();
            const response = await fetch(`${API_URL}/auth/upload-avatar`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${tokenService.getAccessToken()}`,
                    ...csrfHeaders(),
                },
                body: formDataUpload,
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to upload avatar');
            }
            const data = await response.json();
            // Merge server response; avatarOptions is null (cleared by backend)
            dispatch({ type: 'UPDATE_USER', payload: { ...data.user, avatarOptions: null } });
            setFormData(prev => ({ ...prev, ...data.user }));
            success(t('profile.success', 'Success'), t('profile.avatarUploaded', 'Photo uploaded successfully'));
            setTimeout(() => setAvatarPreview(null), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload avatar');
            setAvatarPreview(null);
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const floatingInputClasses = "block px-3 pb-2.5 pt-4 w-full text-base text-neutral-900 bg-white/40 backdrop-blur-sm rounded-xl border border-white/50 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-white/60 transition-all peer shadow-sm";
    const floatingLabelClasses = "absolute text-base text-neutral-600 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-transparent px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1";

    return (
        <>
            <form onSubmit={handleSaveChanges} className="space-y-8">
                {!['admin', 'super_admin'].includes(user.role) && (
                <fieldset>
                    <legend className="block text-sm font-medium text-neutral-700 mb-2">{t('roles.yourRole')}</legend>
                    <RoleSelector selectedRole={formData.role} originalRole={user.role} agencyId={user.agencyId} agencyName={user.agencyName} onChange={handleRoleChange} />
                    {error && (
                        <div className="mt-3 p-3 bg-red-50/60 backdrop-blur-sm border border-red-200/50 rounded-xl text-sm text-red-600">
                            {error}
                        </div>
                    )}
                </fieldset>
                )}

            {/* Avatar Section - Glass */}
            <fieldset className="border-t border-white/30 pt-6">
                <legend className="block text-sm font-medium text-neutral-600 mb-4">{t('profile.profilePicture')}</legend>
                <div className="flex items-center gap-6 bg-white/20 backdrop-blur-sm rounded-2xl p-5 border border-white/30">
                    <div className="relative w-28 h-28 flex-shrink-0">
                        {avatarPreview || formData.avatarUrl ? (
                            <div className="relative w-full h-full">
                                <div className="absolute inset-1 rounded-full bg-gradient-to-b from-neutral-300/50 to-neutral-400/30 blur-xl translate-y-2 scale-95" />
                                <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-white/70 shadow-[0_6px_24px_rgba(0,0,0,0.18),inset_0_-2px_6px_rgba(0,0,0,0.08)]">
                                    <img
                                        src={avatarPreview || formData.avatarUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
                                </div>
                            </div>
                        ) : (
                            <DefaultAvatar
                                gender={formData.gender}
                                seed={formData.id || formData.name}
                                avatarOptions={formData.avatarOptions}
                                show3d
                            />
                        )}
                        {isUploadingAvatar && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full backdrop-blur-sm">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <button
                            type="button"
                            onClick={() => setIsAvatarCustomizerOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/80 backdrop-blur-sm text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary transition-all border border-primary/30"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            {t('profile.customizeAvatar', 'Customize Avatar')}
                        </button>
                        <p className="text-xs text-neutral-500 mt-2.5">
                            {t('profile.avatarDescription', 'Create a custom character or upload your own photo')}
                        </p>
                    </div>
                </div>
            </fieldset>

            {/* Avatar Customizer Modal */}
            <AvatarCustomizer
                isOpen={isAvatarCustomizerOpen}
                onClose={() => setIsAvatarCustomizerOpen(false)}
                gender={formData.gender}
                currentAvatarOptions={parseAvatarOptions(formData.avatarOptions)}
                currentAvatarUrl={formData.avatarUrl}
                onSaveAvatar={handleSaveAvatarOptions}
                onUploadPhoto={handleUploadPhotoFromCustomizer}
                isUploading={isUploadingAvatar}
            />

            {/* Gender Selection - Glass */}
            <fieldset className="border-t border-white/30 pt-6">
                <legend className="block text-sm font-medium text-neutral-600 mb-3">{t('profile.gender', 'Gender')}</legend>
                <div className="flex gap-3 flex-wrap">
                    {(['male', 'female', 'other'] as const).map((g) => (
                        <button
                            key={g}
                            type="button"
                            onClick={() => handleGenderChange(g)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border backdrop-blur-sm ${
                                formData.gender === g || (!formData.gender && g === 'male')
                                    ? 'bg-primary/80 text-white border-primary/30 shadow-lg shadow-primary/20'
                                    : 'bg-white/40 text-neutral-700 border-white/50 hover:border-primary/30 hover:bg-white/60'
                            }`}
                        >
                            {t(`profile.gender_${g}`, g.charAt(0).toUpperCase() + g.slice(1))}
                        </button>
                    ))}
                </div>
            </fieldset>

            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <legend className="sr-only">Personal Information</legend>
                <div className="relative">
                    <input type="text" id="name" value={formData.name} onChange={handleInputChange} className={floatingInputClasses} placeholder=" " />
                    <label htmlFor="name" className={floatingLabelClasses}>{t('profile.fullName')}</label>
                </div>
                <div className="relative">
                    <input type="email" id="email" value={formData.email} onChange={handleInputChange} className={floatingInputClasses} placeholder=" " />
                    <label htmlFor="email" className={floatingLabelClasses}>{t('profile.email')}</label>
                    {formData.email !== user.email && (
                        <p className="mt-1 text-xs text-amber-600 font-medium">
                            {t('profile.emailChangeWarning', 'Changing your email will require re-verification and you will be logged out.')}
                        </p>
                    )}
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-600 mb-1.5">{t('profile.phone')}</label>
                    <PhoneInput
                        value={formData.phone || ''}
                        onChange={fullPhone => setFormData(prev => ({ ...prev, phone: fullPhone }))}
                    />
                </div>
            </fieldset>

            {formData.role === UserRole.AGENT && (
                <fieldset className="space-y-6 animate-fade-in border-t border-white/30 pt-8">
                     <div className="flex items-center justify-between -mt-2 mb-4">
                        <legend className="text-lg font-semibold text-neutral-700">{t('agent.agentInformation')}</legend>
                        {formData.licenseVerified && (
                            <span className="px-3 py-1 text-sm bg-green-100/60 backdrop-blur-sm text-green-800 rounded-xl border border-green-200/50 font-medium">
                                ✓ {t('agent.licenseVerified')}
                            </span>
                        )}
                     </div>

                     {/* Agency Management - Always visible for agents */}
                     <AgencyManagementSection
                        currentUser={formData}
                        onAgencyChange={async () => {
                           // Fetch updated user data instead of reloading the page
                           try {
                              const response = await fetch(`${API_URL}/auth/me`, {
                                 credentials: 'include',
                                 headers: {
                                    'Authorization': `Bearer ${tokenService.getAccessToken()}`,
                                 },
                              });
                              if (response.ok) {
                                 const data = await response.json();
                                 dispatch({ type: 'UPDATE_USER', payload: data.user });
                                 setFormData(data.user);
                              }
                           } catch (err) {
                           }
                        }}
                     />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="relative">
                            <div className="relative">
                                <input
                                    type="text"
                                    id="agencyName"
                                    value={formData.agencyName || t('agent.independentAgent')}
                                    className={floatingInputClasses}
                                    placeholder=" "
                                    disabled
                                    title={t('agent.agencyCannotChange')}
                                />
                                <label htmlFor="agencyName" className={floatingLabelClasses}>{t('agent.agencyName')}</label>
                            </div>

                            {/* View Agency Button */}
                            {formData.agencyId && (
                                <button
                                    type="button"
                                    onClick={handleAgencyClick}
                                    className="mt-2 text-sm text-primary hover:text-primary-dark font-semibold flex items-center gap-1 bg-white/30 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/40 hover:bg-white/50 transition-all"
                                >
                                    <BuildingOfficeIcon className="w-4 h-4" />
                                    {t('agent.viewAgencyDetails')}
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                id="agentId"
                                value={formData.agentId || ''}
                                className={floatingInputClasses}
                                placeholder=" "
                                disabled
                                title={t('agent.agentIdCannotChange')}
                            />
                            <label htmlFor="agentId" className={floatingLabelClasses}>{t('agent.agentId')}</label>
                        </div>
                        <div className="relative md:col-span-2">
                            {formData.licenseNumber && formData.licenseVerified ? (
                                <div className="flex items-center gap-3 p-4 bg-green-50/80 backdrop-blur-sm border border-green-200/50 rounded-xl">
                                    <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-green-800">
                                            {t('agent.licenseVerified', 'License Verified')}
                                        </p>
                                        <p className="text-xs text-green-600 font-mono mt-0.5">{formData.licenseNumber}</p>
                                    </div>
                                </div>
                            ) : formData.licenseNumber && !formData.licenseVerified ? (
                                <div className="flex items-center justify-between p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <ClockIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-800">
                                                {t('agent.licensePending', 'License Pending Review')}
                                            </p>
                                            <p className="text-xs text-amber-600 font-mono mt-0.5">{formData.licenseNumber}</p>
                                            <p className="text-xs text-amber-500 mt-0.5">
                                                {t('agent.licensePendingDesc', 'Your license is being reviewed by an admin. It will not appear on your public profile until approved.')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : licenseSuccess ? (
                                <div className="flex items-center gap-3 p-4 bg-green-50/80 backdrop-blur-sm border border-green-200/50 rounded-xl">
                                    <ShieldCheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-green-800">
                                            {t('agent.licenseSubmitted', 'License Submitted')}
                                        </p>
                                        <p className="text-xs text-green-600 mt-0.5">
                                            {t('agent.licenseSubmittedDesc', 'Your license is pending admin verification. You will be notified once reviewed.')}
                                        </p>
                                    </div>
                                </div>
                            ) : !showLicenseForm ? (
                                <div className="flex items-center justify-between p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100/80 flex items-center justify-center flex-shrink-0">
                                            <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-blue-800">
                                                {t('agent.noLicenseYet', 'No License on File')}
                                            </p>
                                            <p className="text-xs text-blue-600 mt-0.5">
                                                {t('agent.addLicenseHint', 'Submit your license to get verified and stand out to clients.')}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setShowLicenseForm(true); setLicenseError(null); }}
                                        className="ml-4 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                                    >
                                        {t('agent.addLicense', 'Add License')}
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-blue-800">
                                            {t('agent.submitLicenseTitle', 'Submit Your License')}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => { setShowLicenseForm(false); setLicenseError(null); setLicenseInput(''); setLicenseCountryInput(''); }}
                                            className="text-blue-400 hover:text-blue-600 transition-colors"
                                        >
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-blue-800 mb-1">
                                                {t('agent.licenseCountry', 'Country')}
                                            </label>
                                            <select
                                                value={licenseCountryInput}
                                                onChange={(e) => setLicenseCountryInput(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            >
                                                <option value="">{t('agent.selectCountry', 'Select country...')}</option>
                                                {BALKAN_COUNTRIES.map((c) => (
                                                    <option key={c.code} value={c.code}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-blue-800 mb-1">
                                                {t('agent.licenseNumber', 'License Number')}
                                            </label>
                                            <input
                                                type="text"
                                                value={licenseInput}
                                                onChange={(e) => { setLicenseInput(e.target.value); setLicenseError(null); }}
                                                className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm font-mono bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                placeholder={licenseFormatHint || t('agent.enterLicenseNumber', 'Enter your license number')}
                                            />
                                            {licenseFormatHint && (
                                                <p className="mt-1 text-[11px] text-blue-500">
                                                    {t('agent.formatHint', 'Expected format')}: {licenseFormatHint}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {licenseError && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <XMarkIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                                            <p className="text-xs text-red-700 font-medium">{licenseError}</p>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setShowLicenseForm(false); setLicenseError(null); setLicenseInput(''); setLicenseCountryInput(''); }}
                                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                                        >
                                            {t('common.cancel', 'Cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleLicenseFormSubmit}
                                            disabled={licenseSubmitting || !licenseInput.trim() || !licenseCountryInput}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                                        >
                                            {licenseSubmitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                            {t('agent.submitForReview', 'Submit for Review')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Languages */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-neutral-700">{t('agent.languagesSpoken')}</label>
                        <div className="flex flex-wrap gap-2">
                            {BALKAN_LANGUAGES.map((language) => (
                                <button
                                    key={language}
                                    type="button"
                                    onClick={() => handleLanguageToggle(language)}
                                    className={`px-3 py-1.5 text-sm rounded-xl border transition-all backdrop-blur-sm ${
                                        agentData.languages.includes(language)
                                            ? 'bg-primary/80 text-white border-primary/30 shadow-md shadow-primary/20'
                                            : 'bg-white/40 text-neutral-600 border-white/50 hover:border-primary/30 hover:bg-white/60'
                                    }`}
                                >
                                    {language}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Specializations */}
                    <div>
                        <label htmlFor="specializations" className="block text-sm font-medium text-neutral-700 mb-2">{t('agent.specializations')}</label>
                        <textarea
                            id="specializations"
                            value={agentData.specializations}
                            onChange={(e) => setAgentData(prev => ({ ...prev, specializations: e.target.value }))}
                            placeholder={t('agent.specializationsPlaceholder')}
                            className="w-full px-3 py-2 bg-white/40 backdrop-blur-sm border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-white/60 text-sm transition-all shadow-sm"
                            rows={2}
                        />
                        <p className="text-xs text-neutral-500 mt-1">{t('agent.specializationsHint')}</p>
                    </div>

                    {/* Years of Experience */}
                    <div>
                        <label htmlFor="yearsOfExperience" className="block text-sm font-medium text-neutral-700 mb-2">{t('agent.yearsOfExperience')}</label>
                        <input
                            id="yearsOfExperience"
                            type="number"
                            min="0"
                            max="99"
                            value={agentData.yearsOfExperience === '' || agentData.yearsOfExperience === 0 ? '' : agentData.yearsOfExperience}
                            onChange={(e) => setAgentData(prev => ({ ...prev, yearsOfExperience: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }))}
                            placeholder="0"
                            className="w-full px-3 py-2 bg-white/40 backdrop-blur-sm border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-white/60 text-sm transition-all shadow-sm"
                        />
                        <p className="text-xs text-neutral-500 mt-1">{t('agent.yearsOfExperienceHint')}</p>
                    </div>

                    {/* Main Location with Map Picker */}
                    <MapLocationPicker
                        lat={agentData.lat ?? 42.0}
                        lng={agentData.lng ?? 21.0}
                        address={agentData.streetAddress || agentData.city || 'Select location'}
                        country={agentData.country || 'Serbia'}
                        city={agentData.city || ''}
                        cityLat={agentData.lat ?? 42.0}
                        cityLng={agentData.lng ?? 21.0}
                        onLocationChange={handleLocationChange}
                        onAddressChange={handleAddressChange}
                        zoom={10}
                        autoDetectLocation={!agentData.lat && !agentData.lng}
                    />

                    {/* Service Areas */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-neutral-700">{t('agent.serviceAreas')}</label>
                            {agentData.serviceAreas.length > 0 && (
                                <span className="text-xs bg-primary/80 text-white px-2.5 py-1 rounded-xl backdrop-blur-sm border border-primary/30">
                                    {agentData.serviceAreas.length} {agentData.serviceAreas.length !== 1 ? t('agent.areas') : t('agent.area')}
                                </span>
                            )}
                        </div>

                        {/* Service Areas List */}
                        {agentData.serviceAreas.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                                {agentData.serviceAreas.map((area) => (
                                    <div key={area} className="flex items-center gap-2 bg-primary/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-primary/20">
                                        <span className="text-sm font-medium text-neutral-700">{area}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveServiceArea(area)}
                                            className="text-neutral-500 hover:text-red-500 transition-colors"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Service Area */}
                        <select
                            defaultValue=""
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleAddServiceArea(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="w-full px-3 py-2 bg-white/40 backdrop-blur-sm border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-white/60 text-sm transition-all shadow-sm"
                        >
                            <option value="">{t('agent.addServiceArea')}</option>
                            {BALKAN_LOCATIONS.map((location) => (
                                <option
                                    key={location.code}
                                    value={location.name}
                                    disabled={agentData.serviceAreas.includes(location.name)}
                                >
                                    {location.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-neutral-500 mt-1">{t('agent.serviceAreasHint')}</p>
                    </div>
                </fieldset>
            )}

            <div className="flex justify-end pt-4">
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-primary/80 backdrop-blur-sm text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary transition-all border border-primary/30 w-36 disabled:opacity-50">
                    {isSaving ? t('profile.saving') : (isSaved ? t('profile.saved') : t('profile.saveChanges'))}
                </button>
            </div>
        </form>

        {/* Push Notifications */}
        <div className="mt-8 border-t border-white/30 pt-6">
            <h3 className="text-sm font-semibold text-neutral-700 mb-2">{t('account:notifications.title', 'Notification Settings')}</h3>
            <PushNotificationToggle />
        </div>

        {/* Change Password Section */}
        <div className="mt-8 border-t border-white/30 pt-8">
            <ChangePasswordSection />
        </div>

        <AgentLicenseModal
            isOpen={isLicenseModalOpen}
            onClose={() => {
                setIsLicenseModalOpen(false);
                setPendingRole(null);
            }}
            onSubmit={handleLicenseSubmit}
            currentLicenseNumber={user.licenseNumber}
            currentAgentId={user.agentId}
            currentPhone={user.phone}
            phoneOnly={pendingRole === UserRole.PRIVATE_SELLER && !user.phone}
            hasProSubscription={
                user.subscription?.tier === 'pro' &&
                (user.subscription?.plan === 'pro_monthly' || user.subscription?.plan === 'pro_yearly') &&
                (user.subscription?.status === 'active' || user.subscription?.status === 'trial')
            }
            onNavigateToPricing={() => {
                setIsLicenseModalOpen(false);
                setPendingRole(null);
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
                window.history.pushState({}, '', '/pricing');
            }}
        />
        </>
    );
};

const VIEWING_NOTIFICATION_TYPES = ['new_viewing', 'viewing_approved', 'viewing_declined'];

const MyAccountPage: React.FC = () => {
    const { t } = useTranslation(['account']);
    const { state, dispatch, logout, logoutAllDevices } = useAppContext();
    const { success } = useNotification();
    const [performanceRefreshKey, setPerformanceRefreshKey] = useState(0);
    const [unreadViewingCount, setUnreadViewingCount] = useState(0);

    // Get active tab from state (set by URL routing)
    const urlTab = state.accountTab || 'listings';
    const activeTab: AccountTab = tabRouteMap[urlTab] || 'listings';

    const token = tokenService.getAccessToken();

    // Fetch unread viewing notification count
    useEffect(() => {
        if (!token) return;
        const fetchCount = async () => {
            try {
                const res = await fetch(`${API_URL}/notifications/unread-count-by-types?types=${VIEWING_NOTIFICATION_TYPES.join(',')}`, {
                    credentials: 'include',
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setUnreadViewingCount(data.count || 0);
                }
            } catch { /* silently ignore */ }
        };
        fetchCount();
    }, [token]);

    // Mark viewing notifications as read when the viewings tab is opened
    useEffect(() => {
        if (activeTab !== 'viewings' || unreadViewingCount === 0 || !token) return;
        const markRead = async () => {
            try {
                await ensureCsrfToken();
                const res = await fetch(`${API_URL}/notifications/read-by-types`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                        ...csrfHeaders(),
                    },
                    body: JSON.stringify({ types: VIEWING_NOTIFICATION_TYPES }),
                });
                if (res.ok) {
                    setUnreadViewingCount(0);
                }
            } catch { /* silently ignore */ }
        };
        markRead();
    }, [activeTab, unreadViewingCount, token]);

    // Function to change tab and update URL
    const setActiveTab = useCallback((tab: AccountTab) => {
        const newPath = buildLocalizedPath(`/account/${tabToRouteMap[tab]}`);
        window.history.pushState({}, '', newPath);
        dispatch({ type: 'SET_ACCOUNT_TAB', payload: tab });
    }, [dispatch]);

    const isSellerProfile = state.currentUser?.role === UserRole.AGENT || state.currentUser?.role === UserRole.PRIVATE_SELLER;
    // Buyer Pro users (listingsLimit > 0) get the same account tabs as sellers
    const isBuyerPro = state.currentUser?.role === UserRole.BUYER && (state.currentUser?.subscription?.listingsLimit ?? 0) > 0;
    const hasSellerTabs = isSellerProfile || isBuyerPro;

    // Redirect users without seller tabs to profile if they land on a seller-only tab
    useEffect(() => {
        if (!state.currentUser) return;
        if (!hasSellerTabs && (activeTab === 'listings' || activeTab === 'performance' || activeTab === 'subscription' || activeTab === 'promotions' || activeTab === 'viewings' || activeTab === 'feeds')) {
            setActiveTab('profile');
        }
    }, [hasSellerTabs, activeTab, setActiveTab, state.currentUser]);

    useEffect(() => {
        if (activeTab === 'performance') {
            setPerformanceRefreshKey(prev => prev + 1);
        }
    }, [activeTab]);

    if (!state.currentUser) {
        return (
            <div className="p-8 text-center">
                <p>{t('account:mustBeLoggedIn')}</p>
            </div>
        );
    }

    const handleLogout = () => {
        logout();
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
    };

    const handleAgencyClick = async () => {
        if (state.currentUser?.agencyId) {
            try {
                // Fetch the agency details
                const response = await fetch(`${API_URL}/agencies/${state.currentUser.agencyId}`, { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    dispatch({ type: 'SET_SELECTED_AGENCY', payload: data.agency });
                    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
                }
            } catch (error) {
                // Silent error handling
            }
        }
    };

    const roleDisplayMap: Record<UserRole, string> = {
        [UserRole.AGENT]: t('account:roles.agent'),
        [UserRole.PRIVATE_SELLER]: t('account:roles.privateSeller'),
        [UserRole.BUYER]: t('account:roles.buyer'),
        [UserRole.ADMIN]: '',
        [UserRole.SUPER_ADMIN]: ''
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'listings':
                return hasSellerTabs ? <MyListings sellerId={state.currentUser!.id} /> : null;
            case 'promotions':
                return hasSellerTabs ? <MyPromotions /> : null;
            case 'profile':
                return <ProfileSettings user={state.currentUser!} onLogout={handleLogout} />;
            case 'performance':
                 return <ProfileStatistics key={performanceRefreshKey} user={state.currentUser!} />;
            case 'subscription':
                 return <SubscriptionManagement userId={state.currentUser!.id} />;
            case 'measurements':
                 return <MyMeasurements userId={state.currentUser!.id} />;
            case 'viewings':
                 return hasSellerTabs ? <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}><ViewingRequestsTab /></Suspense> : null;
            case 'security':
                 return <SecuritySettings logoutAllDevices={logoutAllDevices} />;
            case 'businesses':
                 return <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}><MyBusinessListings /></Suspense>;
            case 'feeds':
                 return hasSellerTabs ? <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}><MyListingFeeds /></Suspense> : null;
            default:
                return null;
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-100 via-blue-50/60 to-indigo-50/40 min-h-screen flex flex-col">
            {/* SEO - noindex for private page */}
            <SEO
                title={t('account:title')}
                description={t('account:description')}
                noindex={true}
            />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex-grow">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar - Liquid Glass */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/40 backdrop-blur-2xl p-4 rounded-3xl shadow-[0_8px_48px_rgba(0,0,0,0.08)] border border-white/50 ring-1 ring-white/20">
                             <div className="flex flex-col items-center text-center pb-4 mb-4 border-b border-white/30">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 mb-3 flex-shrink-0">
                                    {state.currentUser.avatarUrl ? (
                                        <div className="relative w-full h-full">
                                            <div className="absolute inset-1 rounded-full bg-gradient-to-b from-neutral-300/50 to-neutral-400/30 blur-lg translate-y-1 scale-95" />
                                            <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
                                                <img src={state.currentUser.avatarUrl} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none" />
                                            </div>
                                        </div>
                                    ) : (
                                        <DefaultAvatar
                                            gender={state.currentUser.gender}
                                            seed={state.currentUser.id || state.currentUser.name}
                                            avatarOptions={state.currentUser.avatarOptions}
                                            show3d
                                        />
                                    )}
                                </div>
                                <h2 className="font-bold text-lg sm:text-xl text-neutral-800">{state.currentUser.name}</h2>
                                <p className="text-sm text-neutral-500 capitalize mb-2">{roleDisplayMap[state.currentUser.role]}</p>

                                {/* Agency Badge - Glass */}
                                {state.currentUser.role === UserRole.AGENT && (
                                    state.currentUser.agencyName && state.currentUser.agencyName !== 'Independent Agent' ? (
                                        <button
                                            onClick={handleAgencyClick}
                                            className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-primary/10 backdrop-blur-sm rounded-xl border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
                                            title="View agency details"
                                        >
                                            <BuildingOfficeIcon className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-semibold text-primary">{state.currentUser.agencyName}</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-white/30 backdrop-blur-sm rounded-xl border border-white/40">
                                            <BuildingOfficeIcon className="w-4 h-4 text-gray-500" />
                                            <span className="text-xs font-semibold text-gray-600">{t('account:agent.independentAgent', 'Independent Agent')}</span>
                                        </div>
                                    )
                                )}

                                {/* License Verified Badge - Glass */}
                                {state.currentUser.role === UserRole.AGENT && state.currentUser.licenseVerified && (
                                    <div className="flex items-center gap-1 mt-2 px-3 py-1 bg-green-50/60 backdrop-blur-sm rounded-xl border border-green-200/50">
                                        <span className="text-xs font-semibold text-green-700">✓ {t('account:agent.verifiedAgent')}</span>
                                    </div>
                                )}
                            </div>
                            <nav className="space-y-2">
                                {hasSellerTabs && (
                                    <>
                                        <TabButton label={t('account:tabs.myListings', 'My Listings')} icon={<HomeIcon className="w-6 h-6"/>} isActive={activeTab === 'listings'} onClick={() => setActiveTab('listings')} tabKey="listings" />
                                        <TabButton label={t('account:tabs.promotions', 'My Promotions')} icon={<SparklesIcon className="w-6 h-6"/>} isActive={activeTab === 'promotions'} onClick={() => setActiveTab('promotions')} tabKey="promotions" />
                                        <TabButton label={t('account:tabs.performance')} icon={<ChartBarIcon className="w-6 h-6"/>} isActive={activeTab === 'performance'} onClick={() => setActiveTab('performance')} tabKey="performance" />
                                        <TabButton label={t('account:tabs.viewings', 'Viewing Requests')} icon={<CalendarIcon className="w-6 h-6"/>} isActive={activeTab === 'viewings'} onClick={() => setActiveTab('viewings')} tabKey="viewings" hasUnread={unreadViewingCount > 0} />
                                        <TabButton label={t('account:tabs.feeds', 'External Feeds')} icon={<GlobeAltIcon className="w-6 h-6"/>} isActive={activeTab === 'feeds'} onClick={() => setActiveTab('feeds')} tabKey="feeds" />
                                    </>
                                )}
                                <TabButton label={t('account:tabs.myBusinesses', 'My Businesses')} icon={<BuildingStorefrontIcon className="w-6 h-6"/>} isActive={activeTab === 'businesses'} onClick={() => setActiveTab('businesses')} tabKey="businesses" />
                                <TabButton label={t('account:tabs.profileSettings')} icon={<UserCircleIcon className="w-6 h-6"/>} isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')} tabKey="profile" />
                                <TabButton label={t('account:tabs.subscription', 'Subscription')} icon={<CreditCardIcon className="w-6 h-6"/>} isActive={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')} tabKey="subscription" />
                                <TabButton label={t('account:tabs.measurements', 'Measurements')} icon={<MapPinIcon className="w-6 h-6"/>} isActive={activeTab === 'measurements'} onClick={() => setActiveTab('measurements')} tabKey="measurements" />
                                <TabButton label={t('account:tabs.security')} icon={<ShieldCheckIcon className="w-6 h-6"/>} isActive={activeTab === 'security'} onClick={() => setActiveTab('security')} tabKey="security" />
                                <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all w-full text-left text-red-500 hover:bg-red-50/40 hover:border-red-200/40 border border-transparent backdrop-blur-sm mt-4">
                                    <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                                    <span>{t('account:logout')}</span>
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Content - Liquid Glass */}
                    <div className="lg:col-span-3">
                        <div className="bg-white/40 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-[0_8px_48px_rgba(0,0,0,0.08)] border border-white/50 ring-1 ring-white/20 min-h-[600px]">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default MyAccountPage;