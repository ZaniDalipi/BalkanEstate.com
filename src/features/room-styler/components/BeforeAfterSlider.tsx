import React, { useState, useRef, useCallback, useEffect } from 'react';

interface BeforeAfterSliderProps {
    /** Original image URL (shown on the left / "before") */
    beforeSrc: string;
    /** Restyled image URL or data URL (shown on the right / "after") */
    afterSrc: string;
    beforeLabel?: string;
    afterLabel?: string;
    className?: string;
}

/**
 * A draggable before/after image comparison slider.
 * The "after" image is revealed by dragging the handle; supports pointer + touch.
 * Self-contained — no external dependencies.
 */
const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
    beforeSrc,
    afterSrc,
    beforeLabel = 'Original',
    afterLabel = 'Restyled',
    className = '',
}) => {
    const [position, setPosition] = useState(50); // percent 0-100
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);

    const updateFromClientX = useCallback((clientX: number) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const pct = ((clientX - rect.left) / rect.width) * 100;
        setPosition(Math.max(0, Math.min(100, pct)));
    }, []);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        isDraggingRef.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        updateFromClientX(e.clientX);
    }, [updateFromClientX]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        updateFromClientX(e.clientX);
    }, [updateFromClientX]);

    const onPointerUp = useCallback(() => {
        isDraggingRef.current = false;
    }, []);

    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') setPosition(p => Math.max(0, p - 4));
        else if (e.key === 'ArrowRight') setPosition(p => Math.min(100, p + 4));
    }, []);

    // Reset to centre when the images change.
    useEffect(() => { setPosition(50); }, [beforeSrc, afterSrc]);

    return (
        <div
            ref={containerRef}
            className={`relative select-none overflow-hidden rounded-xl touch-none bg-neutral-900 ${className}`}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
        >
            {/* After (base layer, full) */}
            <img
                src={afterSrc}
                alt={afterLabel}
                className="block w-full h-full object-contain pointer-events-none"
                draggable={false}
            />
            <span className="absolute top-2 right-2 z-10 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white pointer-events-none">
                {afterLabel}
            </span>

            {/* Before (clipped overlay) */}
            <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            >
                <img
                    src={beforeSrc}
                    alt={beforeLabel}
                    className="block w-full h-full object-contain"
                    draggable={false}
                    crossOrigin="anonymous"
                />
                <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                    {beforeLabel}
                </span>
            </div>

            {/* Handle */}
            <div
                className="absolute inset-y-0 z-20 flex items-center justify-center cursor-ew-resize"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                onPointerDown={onPointerDown}
                role="slider"
                aria-label="Comparison slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(position)}
                tabIndex={0}
                onKeyDown={onKeyDown}
            >
                <div className="absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg">
                    <svg className="h-5 w-5 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default BeforeAfterSlider;
