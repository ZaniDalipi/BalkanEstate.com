import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { FloorplanSpot } from '@/types';
import { normalizeAngle } from '@/shared/utils/validation';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { ArrowUturnLeftIcon, ArrowUturnRightIcon, TrashIcon, XMarkIcon, CheckIcon } from '@/constants';
import PhotoSpotMarker, { PHOTO_SPOT_SIZE } from '@/src/components/property/PhotoSpotMarker';

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
/** Breathing room kept around the plan inside its stage, in pixels. */
const STAGE_PADDING = 16;

/**
 * Cloudinary-optimised URL for a photo. Freshly picked photos are blob:
 * previews, which the optimiser rejects — those are shown as they are.
 */
const photoSrc = (url: string, width: number) => optimizeCloudinaryUrl(url, { width, quality: 'auto' }) || url;

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

    // Keep the selected photo visible in its list — scrolling only the list,
    // never the page behind the editor.
    useEffect(() => {
        const list = listRef.current;
        const el = list?.children[selected] as HTMLElement | undefined;
        if (!list || !el) return;
        if (list.scrollWidth > list.clientWidth) {
            list.scrollTo({ left: el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
        } else if (el.offsetTop < list.scrollTop || el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
            list.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
        }
    }, [selected]);

    // The plan is sized to fit whatever space its stage has, so the whole
    // editor always fits the screen with nothing to scroll.
    const stageRef = useRef<HTMLDivElement>(null);
    const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
    const [planNatural, setPlanNatural] = useState({ width: 0, height: 0 });
    useLayoutEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const measure = () => setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(stage);
        return () => observer.disconnect();
    }, []);
    const planScale = planNatural.width && stageSize.width
        ? Math.min(
            (stageSize.width - STAGE_PADDING * 2) / planNatural.width,
            (stageSize.height - STAGE_PADDING * 2) / planNatural.height,
        )
        : 0;
    const planBox = planScale > 0
        ? { width: Math.floor(planNatural.width * planScale), height: Math.floor(planNatural.height * planScale) }
        : null;

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

    const statusText = selectedSpot
        ? t('seller:createListing.photoSpots.placedHint', 'Drag the camera to move it, or the handle to turn it.')
        : t('seller:createListing.photoSpots.placeHint', 'Tap the plan where this photo was taken, then drag to aim.');

    const iconButton = 'w-9 h-9 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors';

    return createPortal(
        <div
            className="fixed inset-0 z-[6000] h-[100dvh] bg-neutral-950 text-white flex flex-col overflow-hidden overscroll-none"
            style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-spots-title"
        >
            {/* Header */}
            <header className="flex-shrink-0 flex items-center gap-3 h-14 px-3 sm:px-5 border-b border-white/10">
                <button type="button" onClick={onClose} className={iconButton} aria-label={t('common:cancel', 'Cancel')}>
                    <XMarkIcon className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h2 id="photo-spots-title" className="text-sm sm:text-base font-semibold truncate">
                        {t('seller:createListing.photoSpots.title', 'Place photos on the floor plan')}
                    </h2>
                    <p className="hidden lg:block text-xs text-white/50 truncate">
                        {t('seller:createListing.photoSpots.instructions', 'Pick a photo, tap where it was taken and drag towards what it shows. Drag a camera to move it, or its handle to turn it.')}
                    </p>
                </div>
                <span className="hidden sm:inline-flex items-center h-7 px-2.5 rounded-full bg-white/10 text-xs text-white/80 tabular-nums">
                    {t('seller:createListing.photoSpots.progress', '{{placed}} of {{total}} placed', { placed: placedCount, total: photos.length })}
                </span>
                <button
                    type="button"
                    onClick={() => { onSave(spots); onClose(); }}
                    className="h-9 px-4 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 transition-colors"
                >
                    {t('common:save', 'Save')}
                </button>
            </header>

            <div className="flex-1 min-h-0 flex flex-col md:flex-row">
                {/* Plan stage — the plan is sized to fit it exactly */}
                <div ref={stageRef} className="relative flex-1 min-h-0 min-w-0 flex items-center justify-center overflow-hidden bg-neutral-900">
                    <img
                        src={photoSrc(floorplanUrl, 2400)}
                        alt=""
                        className="hidden"
                        onLoad={(e) => setPlanNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                    />
                    {planBox && (
                        <div
                            ref={planRef}
                            className="relative cursor-crosshair select-none bg-white rounded-md shadow-2xl ring-1 ring-white/10"
                            style={{ width: planBox.width, height: planBox.height, touchAction: 'none' }}
                            onPointerDown={handlePlanPointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                        >
                            <img
                                src={photoSrc(floorplanUrl, 2400)}
                                alt={t('seller:createListing.photoSpots.planAlt', 'Floor plan')}
                                className="block w-full h-full rounded-md pointer-events-none"
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
                    )}
                </div>

                {/* Photo panel: side column on desktop, bottom bar on phones */}
                <aside className="flex-shrink-0 flex flex-col min-h-0 md:w-[320px] lg:w-[360px] border-t md:border-t-0 md:border-l border-white/10 bg-neutral-950">
                    {/* Selected photo + actions */}
                    <div className="flex md:flex-col gap-3 p-3 md:p-4">
                        <img
                            src={photoSrc(photos[selected]?.url ?? '', 800)}
                            alt={t('seller:createListing.photoSpots.photoN', 'Photo {{n}}', { n: selected + 1 })}
                            className="w-24 h-[72px] md:w-full md:h-auto md:aspect-[4/3] md:max-h-[34vh] object-cover md:object-contain rounded-lg bg-neutral-800 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1 flex flex-col justify-between gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold whitespace-nowrap">
                                    {t('seller:createListing.photoSpots.photoN', 'Photo {{n}}', { n: selected + 1 })}
                                </span>
                                <span className={`inline-flex items-center gap-1 h-5 px-2 rounded-full text-[11px] font-medium whitespace-nowrap ${selectedSpot ? 'bg-blue-600/20 text-blue-300' : 'bg-white/10 text-white/60'}`}>
                                    {selectedSpot && <CheckIcon className="w-3 h-3" />}
                                    {selectedSpot
                                        ? t('seller:createListing.photoSpots.placed', 'On the plan')
                                        : t('seller:createListing.photoSpots.notPlaced', 'Not placed yet')}
                                </span>
                            </div>
                            <p className="text-xs text-white/55 leading-snug line-clamp-2">{statusText}</p>
                            <div className="flex items-center gap-1 -ml-1.5">
                                <button type="button" disabled={!selectedSpot} onClick={() => rotate(-45)} className={iconButton}
                                    aria-label={t('seller:createListing.photoSpots.turnLeft', 'Turn left')} title={t('seller:createListing.photoSpots.turnLeft', 'Turn left')}>
                                    <ArrowUturnLeftIcon className="w-4 h-4" />
                                </button>
                                <button type="button" disabled={!selectedSpot} onClick={() => rotate(45)} className={iconButton}
                                    aria-label={t('seller:createListing.photoSpots.turnRight', 'Turn right')} title={t('seller:createListing.photoSpots.turnRight', 'Turn right')}>
                                    <ArrowUturnRightIcon className="w-4 h-4" />
                                </button>
                                <button type="button" disabled={!selectedSpot} onClick={() => removeSpot(selected)}
                                    className={`${iconButton} !text-red-300 hover:!bg-red-500/15`}
                                    aria-label={t('seller:createListing.photoSpots.remove', 'Remove')} title={t('seller:createListing.photoSpots.remove', 'Remove')}>
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* All photos: a strip on phones, a grid on desktop */}
                    <div
                        ref={listRef}
                        className="flex md:grid md:grid-cols-3 md:content-start gap-2 px-3 pb-3 md:px-4 md:pb-4 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto md:flex-1 min-h-0 overscroll-contain [scrollbar-width:thin]"
                    >
                        {photos.map((photo, i) => (
                            <button
                                key={photo.url}
                                type="button"
                                onClick={() => setSelected(i)}
                                className={`relative flex-shrink-0 w-16 h-12 md:w-auto md:h-auto md:aspect-[4/3] rounded-md overflow-hidden ring-2 transition-all ${i === selected ? 'ring-blue-500' : 'ring-transparent opacity-70 hover:opacity-100'}`}
                                aria-label={t('seller:createListing.photoSpots.photoN', 'Photo {{n}}', { n: i + 1 })}
                                aria-current={i === selected}
                            >
                                <img src={photoSrc(photo.url, 240)} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
                                <span className={`absolute bottom-1 left-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] leading-[18px] font-bold text-center flex items-center justify-center ${spots[i] ? 'bg-blue-600 text-white' : 'bg-black/70 text-white/80'}`}>
                                    {spots[i] ? <CheckIcon className="w-3 h-3" /> : i + 1}
                                </span>
                            </button>
                        ))}
                    </div>
                </aside>
            </div>
        </div>,
        document.body
    );
};

export default FloorPlanPhotoPlacer;
