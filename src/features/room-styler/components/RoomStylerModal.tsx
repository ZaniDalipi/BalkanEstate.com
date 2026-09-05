import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { XMarkIcon } from '@/constants';
import { optimizeImageUrl } from '@/config/imageConfig';
import { useAppContext } from '@/context/AppContext';
import { UsageMeter } from '@/src/shared/components/ui';
import { roomStylerKeys } from '@/src/shared/query/queryKeys';
import { restyleRoom } from '../../../../services/geminiService';
import { ROOM_STYLE_OPTIONS, EXTERIOR_STYLE_OPTIONS } from '../data/styles';
import { useRoomStylerUsage } from '../hooks/useRoomStylerUsage';
import BeforeAfterSlider from './BeforeAfterSlider';

interface RoomStylerModalProps {
    /** Full Cloudinary URL of the room photo to restyle */
    imageUrl: string;
    onClose: () => void;
}

type Status = 'idle' | 'loading' | 'done' | 'error';
type Mode = 'interior' | 'exterior';

const RoomStylerModal: React.FC<RoomStylerModalProps> = ({ imageUrl, onClose }) => {
    const { t } = useTranslation(['property']);
    const { state, dispatch } = useAppContext();
    const queryClient = useQueryClient();

    // Fetch the user's real quota FIRST so we only show "limit reached" when the
    // account has actually run out — subscribers/agency users see their true limit.
    const { usage, isLoading: usageLoading } = useRoomStylerUsage(state.isAuthenticated);

    const [mode, setMode] = useState<Mode>('interior');
    const styleOptions = mode === 'exterior' ? EXTERIOR_STYLE_OPTIONS : ROOM_STYLE_OPTIONS;
    const [selectedStyle, setSelectedStyle] = useState<string>(ROOM_STYLE_OPTIONS[0].id);
    const [status, setStatus] = useState<Status>('idle');
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Switch the style set when toggling interior/exterior; reset selection + result.
    const switchMode = useCallback((next: Mode) => {
        if (next === mode) return;
        setMode(next);
        setSelectedStyle((next === 'exterior' ? EXTERIOR_STYLE_OPTIONS : ROOM_STYLE_OPTIONS)[0].id);
        setStatus('idle');
        setResultUrl(null);
        setErrorMsg(null);
    }, [mode]);

    // Send a high-res version to the AI for a better result (still a Cloudinary URL).
    const sourceUrl = optimizeImageUrl(imageUrl, { width: 1600, quality: 'auto' }) || imageUrl;

    const isUnlimited = usage?.limit === -1;
    const isExhausted = !!usage && usage.limit !== -1 && usage.remaining <= 0;

    const handleGenerate = useCallback(async () => {
        setStatus('loading');
        setErrorMsg(null);
        setResultUrl(null);
        try {
            const { imageDataUrl } = await restyleRoom(sourceUrl, selectedStyle);
            setResultUrl(imageDataUrl);
            setStatus('done');
            // Refresh the meter so the bar reflects the just-consumed restyle.
            queryClient.invalidateQueries({ queryKey: roomStylerKeys.usage() });
        } catch (err: any) {
            if (err?.statusCode === 429) {
                setErrorMsg(err?.message || t('property:roomStyler.limitReached', 'You have reached your monthly room-styling limit.'));
                setStatus('error');
                queryClient.invalidateQueries({ queryKey: roomStylerKeys.usage() });
            } else {
                setErrorMsg(err?.message || t('property:roomStyler.genericError', 'Something went wrong. Please try again.'));
                setStatus('error');
            }
        }
    }, [sourceUrl, selectedStyle, t, queryClient]);

    const goToPricing = useCallback(() => {
        onClose();
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
        window.history.pushState({}, '', '/subscribe');
    }, [dispatch, onClose]);

    const selectedLabel = styleOptions.find(s => s.id === selectedStyle)?.label ?? '';
    const showUpgrade = isExhausted || (status === 'error' && !!errorMsg?.toLowerCase().includes('limit'));
    const generateDisabled = status === 'loading' || isExhausted;

    return (
        <div className="fixed inset-0 z-[6100] flex items-stretch justify-center bg-black/95 backdrop-blur-md p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
            <div className="relative flex h-full w-full max-h-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-neutral-900 sm:h-auto sm:max-h-[95vh] sm:max-w-6xl sm:rounded-2xl">

                {/* Header */}
                <div
                    className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-5"
                    style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
                >
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-neutral-900 dark:text-white sm:text-lg">
                            {t('property:roomStyler.title', 'Reimagine this room')}
                        </h2>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {t('property:roomStyler.subtitle', 'See this room in a different interior design style')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        aria-label={t('property:roomStyler.close', 'Close')}
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                    {/* Usage meter — reflects the user's real plan */}
                    {state.isAuthenticated && (usageLoading || usage) && (
                        <UsageMeter
                            className="mb-4"
                            label={t('property:roomStyler.meterLabel', 'AI Room Styler')}
                            used={usage?.used ?? 0}
                            limit={usage?.limit ?? 0}
                            remaining={usage?.remaining ?? 0}
                            resetDate={usage?.resetDate}
                            isLoading={usageLoading && !usage}
                        />
                    )}

                    {/* Preview / result */}
                    <div className="relative mb-3 flex h-[42vh] items-center justify-center overflow-hidden rounded-xl bg-neutral-900 sm:h-[54vh] lg:h-[62vh]">
                        {status === 'done' && resultUrl ? (
                            <BeforeAfterSlider
                                beforeSrc={sourceUrl}
                                afterSrc={resultUrl}
                                beforeLabel={t('property:roomStyler.before', 'Original')}
                                afterLabel={selectedLabel}
                                className="h-full w-full"
                            />
                        ) : (
                            <>
                                <img
                                    src={sourceUrl}
                                    alt={t('property:roomStyler.roomPhoto', 'Room photo')}
                                    className="h-full w-full object-contain"
                                    crossOrigin="anonymous"
                                />
                                {status === 'loading' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 px-4 text-center backdrop-blur-sm">
                                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                                        <p className="text-sm font-medium text-white">
                                            {t('property:roomStyler.generating', 'Restyling in {{style}}…', { style: selectedLabel })}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Disclaimer — generated images are AI staging, not real photos */}
                    <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-[11px] leading-snug text-amber-800 dark:text-amber-200">
                        <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                            {t('property:roomStyler.disclaimer', 'AI-generated staging for demonstration only. These images are not real photos of the property and may include items that are not part of the listing.')}
                        </span>
                    </div>

                    {/* Generic (non-limit) error */}
                    {status === 'error' && errorMsg && !showUpgrade && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                            <p>{errorMsg}</p>
                        </div>
                    )}

                    {/* Limit-reached upsell — proactive when quota is spent */}
                    {showUpgrade && (
                        <div className="mb-4 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 dark:border-violet-900/50 dark:from-violet-950/40 dark:to-purple-950/40 p-4">
                            <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">
                                {t('property:roomStyler.limitTitle', "You've used all your restyles this month")}
                            </p>
                            <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
                                {t('property:roomStyler.limitMessage', 'Upgrade to Pro Buyer or another plan to keep reimagining rooms — or wait until your quota resets.')}
                            </p>
                            <button
                                type="button"
                                onClick={goToPricing}
                                className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
                            >
                                {t('property:roomStyler.upgrade', 'View plans')}
                            </button>
                        </div>
                    )}

                    {/* Interior / Exterior toggle */}
                    <div className="mb-3 flex w-full rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700 sm:inline-flex sm:w-auto">
                        {(['interior', 'exterior'] as const).map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => switchMode(m)}
                                disabled={status === 'loading'}
                                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 sm:flex-none ${
                                    mode === m
                                        ? 'bg-primary text-white'
                                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                                aria-pressed={mode === m}
                            >
                                {m === 'interior'
                                    ? t('property:roomStyler.interior', 'Interior')
                                    : t('property:roomStyler.exterior', 'Exterior')}
                            </button>
                        ))}
                    </div>

                    {/* Style picker */}
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        {t('property:roomStyler.chooseStyle', 'Choose a style')}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {styleOptions.map(style => {
                            const active = style.id === selectedStyle;
                            return (
                                <button
                                    key={style.id}
                                    type="button"
                                    onClick={() => setSelectedStyle(style.id)}
                                    disabled={status === 'loading'}
                                    className={`rounded-xl border p-2.5 text-left transition-colors disabled:opacity-60 ${
                                        active
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                    }`}
                                    aria-pressed={active}
                                >
                                    <span className="block text-sm font-semibold text-neutral-900 dark:text-white">{style.label}</span>
                                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">{style.blurb}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer actions */}
                <div
                    className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-5"
                    style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <span className="text-center text-xs text-neutral-500 dark:text-neutral-400 sm:text-left">
                            {isUnlimited
                                ? t('property:roomStyler.unlimitedNote', 'Unlimited restyles on your plan')
                                : usage
                                    ? t('property:roomStyler.remainingNote', '{{remaining}} left this month', { remaining: Math.max(0, usage.remaining) })
                                    : ''}
                        </span>
                        <div className="flex items-center gap-2">
                            {status === 'done' && resultUrl && (
                                <a
                                    href={resultUrl}
                                    download={`balkanestate-${selectedStyle}.png`}
                                    className="flex-1 whitespace-nowrap rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:flex-none"
                                >
                                    {t('property:roomStyler.download', 'Download HD')}
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={generateDisabled}
                                className="flex-1 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                            >
                                {status === 'loading'
                                    ? t('property:roomStyler.generating2', 'Generating…')
                                    : status === 'done'
                                        ? t('property:roomStyler.tryAnother', 'Try another style')
                                        : t('property:roomStyler.generate', 'Generate')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomStylerModal;
