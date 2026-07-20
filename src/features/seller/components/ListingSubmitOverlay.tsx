import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface ListingSubmitOverlayProps {
    isCompressing: boolean;
    isUploading: boolean;
    isSubmitting: boolean;
    uploadProgress: number;
}

/**
 * Full-screen overlay shown while a listing is being published.
 *
 * It blurs and dims the entire screen (rendered into `document.body` via a
 * portal so nothing behind it can leak through), locks background scrolling,
 * and floats an animated glass card with orbiting particles, spinning rings and
 * a sweeping progress bar. The copy adapts to the current phase
 * (compressing → uploading → creating).
 */
const ListingSubmitOverlay: React.FC<ListingSubmitOverlayProps> = ({
    isCompressing,
    isUploading,
    isSubmitting,
    uploadProgress,
}) => {
    const { t } = useTranslation(['seller']);

    const isVisible = isCompressing || isUploading || isSubmitting;

    // Lock body scroll while the overlay is up so the blurred page can't be
    // scrolled underneath it.
    useEffect(() => {
        if (!isVisible) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isVisible]);

    if (!isVisible) return null;

    const title = isCompressing
        ? t('seller:createListing.progress.compressing', 'Compressing images...')
        : isUploading
            ? t('seller:createListing.progress.uploading', 'Uploading to cloud...')
            : t('seller:createListing.progress.creating', 'Creating listing...');

    const hint = isCompressing
        ? t('seller:createListing.progress.compressingHint', 'Optimizing your images for the best quality...')
        : isUploading
            ? t('seller:createListing.progress.uploadingHint', 'Securely uploading your photos...')
            : t('seller:createListing.progress.creatingHint', 'Almost there! Saving your listing...');

    // Orbiting dots trailing around the spinner.
    const orbitDots = [0, 0.4, 0.8, 1.2, 1.6];
    // Rising particles floating up inside the card.
    const particles = [
        { left: '12%', delay: '0s', size: 6, color: 'rgba(59,130,246,0.7)' },
        { left: '28%', delay: '0.8s', size: 4, color: 'rgba(34,211,238,0.7)' },
        { left: '45%', delay: '1.6s', size: 8, color: 'rgba(99,102,241,0.6)' },
        { left: '62%', delay: '0.4s', size: 5, color: 'rgba(59,130,246,0.6)' },
        { left: '78%', delay: '1.2s', size: 6, color: 'rgba(34,211,238,0.6)' },
        { left: '90%', delay: '2s', size: 4, color: 'rgba(99,102,241,0.7)' },
    ];

    return createPortal(
        <div
            className="submit-overlay-backdrop fixed inset-0 z-[6000] flex items-center justify-center px-4"
            style={{ background: 'rgba(15,23,42,0.55)' }}
            role="alertdialog"
            aria-live="assertive"
            aria-busy="true"
            aria-label={title}
        >
            <div className="submit-overlay-card relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/60 bg-white/85 p-8 text-center shadow-2xl backdrop-blur-2xl sm:p-10">
                {/* Rising particles */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                    {particles.map((p, i) => (
                        <span
                            key={i}
                            className="submit-particle absolute bottom-6 rounded-full"
                            style={{
                                left: p.left,
                                width: p.size,
                                height: p.size,
                                background: p.color,
                                animationDelay: p.delay,
                            }}
                        />
                    ))}
                </div>

                {/* Animated spinner: pulsing halo + two counter-rotating rings + orbiting dots */}
                <div className="relative mx-auto mb-7 h-24 w-24" aria-hidden="true">
                    {/* Soft pulsing halo */}
                    <div
                        className="submit-pulse-halo absolute inset-0 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.35), transparent 70%)' }}
                    />
                    {/* Outer slow ring */}
                    <div className="submit-ring-spin-slow absolute inset-1 rounded-full border-2 border-dashed border-blue-300/60" />
                    {/* Inner fast gradient ring */}
                    <div className="submit-ring-spin absolute inset-3 rounded-full border-4 border-transparent border-t-blue-500 border-r-cyan-400" />

                    {/* Orbiting dots */}
                    <div className="absolute inset-0">
                        {orbitDots.map((delay, i) => (
                            <span
                                key={i}
                                className="submit-orbit-dot absolute left-1/2 top-1/2 -ml-1 -mt-1 h-2 w-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400"
                                style={{ animationDelay: `-${delay}s` }}
                            />
                        ))}
                    </div>

                    {/* Center label / icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {isUploading ? (
                            <span className="text-base font-extrabold text-blue-600">{Math.round(uploadProgress)}%</span>
                        ) : (
                            <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                {isCompressing ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                                )}
                            </svg>
                        )}
                    </div>
                </div>

                {/* Status text */}
                <h3 className="mb-2 text-lg font-bold text-gray-900">{title}</h3>
                <p className="mb-6 text-sm text-gray-500">{hint}</p>

                {/* Progress bar */}
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-200/80">
                    {isUploading ? (
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 transition-all duration-500 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    ) : (
                        <>
                            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 animate-pulse" />
                            {/* Sweeping shimmer for a livelier "working" feel */}
                            <div
                                className="submit-bar-sweep absolute inset-y-0 left-0 w-1/3"
                                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)' }}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default ListingSubmitOverlay;
