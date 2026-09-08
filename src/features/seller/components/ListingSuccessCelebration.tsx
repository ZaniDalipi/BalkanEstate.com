import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, BellIcon, ChatBubbleLeftRightIcon } from '@/constants';
import { useReducedMotion } from '@/src/hooks/useMediaQuery';
import { SUCCESS_REDIRECT_MS } from './ListingFormHelpers';

/**
 * One accent colour — the success green — in a few opacities, plus a neutral.
 * Deliberately not a rainbow: the rest of the screen is greyscale so the eye
 * lands on the checkmark and the headline, not on the decoration.
 */
const CONFETTI_COLORS = [
    'rgba(16, 185, 129, 0.9)',
    'rgba(16, 185, 129, 0.55)',
    'rgba(16, 185, 129, 0.3)',
    'rgba(163, 163, 163, 0.35)',
];
const CONFETTI_COUNT = 16;

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
        duration: 2.6 + Math.random() * 1.6,
        drift: Math.random() * 100 - 50,
        spin: 240 + Math.random() * 420,
        size: 4 + Math.random() * 4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 2 === 0,
    }));
}

interface ListingSuccessCelebrationProps {
    /** Edits get a quieter "updated" wording than a brand new listing. */
    isEdit: boolean;
}

/**
 * The screen a seller lands on the moment their listing goes live: a checkmark
 * that draws itself, a short rotation of encouragements, and a countdown to the
 * dashboard. Purely presentational — the redirect itself is owned by
 * useListingForm, so nothing here can fail in a way that loses the listing.
 */
const ListingSuccessCelebration: React.FC<ListingSuccessCelebrationProps> = ({ isEdit }) => {
    const { t } = useTranslation(['newListing']);
    const reducedMotion = useReducedMotion();
    const confetti = useMemo(() => (reducedMotion ? [] : buildConfetti()), [reducedMotion]);

    // Blank strings are dropped so a missing or empty translation can never
    // render an empty line in the rotation.
    const messages = useMemo(() => {
        const lines = isEdit
            ? [
                t('newListing:success.encouragement.updatedLive', 'Your changes are already visible to buyers.'),
                t('newListing:success.encouragement.updatedFresh', 'Freshly updated listings move back up the search results.'),
                t('newListing:success.encouragement.updatedNotify', "We'll let you know as soon as someone reaches out."),
            ]
            : [
                t('newListing:success.encouragement.live', 'Buyers across 10 Balkan countries can find your property right now.'),
                t('newListing:success.encouragement.photos', 'Listings with great photos get up to 3× more views — yours are live.'),
                t('newListing:success.encouragement.notify', "We'll notify you the moment someone saves or messages your listing."),
                t('newListing:success.encouragement.proud', "Nice work — that's one big step closer to closing the deal."),
            ];
        return lines.filter(line => typeof line === 'string' && line.trim().length > 0);
    }, [isEdit, t]);

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

    // The list can shrink between renders if translations load late; clamp so
    // the index can never point past the end of it.
    const currentMessage = messages.length > 0 ? messages[messageIndex % messages.length] : '';

    const title = isEdit
        ? t('newListing:success.updatedTitle', 'Listing updated')
        : t('newListing:success.publishedTitle', "Your listing is live");

    const subtitle = isEdit
        ? t('newListing:success.updatedSubtitle', 'Your property page has been refreshed.')
        : t('newListing:success.publishedSubtitle', 'Your property is now on BalkanEstate.');

    const chips = [
        { key: 'visible', Icon: EyeIcon, label: t('newListing:success.chips.visible', 'Visible in search') },
        { key: 'alerts', Icon: BellIcon, label: t('newListing:success.chips.alerts', 'Buyer alerts sent') },
        { key: 'messages', Icon: ChatBubbleLeftRightIcon, label: t('newListing:success.chips.messages', 'Ready for messages') },
    ];

    return (
        <div
            className="relative flex flex-col items-center justify-center text-center min-h-[60vh] py-12 px-4 overflow-hidden"
            aria-live="polite"
        >
            {/* Confetti layer — decorative, so it stays out of the a11y tree. */}
            {confetti.length > 0 && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                    {confetti.map((piece, i) => (
                        <span
                            key={i}
                            className={`celebration-confetti absolute top-0 block ${piece.round ? 'rounded-full' : 'rounded-[1px]'}`}
                            style={{
                                left: `${piece.left}%`,
                                width: `${piece.size}px`,
                                height: `${piece.size * (piece.round ? 1 : 1.8)}px`,
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

            {/* Badge: a hairline ring breathing outwards behind a solid mark
                whose checkmark draws itself once the badge has landed. */}
            <div className="relative z-10 flex items-center justify-center w-28 h-28 mb-7">
                {[0, 1.3].map(delay => (
                    <span
                        key={delay}
                        aria-hidden="true"
                        className="celebration-ring absolute inset-0 rounded-full border border-emerald-500/25"
                        style={{ ['--ring-delay' as string]: `${delay}s` }}
                    />
                ))}
                <div className="celebration-pop relative flex items-center justify-center w-[72px] h-[72px] rounded-full bg-emerald-500 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.6)]">
                    <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                            className="celebration-check"
                            d="M5 13l4.5 4.5L19 7.5"
                            stroke="white"
                            strokeWidth={2.2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            </div>

            <h3 className="celebration-rise relative z-10 text-[28px] sm:text-[32px] leading-tight font-semibold tracking-[-0.02em] text-neutral-900">
                {title}
            </h3>
            <p
                className="celebration-rise relative z-10 mt-2 text-[15px] text-neutral-500"
                style={{ ['--rise-delay' as string]: '0.08s' }}
            >
                {subtitle}
            </p>

            {/* Rotating encouragement. Keyed on the index so each line replays
                the fade-in as it swaps; the fixed height keeps the layout still
                while lines of different lengths come and go. */}
            <p
                key={messageIndex}
                className="celebration-message relative z-10 mt-6 max-w-sm text-[15px] leading-relaxed text-neutral-600 min-h-[3.25rem]"
            >
                {currentMessage}
            </p>

            <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-2">
                {chips.map((chip, i) => (
                    <span
                        key={chip.key}
                        className="celebration-rise inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-neutral-200 text-[13px] font-medium text-neutral-600"
                        style={{ ['--rise-delay' as string]: `${0.16 + i * 0.08}s` }}
                    >
                        <chip.Icon className="w-3.5 h-3.5 text-neutral-400" />
                        {chip.label}
                    </span>
                ))}
            </div>

            {/* Redirect countdown — the bar fills over exactly the delay the
                form waits before switching to the dashboard. */}
            <div
                className="celebration-rise relative z-10 mt-10 w-full max-w-[220px]"
                style={{ ['--rise-delay' as string]: '0.4s' }}
            >
                <p className="text-[12px] text-neutral-400 mb-2.5">
                    {t('newListing:success.redirecting', 'Taking you to your dashboard...')}
                </p>
                <div className="h-[3px] w-full rounded-full bg-neutral-200 overflow-hidden">
                    <div
                        className="celebration-bar h-full w-full rounded-full bg-emerald-500"
                        style={{ ['--celebration-duration' as string]: `${SUCCESS_REDIRECT_MS}ms` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ListingSuccessCelebration;
