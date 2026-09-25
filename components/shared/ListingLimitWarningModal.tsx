import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { useGameRewardStatus, type GameRewardCode } from '@/src/features/seller/hooks/useGameRewardStatus';

// Game controller icon for play
const GameIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
);

// Gift/discount icon
const GiftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
);

const primaryButtonClass = 'flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all transform hover:scale-105';

interface ListingLimitWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    tierName?: string; // e.g., "Free", "Pro Monthly", "Pro Yearly"
    listingLimit?: number; // The actual limit for this tier
    isSubscriber?: boolean; // Paying users win bonus listings instead of a discount
    onUseCode: (code: GameRewardCode) => void; // Already holds an unused game code
    onViewPlans: () => void; // Can't play this week: go straight to the plans
}

const ListingLimitWarningModal: React.FC<ListingLimitWarningModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    tierName = 'Free',
    listingLimit = 3,
    isSubscriber = false,
    onUseCode,
    onViewPlans,
}) => {
    const { t, i18n } = useTranslation(['modals', 'common']);
    // Checked before playing so nobody plays a whole round only to hit the daily limit.
    // If the check fails, offer the game anyway; the claim enforces the limit.
    const { data: status } = useGameRewardStatus(isOpen);
    const activeCode = status && !status.canPlay ? status.activeCode : null;
    const onCooldown = !!status && !status.canPlay && !activeCode;
    const nextGameDate = status?.nextAvailableAt
        ? new Date(status.nextAvailableAt).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
        : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="text-center p-4 sm:p-6">
                {/* Animated icon container */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full opacity-20 animate-pulse"></div>
                    <div className="absolute inset-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                        <GiftIcon className="w-10 h-10 text-white" />
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-neutral-800 mb-3">
                    {t('listingLimit.title')}
                </h3>

                {/* Message - Dynamic based on tier */}
                <p className="text-neutral-600 mb-4">
                    {isSubscriber
                        ? t('listingLimit.messageMonthly', "You've used all {{limit}} listings in your {{tierName}} plan this month.", { tierName, limit: listingLimit })
                        : t('listingLimit.messageDynamic', { tierName, limit: listingLimit })}
                </p>

                {/* Draft saved notice */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-green-700 flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('listingLimit.draftSaved')}
                    </p>
                </div>

                {/* Game offer, or what is left of this week's reward */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-4 mb-6">
                    {activeCode ? (
                        <>
                            <p className="font-bold text-amber-800 text-lg mb-1">
                                {t('listingLimit.haveCodeTitle', 'You already won {{percent}}% off!', { percent: activeCode.discountPercent })}
                            </p>
                            <p className="text-sm text-amber-700">
                                {t('listingLimit.haveCodeDescription', 'Your code {{code}} is still valid. Use it on a Pro plan to keep listing.', { code: activeCode.code })}
                            </p>
                        </>
                    ) : onCooldown ? (
                        <>
                            <p className="font-bold text-amber-800 text-lg mb-1">
                                {t('listingLimit.playedTodayTitle', "You've already played this week")}
                            </p>
                            <p className="text-sm text-amber-700">
                                {t('listingLimit.playedTodayDescription', 'You can play for another reward after {{date}}.', { date: nextGameDate })}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="font-bold text-amber-800 text-lg mb-1">
                                {isSubscriber
                                    ? t('listingLimit.bonusOffer', 'Win extra listings!')
                                    : t('listingLimit.discountOffer')}
                            </p>
                            <p className="text-sm text-amber-700">
                                {isSubscriber
                                    ? t('listingLimit.bonusGameDescription', 'Play a quick game: every icon you hit adds 1 extra listing to your account.')
                                    : t('listingLimit.gameDescription')}
                            </p>
                        </>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {activeCode ? (
                        <button onClick={() => onUseCode(activeCode)} className={primaryButtonClass}>
                            {t('listingLimit.useMyDiscount', 'Use my {{percent}}% discount', { percent: activeCode.discountPercent })}
                        </button>
                    ) : onCooldown ? (
                        !isSubscriber && (
                            <button onClick={onViewPlans} className={primaryButtonClass}>
                                {t('listingLimit.viewPlans', 'View plans')}
                            </button>
                        )
                    ) : (
                        <button onClick={onConfirm} className={primaryButtonClass}>
                            <GameIcon className="w-5 h-5" />
                            {isSubscriber
                                ? t('listingLimit.playForListings', 'Play for Listings')
                                : t('listingLimit.playForDiscount')}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
                    >
                        {t('listingLimit.maybeLater')}
                    </button>
                </div>

                {/* Small note */}
                <p className="text-xs text-neutral-500 mt-4">
                    {t('listingLimit.draftNote')}
                </p>
            </div>
        </Modal>
    );
};

export default ListingLimitWarningModal;
