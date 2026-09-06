import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from '@/src/hooks/useMediaQuery';
import { SUCCESS_REDIRECT_MS } from './ListingFormHelpers';

/** Brand-ish confetti colours, kept in the blue/purple family of the app. */
const CONFETTI_COLORS = ['#3b82f6', '#8b5cf6', '#22d3ee', '#34d399', '#fbbf24', '#f472b6'];
const CONFETTI_COUNT = 22;

/** How long each encouragement stays on screen before the next one fades in. */
const MESSAGE_INTERVAL_MS = 1500;

interface ConfettiPiece {
    left: number;
    delay: number;
    duration: number;
    drift: number;
    spin: number;
    size: number;
    color: string;
    round: boolean;
}

/**
 * Builds the confetti field once per mount. Randomised so no two celebrations
 * look identical, but computed a single time so React re-renders (the rotating
 * message ticks every 1.5s) never restart the falling pieces mid-flight.
 */
function buildConfetti(): ConfettiPiece[] {
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        left: (i / CONFETTI_COUNT) * 100 + (Math.random() * 6 - 3),
        delay: Math.random() * 2.4,
        duration: 2.4 + Math.random() * 1.8,
        drift: Math.random() * 120 - 60,
        spin: 360 + Math.random() * 540,
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 3 === 0,
    }));
}

interface ListingSuccessCelebrationProps {
    /** Edits get a quieter "updated" wording than a brand new listing. */
    isEdit: boolean;
}

/**
 * The reward screen shown the moment a listing goes live: confetti, a badge
 * that draws its own checkmark, and a short rotation of encouragements so the
 * seller reads something useful instead of watching a bare redirect notice.
 */
const ListingSuccessCelebration: React.FC<ListingSuccessCelebrationProps> = ({ isEdit }) => {
    const { t } = useTranslation(['newListing']);
    const reducedMotion = useReducedMotion();
    const confetti = useMemo(() => (reducedMotion ? [] : buildConfetti()), [reducedMotion]);

    const messages = useMemo(() => (isEdit
        ? [
            t('newListing:success.encouragement.updatedLive', 'Your changes are already visible to buyers.'),
            t('newListing:success.encouragement.updatedFresh', 'Freshly updated listings get pushed back up the search results.'),
            t('newListing:success.encouragement.updatedNotify', "We'll let you know as soon as someone reaches out."),
        ]
        : [
            t('newListing:success.encouragement.live', 'Buyers across 10 Balkan countries can find your property right now.'),
            t('newListing:success.encouragement.photos', 'Listings with great photos get up to 3× more views — yours are live.'),
            t('newListing:success.encouragement.notify', "We'll notify you the moment someone saves or messages your listing."),
            t('newListing:success.encouragement.proud', "Nice work — that's one big step closer to closing the deal."),
        ]), [isEdit, t]);

    const [messageIndex, setMessageIndex] = useState(0);

    // Rotate through the encouragements for as long as the screen is up. The
    // redirect unmounts us, so the interval only ever runs a few times.
    useEffect(() => {
        if (reducedMotion || messages.length < 2) return;
        const id = window.setInterval(() => {
            setMessageIndex(prev => (prev + 1) % messages.length);
        }, MESSAGE_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [reducedMotion, messages.length]);

    const title = isEdit
        ? t('newListing:success.updatedTitle', 'Listing updated!')
        : t('newListing:success.publishedTitle', "You're live! 🎉");

    const subtitle = isEdit
        ? t('newListing:success.updatedSubtitle', 'Your property page has been refreshed.')
        : t('newListing:success.publishedSubtitle', 'Your property is now on BalkanEstate.');

    const chips = [
        { icon: '👀', label: t('newListing:success.chips.visible', 'Visible in search') },
        { icon: '🔔', label: t('newListing:success.chips.alerts', 'Buyer alerts sent') },
        { icon: '💬', label: t('newListing:success.chips.messages', 'Ready for messages') },
    ];

    return (
        <div
            className="relative flex flex-col items-center justify-center text-center min-h-[60vh] py-10 px-4 overflow-hidden"
            aria-live="polite"
        >
            {/* Confetti layer — decorative, so it stays out of the a11y tree. */}
            {confetti.length > 0 && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                    {confetti.map((piece, i) => (
                        <span
                            key={i}
                            className={`celebration-confetti absolute top-0 block ${piece.round ? 'rounded-full' : 'rounded-[2px]'}`}
                            style={{
                                left: `${piece.left}%`,
                                width: `${piece.size}px`,
                                height: `${piece.size * (piece.round ? 1 : 1.6)}px`,
                                backgroundColor: piece.color,
                                ['--confetti-delay' as string]: `${piece.delay}s`,
                                ['--confetti-duration' as string]: `${piece.duration}s`,
                                ['--confetti-drift' as string]: `${piece.drift}px`,
                                ['--confetti-spin' as string]: `${piece.spin}deg`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Badge with pulsing halo rings and a self-drawing checkmark. */}
            <div className="relative z-10 flex items-center justify-center w-32 h-32 mb-6">
                {[0, 0.8, 1.6].map(delay => (
                    <span
                        key={delay}
                        aria-hidden="true"
                        className="celebration-ring absolute inset-0 rounded-full border-2 border-emerald-400/60"
                        style={{ ['--ring-delay' as string]: `${delay}s` }}
                    />
                ))}
                <div className="celebration-pop relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30">
                    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                            className="celebration-check"
                            d="M5 13l4.5 4.5L19 7.5"
                            stroke="white"
                            strokeWidth={2.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            </div>

            <h3 className="celebration-rise relative z-10 text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
                {title}
            </h3>
            <p
                className="celebration-rise relative z-10 mt-2 text-base text-gray-600"
                style={{ ['--rise-delay' as string]: '0.1s' }}
            >
                {subtitle}
            </p>

            {/* Rotating encouragement. Keyed on the index so each line replays
                the fade-in as it swaps. */}
            <p
                key={messageIndex}
                className="celebration-message relative z-10 mt-5 max-w-md text-sm sm:text-base font-medium text-gray-700 min-h-[3rem]"
            >
                {messages[messageIndex]}
            </p>

            <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-2">
                {chips.map((chip, i) => (
                    <span
                        key={chip.label}
                        className="celebration-rise inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-gray-200 text-xs font-semibold text-gray-700"
                        style={{ ['--rise-delay' as string]: `${0.2 + i * 0.1}s` }}
                    >
                        <span aria-hidden="true">{chip.icon}</span>
                        {chip.label}
                    </span>
                ))}
            </div>

            {/* Redirect countdown — the bar fills over exactly the delay the
                form waits before switching to the dashboard. */}
            <div
                className="celebration-rise relative z-10 mt-8 w-full max-w-xs"
                style={{ ['--rise-delay' as string]: '0.5s' }}
            >
                <p className="text-xs text-gray-500 mb-2">
                    {t('newListing:success.redirecting', 'Taking you to your dashboard...')}
                </p>
                <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                        className="celebration-bar h-full w-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400"
                        style={{ ['--celebration-duration' as string]: `${SUCCESS_REDIRECT_MS}ms` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ListingSuccessCelebration;
