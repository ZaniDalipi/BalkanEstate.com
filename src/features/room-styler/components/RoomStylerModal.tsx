import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { XMarkIcon } from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { useAppContext } from '@/context/AppContext';
import { UsageMeter } from '@/src/shared/components/ui';
import { roomStylerKeys } from '@/src/shared/query/queryKeys';
import { restyleRoom } from '../../../../services/geminiService';
import { ROOM_STYLE_OPTIONS } from '../data/styles';
import { useRoomStylerUsage } from '../hooks/useRoomStylerUsage';
import BeforeAfterSlider from './BeforeAfterSlider';

interface RoomStylerModalProps {
    /** Full Cloudinary URL of the room photo to restyle */
    imageUrl: string;
    onClose: () => void;
}

type Status = 'idle' | 'loading' | 'done' | 'error';

const RoomStylerModal: React.FC<RoomStylerModalProps> = ({ imageUrl, onClose }) => {
    const { t } = useTranslation(['property']);
    const { state, dispatch } = useAppContext();
    const queryClient = useQueryClient();

    // Fetch the user's real quota FIRST so we only show "limit reached" when the
    // account has actually run out — subscribers/agency users see their true limit.
    const { usage, isLoading: usageLoading } = useRoomStylerUsage(state.isAuthenticated);

    const [selectedStyle, setSelectedStyle] = useState<string>(ROOM_STYLE_OPTIONS[0].id);
    const [status, setStatus] = useState<Status>('idle');
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Send a high-res version to the AI for a better result (still a Cloudinary URL).
    const sourceUrl = optimizeCloudinaryUrl(imageUrl, { width: 1600, quality: 'auto' }) || imageUrl;

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

    const selectedLabel = ROOM_STYLE_OPTIONS.find(s => s.id === selectedStyle)?.label ?? '';
    const showUpgrade = isExhausted || (status === 'error' && !!errorMsg?.toLowerCase().includes('limit'));
    const generateDisabled = status === 'loading' || isExhausted;

    return (
        <div className="fixed inset-0 z-[6100] flex items-center justify-center bg-black/80 p-3 sm:p-6" role="dialog" aria-modal="true">
            <div className="relative flex w-full max-w-3xl max-h-[92vh] flex-col overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-5">
                    <div>
                        <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white">
                            {t('property:roomStyler.title', 'Reimagine this room')}
                        </h2>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {t('property:roomStyler.subtitle', 'See this room in a different interior design style')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        aria-label={t('property:roomStyler.close', 'Close')}
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
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
                    <div className="relative mb-4 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 min-h-[220px] max-h-[46vh] overflow-hidden">
                        {status === 'done' && resultUrl ? (
                            <BeforeAfterSlider
                                beforeSrc={sourceUrl}
                                afterSrc={resultUrl}
                                beforeLabel={t('property:roomStyler.before', 'Original')}
                                afterLabel={selectedLabel}
                                className="w-full max-h-[46vh]"
                            />
                        ) : (
                            <>
                                <img
                                    src={sourceUrl}
                                    alt={t('property:roomStyler.roomPhoto', 'Room photo')}
                                    className="max-h-[46vh] w-full object-contain"
                                    crossOrigin="anonymous"
                                />
                                {status === 'loading' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                                        <p className="text-sm font-medium text-white">
                                            {t('property:roomStyler.generating', 'Restyling in {{style}}…', { style: selectedLabel })}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
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

                    {/* Style picker */}
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        {t('property:roomStyler.chooseStyle', 'Choose a style')}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {ROOM_STYLE_OPTIONS.map(style => {
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
                <div className="flex items-center justify-between gap-2 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-5">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
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
                                className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                            >
                                {t('property:roomStyler.download', 'Download HD')}
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={generateDisabled}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
    );
};

export default RoomStylerModal;
