import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { Agent, Agency } from '@/types';
import {
    ArrowLeftIcon,
    BuildingOfficeIcon,
    MapPinIcon,
    CheckBadgeIcon,
    ChevronRightIcon,
    HeartIcon,
    ShareIcon,
    FireIcon,
    StarIcon,
    PencilIcon,
    UsersIcon,
    HomeIcon,
} from '@/constants';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import NotificationCenter from '@/shared/components/NotificationCenter';
import { AgentStats } from './useAgentProfile';
import { useAppContext } from '@/context/AppContext';

interface AgentProfileHeaderProps {
    agent: Agent;
    stats: AgentStats;
    activeListings: any[];
    isAgencyAgent: string | false | undefined;
    agencyData: Agency | null;
    agencyGradient: string;
    headerGradient: string;
    savedAgent: boolean;
    isOwner: boolean | null | undefined;
    hasCoverImage: string | false | undefined;
    onBack: () => void;
    onSaveAgent: () => void;
    onShareAgent: () => void;
    onAgencyClick: () => void;
    onVisitAgency: () => void;
    onOpenEditModal: () => void;
}

const AgentProfileHeader: React.FC<AgentProfileHeaderProps> = ({
    agent,
    stats,
    activeListings,
    isAgencyAgent,
    agencyData,
    agencyGradient,
    headerGradient,
    savedAgent,
    isOwner,
    hasCoverImage,
    onBack,
    onSaveAgent,
    onShareAgent,
    onAgencyClick,
    onVisitAgency,
    onOpenEditModal,
}) => {
    const { t } = useTranslation(['agents', 'nav']);
    const { state, dispatch } = useAppContext();
    const { isAuthenticated, currentUser } = state;

    const handleAccountClick = useCallback(() => {
        if (isAuthenticated) {
            dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
            window.history.pushState({}, '', '/account');
        } else {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
        }
    }, [isAuthenticated, dispatch]);

    const handleNewListingClick = useCallback(() => {
        if (isAuthenticated) {
            dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
            window.history.pushState({}, '', '/create-listing');
        } else {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
        }
    }, [isAuthenticated, dispatch]);

    const handleSubscribeClick = useCallback(() => {
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
        const currentLang = window.location.pathname.split('/')[1] || 'en';
        const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
        const lang = validLangs.includes(currentLang) ? currentLang : 'en';
        window.history.pushState({}, '', `/${lang}/subscribe`);
    }, [dispatch]);

    const accountButton = useMemo(() => {
        if (isAuthenticated && currentUser) {
            return (
                <button
                    onClick={handleAccountClick}
                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-all border border-white/[0.08]"
                    aria-label={t('nav:myAccount')}
                >
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        {currentUser.avatarUrl ? (
                            <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" aria-hidden="true" />
                        ) : (
                            <DefaultAvatar gender={currentUser.gender} seed={currentUser.id || currentUser.name} avatarOptions={currentUser.avatarOptions} />
                        )}
                    </div>
                    <span className="hidden lg:inline text-xs font-medium">{t('nav:myAccount')}</span>
                </button>
            );
        }
        return (
            <button
                onClick={handleAccountClick}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-all border border-white/[0.08]"
                aria-label={t('nav:loginRegister')}
            >
                <User className="w-4 h-4" aria-hidden="true" />
                <span className="hidden lg:inline text-xs font-medium">{t('nav:loginRegister')}</span>
            </button>
        );
    }, [isAuthenticated, currentUser, handleAccountClick, t]);

    // Use AppContext avatar if this agent is the current user (immediate propagation)
    const isCurrentUser = state.currentUser && (
        agent.userId === state.currentUser.id ||
        agent.id === state.currentUser.id ||
        agent._id === state.currentUser._id
    );
    const resolvedAvatarUrl = isCurrentUser && state.currentUser?.avatarUrl
        ? state.currentUser.avatarUrl
        : agent.avatarUrl;

    return (
        <>
            {/* Agency Agent Header - Liquid Glass Banner */}
            {isAgencyAgent && (
                <div className="sticky top-0 z-40">
                    <div className="relative h-16 sm:h-[4.5rem] overflow-hidden">
                        {/* Background Layer - Blurred cover image extending to edges */}
                        {hasCoverImage ? (
                            <>
                                {/* Heavily blurred background fill for sides */}
                                <img
                                    src={agent.agencyCoverImage}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-md"
                                />
                                {/* Glass overlay */}
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" />
                                {/* Subtle gradient shimmer */}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] via-white/[0.08] to-white/[0.03]" />
                            </>
                        ) : (
                            <>
                                <div className={`absolute inset-0 ${headerGradient}`} />
                                <div className="absolute inset-0 backdrop-blur-sm bg-black/10" />
                            </>
                        )}

                        {/* Bottom border glow */}
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        {/* Navigation Content */}
                        <div className="relative h-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-full">
                                {/* Back Button */}
                                <button
                                    onClick={onBack}
                                    className="flex items-center gap-1.5 text-white/80 hover:text-white font-medium transition-all group bg-white/[0.06] hover:bg-white/[0.12] px-2.5 py-1.5 rounded-xl border border-white/[0.08]"
                                >
                                    <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                    <span className="hidden sm:inline text-sm">{t('profilePage.header.back')}</span>
                                </button>

                                {/* Agency Brand - Center with liquid glass container */}
                                <button
                                    onClick={onAgencyClick}
                                    className="flex items-center gap-2.5 sm:gap-3 hover:bg-white/[0.08] px-2.5 sm:px-4 py-1.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/[0.1]"
                                >
                                    {/* Logo in glass container */}
                                    <div className="relative flex-shrink-0">
                                        {agent.agencyLogo ? (
                                            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-white/20 shadow-lg shadow-black/20">
                                                {/* Blurred background of the same image */}
                                                <img
                                                    src={agent.agencyLogo}
                                                    alt=""
                                                    className="absolute inset-0 w-full h-full object-cover scale-150 blur-sm opacity-40"
                                                />
                                                {/* Glass layer */}
                                                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
                                                {/* Actual logo, properly contained */}
                                                <img
                                                    src={agent.agencyLogo}
                                                    alt={agent.agencyName}
                                                    className="relative w-full h-full object-contain p-1"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg shadow-black/10">
                                                <BuildingOfficeIcon className="w-5 h-5 text-white/90" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-left min-w-0">
                                        <p className="text-sm sm:text-base font-semibold text-white leading-tight truncate max-w-[120px] sm:max-w-[200px]">{agent.agencyName}</p>
                                        <p className="text-[10px] sm:text-xs text-white/60 hidden sm:block font-medium">{t('profilePage.header.viewAgencyProfile')}</p>
                                    </div>
                                </button>

                                {/* Actions - Glass buttons */}
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                    {isOwner && (
                                        <button
                                            onClick={onOpenEditModal}
                                            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-all border border-white/[0.08]"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                            <span className="hidden md:inline text-xs font-medium">{t('profilePage.header.editProfile')}</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={onSaveAgent}
                                        className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-all border border-white/[0.08]"
                                    >
                                        <HeartIcon className={`w-4 h-4 ${savedAgent ? 'fill-red-400 text-red-400' : ''}`} />
                                        <span className="hidden md:inline text-xs font-medium">{savedAgent ? t('profilePage.header.saved') : t('profilePage.header.save')}</span>
                                    </button>
                                    <button
                                        onClick={onShareAgent}
                                        className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-all border border-white/[0.08]"
                                    >
                                        <ShareIcon className="w-4 h-4" />
                                        <span className="hidden md:inline text-xs font-medium">{t('profilePage.header.share')}</span>
                                    </button>

                                    {/* Divider */}
                                    <div className="hidden sm:block w-px h-6 bg-white/20 mx-0.5" />

                                    {/* Global Nav Actions */}
                                    <button
                                        onClick={handleSubscribeClick}
                                        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/80 hover:bg-primary text-white rounded-xl transition-all text-xs font-semibold border border-white/[0.08]"
                                    >
                                        <span>{t('nav:subscribe')}</span>
                                    </button>
                                    <button
                                        onClick={handleNewListingClick}
                                        className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary/80 hover:bg-secondary text-white rounded-xl transition-all text-xs font-semibold border border-white/[0.08]"
                                    >
                                        + {t('nav:newListing')}
                                    </button>
                                    <NotificationCenter />
                                    {accountButton}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Independent Agent Header */}
            {!isAgencyAgent && (
                <div className="sticky top-0 z-40">
                    {/* Dark gradient bar for independent agents */}
                    <div className="relative bg-gradient-to-r from-gray-800 to-gray-900">
                        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-14">
                            <div className="flex items-center justify-between sm:h-full gap-2">
                                {/* Back Button */}
                                <button
                                    onClick={onBack}
                                    className="flex items-center gap-1.5 sm:gap-2 text-white/90 hover:text-white font-medium transition-colors group flex-shrink-0"
                                >
                                    <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
                                    <span className="text-sm sm:text-base">{t('profilePage.header.backToAgents')}</span>
                                </button>

                                {/* Independent Agent Badge - hidden on mobile */}
                                <div className="hidden sm:flex items-center gap-3">
                                    <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                        <span className="text-white font-semibold text-sm">{t('profilePage.header.independentAgent')}</span>
                                    </div>
                                </div>

                                {/* Actions - icons only on mobile */}
                                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                    {isOwner && (
                                        <button
                                            onClick={onOpenEditModal}
                                            className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            title={t('profilePage.header.editProfile')}
                                        >
                                            <PencilIcon className="w-5 h-5" />
                                            <span className="hidden md:inline text-sm font-medium">{t('profilePage.header.editProfile')}</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={onSaveAgent}
                                        className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        title={savedAgent ? t('profilePage.header.saved') : t('profilePage.header.save')}
                                    >
                                        <HeartIcon className={`w-5 h-5 ${savedAgent ? 'fill-red-400 text-red-400' : ''}`} />
                                        <span className="hidden md:inline text-sm font-medium">{savedAgent ? t('profilePage.header.saved') : t('profilePage.header.save')}</span>
                                    </button>
                                    <button
                                        onClick={onShareAgent}
                                        className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        title={t('profilePage.header.share')}
                                    >
                                        <ShareIcon className="w-5 h-5" />
                                        <span className="hidden md:inline text-sm font-medium">{t('profilePage.header.share')}</span>
                                    </button>

                                    {/* Divider */}
                                    <div className="hidden sm:block w-px h-6 bg-white/20 mx-0.5" />

                                    {/* Global Nav Actions */}
                                    <button
                                        onClick={handleSubscribeClick}
                                        className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-primary/80 hover:bg-primary text-white rounded-lg transition-all text-sm font-semibold"
                                    >
                                        {t('nav:subscribe')}
                                    </button>
                                    <button
                                        onClick={handleNewListingClick}
                                        className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-secondary/80 hover:bg-secondary text-white rounded-lg transition-all text-sm font-semibold"
                                    >
                                        + {t('nav:newListing')}
                                    </button>
                                    <NotificationCenter />
                                    {accountButton}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Section - Clean white background */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-10">
                    <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 sm:gap-6 lg:gap-8">
                        {/* Agent Photo */}
                        <div className="relative flex-shrink-0">
                            <div className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl border-2 sm:border-4 border-white/50" style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.12), inset 2px 2px 2px 0 rgba(255,255,255,0.5), inset -1px -1px 1px 1px rgba(255,255,255,0.3)' }}>
                                {resolvedAvatarUrl ? (
                                    <img
                                        src={resolvedAvatarUrl}
                                        alt={agent.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <DefaultAvatar gender={agent.gender} seed={agent.agentId || agent.id || agent.name} avatarOptions={agent.avatarOptions} show3d />
                                )}
                            </div>
                            {/* Verified Badge */}
                            <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-green-500 text-white p-1.5 sm:p-2 rounded-full shadow-lg border-2 border-white">
                                <CheckBadgeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                        </div>

                        {/* Agent Info */}
                        <div className="flex-1 text-center lg:text-left">
                            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">{agent.name}</h1>
                                {stats.rating >= 4.5 && (
                                    <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-orange-100 text-orange-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-semibold">
                                        <FireIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                        {t('profilePage.badges.topAgent')}
                                    </span>
                                )}
                            </div>

                            {/* Agency Tag */}
                            {isAgencyAgent && (
                                <button
                                    onClick={onAgencyClick}
                                    className="inline-flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 mb-2 sm:mb-3 transition-colors text-sm sm:text-base"
                                >
                                    <BuildingOfficeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className="font-medium">{agent.agencyName}</span>
                                    <ChevronRightIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                </button>
                            )}

                            {/* Location */}
                            {(agent.city || agent.country) && (
                                <div className="flex items-center justify-center lg:justify-start gap-1.5 sm:gap-2 mb-3 sm:mb-4 lg:mb-6 text-gray-600">
                                    <MapPinIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                    <span className="text-sm sm:text-base lg:text-lg">{[agent.city, agent.country].filter(Boolean).join(', ')}</span>
                                </div>
                            )}

                            {/* Rating */}
                            <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-3 sm:mb-4 lg:mb-6">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <StarIcon
                                                key={star}
                                                className={`w-4 h-4 sm:w-5 sm:h-5 ${star <= Math.round(stats.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{stats.rating.toFixed(1)}</span>
                                    <span className="text-gray-500 text-xs sm:text-sm">({stats.reviews} {t('profilePage.stats.reviews')})</span>
                                </div>
                            </div>

                            {/* Quick Stats - Horizontal pills - Compact on mobile */}
                            <div className="flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-3">
                                <div className="bg-blue-50 border border-blue-100 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl">
                                    <span className="text-lg sm:text-2xl font-bold text-blue-700">{stats.totalSales}</span>
                                    <span className="text-blue-600/80 ml-1.5 sm:ml-2 text-xs sm:text-sm font-medium">{t('profilePage.stats.propertiesSold')}</span>
                                </div>
                                <div className="bg-green-50 border border-green-100 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl">
                                    <span className="text-lg sm:text-2xl font-bold text-green-700">{stats.yearsExperience}+</span>
                                    <span className="text-green-600/80 ml-1.5 sm:ml-2 text-xs sm:text-sm font-medium">{t('profilePage.stats.yearsExperience')}</span>
                                </div>
                                <div className="bg-purple-50 border border-purple-100 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl">
                                    <span className="text-lg sm:text-2xl font-bold text-purple-700">{activeListings.length}</span>
                                    <span className="text-purple-600/80 ml-1.5 sm:ml-2 text-xs sm:text-sm font-medium">{t('profilePage.stats.activeListings')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Agency Card - Floating on desktop */}
                        {isAgencyAgent && agencyData && (
                            <div className="w-full lg:w-auto lg:min-w-[280px] xl:min-w-[320px]">
                                <div className="bg-white rounded-xl sm:rounded-2xl border sm:border-2 border-gray-200 shadow-md sm:shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                                    {/* Agency Header with Gradient */}
                                    <div className={`${agencyGradient} p-4 sm:p-6 text-white relative overflow-hidden`}>
                                        <div className="absolute inset-0 bg-black/10"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                                                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                                    {agencyData.logo ? (
                                                        <img
                                                            src={agencyData.logo}
                                                            alt={agencyData.name}
                                                            loading="lazy"
                                                            decoding="async"
                                                            className="w-8 h-8 sm:w-12 sm:h-12 object-cover rounded-md sm:rounded-lg"
                                                        />
                                                    ) : (
                                                        <BuildingOfficeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] sm:text-xs font-medium text-white/80 mb-0.5 sm:mb-1">{t('profilePage.agencyCard.memberOf')}</p>
                                                    <h3 className="text-sm sm:text-lg font-bold text-white truncate">{agencyData.name}</h3>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Agency Stats */}
                                    <div className="p-3 sm:p-5 bg-gradient-to-b from-gray-50 to-white">
                                        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                                            <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-200 shadow-sm">
                                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                                    <UsersIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                                                    <span className="text-[10px] sm:text-xs text-gray-600 font-medium">{t('profilePage.agencyCard.agents')}</span>
                                                </div>
                                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{agencyData.totalAgents || 0}</p>
                                            </div>
                                            <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-200 shadow-sm">
                                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                                    <HomeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                                                    <span className="text-[10px] sm:text-xs text-gray-600 font-medium">{t('profilePage.agencyCard.properties')}</span>
                                                </div>
                                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{agencyData.totalProperties || 0}</p>
                                            </div>
                                        </div>

                                        {/* Location */}
                                        {agencyData.city && (
                                            <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-gray-600 bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
                                                <MapPinIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-gray-500" />
                                                <span className="text-xs sm:text-sm truncate">{agencyData.city}, {agencyData.country}</span>
                                            </div>
                                        )}

                                        {/* Visit Agency Button */}
                                        <button
                                            onClick={onVisitAgency}
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 sm:py-3.5 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 group text-sm sm:text-base"
                                        >
                                            <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span>{t('profilePage.agencyCard.visitAgency')}</span>
                                            <ChevronRightIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AgentProfileHeader;
