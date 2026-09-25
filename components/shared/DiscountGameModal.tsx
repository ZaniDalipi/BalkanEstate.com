import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import WhackAnIconAnimation from '@/features/seller/components/WhackAnIconAnimation';
import { apiRequest } from '../../src/shared/api/httpClient';

export type GameReward =
    | { type: 'discount'; code: string; discountPercent: number; validUntil: string; hits?: number; alreadyClaimed?: boolean }
    | { type: 'listings'; hits: number; bonusListings: number; totalBonusListings: number }
    | { type: 'none'; hits: 0 };

interface DiscountGameModalProps {
    isOpen: boolean;
    /** Whether the user already pays for listings (reward is bonus listings instead of a discount) */
    isSubscriber: boolean;
    onClose: () => void;
    /** Discount won: show the seller plans with the code applied */
    onViewPlans: (reward: Extract<GameReward, { type: 'discount' }>) => void;
    /** Bonus listings won: refresh the user so the new credits are usable right away */
    onListingsAdded: () => Promise<void> | void;
}

type Phase =
    | { name: 'playing' }
    | { name: 'claiming' }
    | { name: 'result'; reward: GameReward }
    | { name: 'cooldown'; nextAvailableAt?: string }
    | { name: 'error'; message: string };

const DiscountGameModal: React.FC<DiscountGameModalProps> = ({ isOpen, isSubscriber, onClose, onViewPlans, onListingsAdded }) => {
    const { t, i18n } = useTranslation(['modals', 'common']);
    const [phase, setPhase] = useState<Phase>({ name: 'playing' });
    const [round, setRound] = useState(0);
    const [copied, setCopied] = useState(false);
    const [finishing, setFinishing] = useState(false);

    const handleGameEnd = async (score: number, totalMoles: number) => {
        setPhase({ name: 'claiming' });
        try {
            const data = await apiRequest<{ reward: GameReward }>('/game-rewards/claim', {
                method: 'POST',
                body: { score, totalMoles },
                requiresAuth: true,
            });
            if (data.reward.type !== 'none') {
                // Reset ad view counter since they earned their reward
                try { localStorage.setItem('balkan_estate_ad_views', '0'); } catch { /* storage unavailable */ }
            }
            setPhase({ name: 'result', reward: data.reward });
        } catch (err: any) {
            if (err?.code === 'GAME_REWARD_COOLDOWN') {
                setPhase({ name: 'cooldown', nextAvailableAt: err.details?.nextAvailableAt });
            } else {
                setPhase({ name: 'error', message: err?.message || t('gameReward.error', 'We could not save your reward. Please try again.') });
            }
        }
    };

    const playAgain = () => {
        setRound(r => r + 1);
        setPhase({ name: 'playing' });
    };

    const copyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard unavailable; code is still visible */ }
    };

    const finishListings = async () => {
        setFinishing(true);
        try {
            await onListingsAdded();
        } finally {
            setFinishing(false);
        }
    };

    const formatDate = (iso?: string) =>
        iso ? new Date(iso).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }) : '';

    // Closing is allowed once the round is over; mid-game it would throw the score away.
    const canClose = phase.name !== 'playing' && phase.name !== 'claiming';
    const handleClose = () => { if (canClose) onClose(); };

    if (!isOpen) return null;

    const primaryBtn = 'w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-60';
    const secondaryBtn = 'w-full px-6 py-3 bg-neutral-100 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-200 transition-colors';

    const renderResult = (reward: GameReward) => {
        if (reward.type === 'discount') {
            return (
                <div className="text-center p-4 sm:p-6">
                    <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
                        {reward.alreadyClaimed
                            ? t('gameReward.alreadyClaimed', 'You already won a code today — here it is again')
                            : t('gameReward.youWon', 'You won!')}
                    </p>
                    <p className="text-5xl font-extrabold text-orange-600 mt-2">
                        {t('gameReward.percentOff', '{{percent}}% OFF', { percent: reward.discountPercent })}
                    </p>
                    <p className="text-neutral-600 mt-2">
                        {t('gameReward.discountDescription', 'Use this code on any Pro or Enterprise seller plan.')}
                    </p>

                    <div className="mt-6 flex items-stretch gap-2 max-w-sm mx-auto">
                        <code className="flex-1 flex items-center justify-center px-4 py-3 bg-amber-50 border-2 border-dashed border-amber-400 rounded-lg text-lg font-mono font-bold text-amber-900 select-all break-all">
                            {reward.code}
                        </code>
                        <button
                            onClick={() => copyCode(reward.code)}
                            className="px-4 py-3 bg-neutral-800 text-white font-semibold rounded-lg hover:bg-neutral-700 transition-colors"
                        >
                            {copied ? t('gameReward.copied', 'Copied!') : t('gameReward.copy', 'Copy')}
                        </button>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">
                        {t('gameReward.validUntil', 'Single use · valid until {{date}}', { date: formatDate(reward.validUntil) })}
                    </p>

                    <div className="mt-6 flex flex-col gap-3">
                        <button onClick={() => onViewPlans(reward)} className={primaryBtn}>
                            {t('gameReward.viewPlans', 'See plans with my discount')}
                        </button>
                        <button onClick={onClose} className={secondaryBtn}>
                            {t('gameReward.later', "I'll use it later")}
                        </button>
                    </div>
                </div>
            );
        }

        if (reward.type === 'listings') {
            return (
                <div className="text-center p-4 sm:p-6">
                    <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">
                        {t('gameReward.youWon', 'You won!')}
                    </p>
                    <p className="text-5xl font-extrabold text-emerald-600 mt-2">
                        {t('gameReward.plusListings', '+{{count}} listings', { count: reward.bonusListings })}
                    </p>
                    <p className="text-neutral-600 mt-3">
                        {t('gameReward.listingsDescription', '{{hits}} hits = {{count}} extra listings, added to your account. They are used once your monthly allowance runs out.', { hits: reward.hits, count: reward.bonusListings })}
                    </p>
                    {reward.totalBonusListings > reward.bonusListings && (
                        <p className="text-sm text-neutral-500 mt-1">
                            {t('gameReward.totalBonus', 'You now have {{total}} bonus listings.', { total: reward.totalBonusListings })}
                        </p>
                    )}
                    <div className="mt-6">
                        <button onClick={finishListings} disabled={finishing} className={primaryBtn}>
                            {t('gameReward.continueListing', 'Continue listing')}
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="text-center p-4 sm:p-6">
                <p className="text-2xl font-bold text-neutral-800">{t('gameReward.noHits', 'No hits this time')}</p>
                <p className="text-neutral-600 mt-2">
                    {isSubscriber
                        ? t('gameReward.noHitsSubscriber', 'Every icon you hit is one extra listing. Give it another go!')
                        : t('gameReward.noHitsFree', 'Every icon you hit adds to your discount. Give it another go!')}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                    <button onClick={playAgain} className={primaryBtn}>{t('gameReward.playAgain', 'Play again')}</button>
                    <button onClick={onClose} className={secondaryBtn}>{t('common:actions.close', 'Close')}</button>
                </div>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
            {phase.name === 'playing' && (
                <WhackAnIconAnimation
                    key={round}
                    mode="game"
                    onGameEnd={handleGameEnd}
                    description={isSubscriber
                        ? t('gameReward.instructionsSubscriber', 'You have 20 seconds. Every icon you hit = 1 extra listing!')
                        : t('gameReward.instructionsFree', 'You have 20 seconds. Every icon you hit = 5% off a Pro plan (up to 50%)!')}
                />
            )}

            {phase.name === 'claiming' && (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-10 h-10 border-4 border-amber-200 border-t-orange-500 rounded-full animate-spin" />
                    <p className="mt-4 text-neutral-600">{t('gameReward.claiming', 'Calculating your reward...')}</p>
                </div>
            )}

            {phase.name === 'result' && renderResult(phase.reward)}

            {phase.name === 'cooldown' && (
                <div className="text-center p-4 sm:p-6">
                    <p className="text-2xl font-bold text-neutral-800">{t('gameReward.cooldownTitle', 'Reward already claimed today')}</p>
                    <p className="text-neutral-600 mt-2">
                        {phase.nextAvailableAt
                            ? t('gameReward.cooldownUntil', 'You can win another reward after {{date}}.', { date: formatDate(phase.nextAvailableAt) })
                            : t('gameReward.cooldown', 'You can win one reward per day. Come back tomorrow!')}
                    </p>
                    <div className="mt-6">
                        <button onClick={onClose} className={secondaryBtn}>{t('common:actions.close', 'Close')}</button>
                    </div>
                </div>
            )}

            {phase.name === 'error' && (
                <div className="text-center p-4 sm:p-6">
                    <p className="text-2xl font-bold text-neutral-800">{t('gameReward.errorTitle', 'Something went wrong')}</p>
                    <p className="text-neutral-600 mt-2">{phase.message}</p>
                    <div className="mt-6">
                        <button onClick={onClose} className={secondaryBtn}>{t('common:actions.close', 'Close')}</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default DiscountGameModal;
