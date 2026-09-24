import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FloorplanSpot } from '@/types';
import PhotoSpotMarker, { PHOTO_SPOT_SIZE, normalizeAngle } from '@/src/components/property/PhotoSpotMarker';

interface PlacerPhoto {
    url: string;
    tag?: string;
    floorplanSpot?: FloorplanSpot;
}

interface FloorPlanPhotoPlacerProps {
    floorplanUrl: string;
    photos: PlacerPhoto[];
    /** Index-aligned with photos; undefined = not on the plan. */
    onSave: (spots: (FloorplanSpot | undefined)[]) => void;
    onClose: () => void;
}

/** Distance of the aim handle from the camera, in screen pixels. */
const HANDLE_DISTANCE = 44;

type Drag =
    | { kind: 'aim'; index: number; pointerId: number; fresh: boolean }
    | { kind: 'move'; index: number; pointerId: number; moved: boolean };

/**
 * Lets a seller mark where each listing photo was taken on the floor plan and
 * which way the camera faced. Buyers then see those cameras on the plan, kept
 * in sync with the photos (FloorPlanViewerModal, PropertyGallery).
 *
 * Tap the plan to place the selected photo and drag to aim it; drag a camera
 * to move it; drag the round handle to turn it.
 */
const FloorPlanPhotoPlacer: React.FC<FloorPlanPhotoPlacerProps> = ({ floorplanUrl, photos, onSave, onClose }) => {
    const { t } = useTranslation(['seller', 'common']);
    const [spots, setSpots] = useState<(FloorplanSpot | undefined)[]>(() => photos.map(p => p.floorplanSpot));
    const [selected, setSelected] = useState(() => {
        const firstUnplaced = photos.findIndex(p => !p.floorplanSpot);
        return firstUnplaced >= 0 ? firstUnplaced : 0;
    });
    const planRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<Drag | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const placedCount = spots.filter(Boolean).length;
    const selectedSpot = spots[selected];

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Keep the selected photo visible in the list.
    useEffect(() => {
        const el = listRef.current?.children[selected] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }, [selected]);

    const updateSpot = useCallback((index: number, patch: Partial<FloorplanSpot>) => {
        setSpots(prev => {
            const next = [...prev];
            const current = next[index] ?? { x: 50, y: 50, angle: 0 };
            next[index] = { ...current, ...patch };
            return next;
        });
    }, []);

    /** Pointer position as plan percentages, clamped to the plan. */
    const toPlan = (clientX: number, clientY: number) => {
        const rect = planRef.current!.getBoundingClientRect();
        return {
            x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
            y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)),
        };
    };

    /** Angle from a spot to the pointer, clockwise from up; null if too close to tell. */
    const angleTo = (spot: FloorplanSpot, clientX: number, clientY: number) => {
        const rect = planRef.current!.getBoundingClientRect();
        const dx = clientX - (rect.left + (spot.x / 100) * rect.width);
        const dy = clientY - (rect.top + (spot.y / 100) * rect.height);
        if (Math.hypot(dx, dy) < 12) return null;
        return normalizeAngle((Math.atan2(dx, -dy) * 180) / Math.PI);
    };

    const nextUnplaced = (after: number, list: (FloorplanSpot | undefined)[]) => {
        for (let k = 1; k <= list.length; k++) {
            const i = (after + k) % list.length;
            if (!list[i]) return i;
        }
        return -1;
    };

    // Tap on the plan: place the selected photo here, then drag to aim.
    const handlePlanPointerDown = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        const { x, y } = toPlan(e.clientX, e.clientY);
        updateSpot(selected, { x, y, angle: spots[selected]?.angle ?? 0 });
        planRef.current?.setPointerCapture(e.pointerId);
        dragRef.current = { kind: 'aim', index: selected, pointerId: e.pointerId, fresh: !spots[selected] };
    };

    const startMove = (e: React.PointerEvent, index: number) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        setSelected(index);
        planRef.current?.setPointerCapture(e.pointerId);
        dragRef.current = { kind: 'move', index, pointerId: e.pointerId, moved: false };
    };

    const startAim = (e: React.PointerEvent, index: number) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        planRef.current?.setPointerCapture(e.pointerId);
        dragRef.current = { kind: 'aim', index, pointerId: e.pointerId, fresh: false };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;
        if (drag.kind === 'move') {
            drag.moved = true;
            updateSpot(drag.index, toPlan(e.clientX, e.clientY));
        } else {
            const spot = spots[drag.index];
            if (!spot) return;
            const angle = angleTo(spot, e.clientX, e.clientY);
            if (angle !== null) updateSpot(drag.index, { angle });
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;
        dragRef.current = null;
        if (planRef.current?.hasPointerCapture(e.pointerId)) planRef.current.releasePointerCapture(e.pointerId);
        // A freshly placed photo hands over to the next one still to place.
        if (drag.kind === 'aim' && drag.fresh) {
            const next = nextUnplaced(drag.index, spots);
            if (next >= 0) setSelected(next);
        }
    };

    const removeSpot = (index: number) => {
        setSpots(prev => {
            const next = [...prev];
            next[index] = undefined;
            return next;
        });
    };

    const rotate = (delta: number) => {
        if (!selectedSpot) return;
        updateSpot(selected, { angle: normalizeAngle(selectedSpot.angle + delta) });
    };

    const handle = selectedSpot
        ? {
            dx: Math.sin((selectedSpot.angle * Math.PI) / 180) * HANDLE_DISTANCE,
            dy: -Math.cos((selectedSpot.angle * Math.PI) / 180) * HANDLE_DISTANCE,
        }
        : null;

    return (
        <div
            className="fixed inset-0 z-[6000] bg-neutral-950/95 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={t('seller:createListing.photoSpots.title', 'Place photos on the floor plan')}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
                <div className="min-w-0">
                    <h2 className="text-white font-semibold text-sm sm:text-base">
                        {t('seller:createListing.photoSpots.title', 'Place photos on the floor plan')}
                    </h2>
                    <p className="text-white/60 text-xs mt-0.5 hidden sm:block">
                        {t('seller:createListing.photoSpots.instructions', 'Pick a photo, tap where it was taken and drag towards what it shows. Drag a camera to move it, or its handle to turn it.')}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-white/60 text-xs hidden sm:inline">
                        {t('seller:createListing.photoSpots.progress', '{{placed}} of {{total}} placed', { placed: placedCount, total: photos.length })}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        {t('common:cancel', 'Cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={() => { onSave(spots); onClose(); }}
                        className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                        {t('common:save', 'Save')}
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col md:flex-row">
                {/* Plan */}
                <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <div
                        ref={planRef}
                        className="relative inline-block cursor-crosshair select-none bg-white rounded shadow-2xl"
                        style={{ touchAction: 'none' }}
                        onPointerDown={handlePlanPointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    >
                        <img
                            src={floorplanUrl}
                            alt={t('seller:createListing.photoSpots.planAlt', 'Floor plan')}
                            className="block max-w-full w-auto h-auto rounded pointer-events-none"
                            style={{ maxHeight: 'calc(100vh - 11rem)' }}
                            draggable={false}
                        />

                        {spots.map((spot, i) => spot && (
                            <div
                                key={photos[i].url}
                                className="absolute"
                                style={{ left: `${spot.x}%`, top: `${spot.y}%`, zIndex: i === selected ? 10 : 5 }}
                            >
                                <span
                                    className="absolute pointer-events-none"
                                    style={{
                                        width: PHOTO_SPOT_SIZE,
                                        height: PHOTO_SPOT_SIZE,
                                        left: -PHOTO_SPOT_SIZE / 2,
                                        top: -PHOTO_SPOT_SIZE / 2,
                                    }}
                                >
                                    <PhotoSpotMarker angle={spot.angle} active={i === selected} label={i + 1} />
                                </span>
                                {/* Drag target: the camera dot */}
                                <button
                                    type="button"
                                    className="absolute w-8 h-8 -left-4 -top-4 rounded-full cursor-move focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                    style={{ touchAction: 'none' }}
                                    onPointerDown={(e) => startMove(e, i)}
                                    aria-label={t('seller:createListing.photoSpots.moveCamera', 'Move camera for photo {{n}}', { n: i + 1 })}
                                />
                            </div>
                        ))}

                        {/* Aim handle for the selected camera */}
                        {selectedSpot && handle && (
                            <button
                                type="button"
                                className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-white border-2 border-blue-600 shadow-md cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                style={{
                                    left: `calc(${selectedSpot.x}% + ${handle.dx}px)`,
                                    top: `calc(${selectedSpot.y}% + ${handle.dy}px)`,
                                    zIndex: 11,
                                    touchAction: 'none',
                                }}
                                onPointerDown={(e) => startAim(e, selected)}
                                aria-label={t('seller:createListing.photoSpots.turnCamera', 'Turn camera')}
                            />
                        )}
                    </div>
                </div>

                {/* Photos */}
                <aside className="flex-shrink-0 md:w-80 border-t md:border-t-0 md:border-l border-white/10 flex flex-col min-h-0 max-h-[42%] md:max-h-none">
                    <div className="p-3 border-b border-white/10 flex gap-3 items-center">
                        <img
                            src={photos[selected]?.url}
                            alt=""
                            className="w-28 h-20 md:w-full md:h-44 object-cover rounded-lg bg-neutral-800 flex-shrink-0"
                        />
                        <div className="md:hidden min-w-0 text-white/70 text-xs">
                            {selectedSpot
                                ? t('seller:createListing.photoSpots.placedHint', 'Drag the camera to move it, or the handle to turn it.')
                                : t('seller:createListing.photoSpots.placeHint', 'Tap the plan where this photo was taken, then drag to aim.')}
                        </div>
                    </div>
                    <div className="px-3 py-2 flex items-center gap-2 border-b border-white/10">
                        <span className="text-white text-xs font-semibold">
                            {t('seller:createListing.photoSpots.photoN', 'Photo {{n}}', { n: selected + 1 })}
                        </span>
                        <span className="hidden md:inline text-white/50 text-xs truncate">
                            {selectedSpot
                                ? t('seller:createListing.photoSpots.placed', 'On the plan')
                                : t('seller:createListing.photoSpots.notPlaced', 'Tap the plan to place it')}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                            <button
                                type="button"
                                disabled={!selectedSpot}
                                onClick={() => rotate(-45)}
                                className="w-8 h-8 rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                                aria-label={t('seller:createListing.photoSpots.turnLeft', 'Turn left')}
                            >⟲</button>
                            <button
                                type="button"
                                disabled={!selectedSpot}
                                onClick={() => rotate(45)}
                                className="w-8 h-8 rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                                aria-label={t('seller:createListing.photoSpots.turnRight', 'Turn right')}
                            >⟳</button>
                            <button
                                type="button"
                                disabled={!selectedSpot}
                                onClick={() => removeSpot(selected)}
                                className="px-2 h-8 rounded-lg text-xs text-red-300 hover:bg-red-500/15 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                {t('seller:createListing.photoSpots.remove', 'Remove')}
                            </button>
                        </div>
                    </div>
                    <div ref={listRef} className="flex md:grid md:grid-cols-3 gap-2 p-3 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden min-h-0">
                        {photos.map((photo, i) => (
                            <button
                                key={photo.url}
                                type="button"
                                onClick={() => setSelected(i)}
                                className={`relative flex-shrink-0 w-20 h-16 md:w-auto md:h-20 rounded-md overflow-hidden border-2 transition-all ${i === selected ? 'border-blue-500' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                aria-label={t('seller:createListing.photoSpots.photoN', 'Photo {{n}}', { n: i + 1 })}
                                aria-current={i === selected}
                            >
                                <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                <span className={`absolute bottom-0.5 left-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] leading-[18px] font-bold text-center ${spots[i] ? 'bg-blue-600 text-white' : 'bg-black/70 text-white/80'}`}>
                                    {spots[i] ? '✓' : i + 1}
                                </span>
                            </button>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default FloorPlanPhotoPlacer;
