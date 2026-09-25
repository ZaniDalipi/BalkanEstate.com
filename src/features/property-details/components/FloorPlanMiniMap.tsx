import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PropertyImage } from '@/types';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { ArrowTopRightOnSquareIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from '@/constants';
import { PhotoSpotSquare } from '@/src/components/property/PhotoSpotMarker';
import { spotFloor } from '@/shared/utils/floorplans';

interface FloorPlanMiniMapProps {
    planUrl: string;
    /** Card title, e.g. "Floor 1". */
    label: string;
    /** Which floor this card shows; only that floor's photos get squares. */
    floor: number;
    photos: PropertyImage[];
    activeIndex: number;
    onSelect: (index: number) => void;
    /** Open the plan full size (the Floor Plan tab). */
    onExpand: () => void;
}

const MAX_ZOOM = 4;
const ZOOM_EASE = '0.35s cubic-bezier(0.22, 1, 0.36, 1)';
/** Movement (px) before a press on the plan becomes a drag rather than a tap. */
const DRAG_SLOP = 5;

interface View { z: number; x: number; y: number }

/**
 * The floor plan card beside the photo in the Photos tab (Zillow style):
 * a green square for every placed photo, the one on screen in red with its
 * view cone, and a zoom slider. Tapping a square jumps to that photo.
 *
 * Zoomed in, the plan moves freely: drag (finger or mouse), pinch or
 * trackpad-pinch to zoom about the fingers, double-tap to toggle zoom. Like
 * the big viewer, the view lives in a ref and is written to the DOM once per
 * frame; React state only drives the slider. The plan is fitted into the card
 * with container query units, so the sidebar never scrolls.
 */
const FloorPlanMiniMap: React.FC<FloorPlanMiniMapProps> = ({ planUrl, label, floor, photos, activeIndex, onSelect, onExpand }) => {
    const { t } = useTranslation(['property']);
    const [ratio, setRatio] = useState(4 / 3);
    const [zoom, setZoomState] = useState(1);
    const activeSpot = photos[activeIndex]?.floorplanSpot;
    const active = activeSpot && spotFloor(activeSpot) === floor ? activeSpot : undefined;

    const boxRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<View>({ z: 1, x: 0, y: 0 });
    const frameRef = useRef<number | null>(null);
    const animateRef = useRef(false);

    const write = useCallback(() => {
        const el = contentRef.current;
        if (!el) return;
        const { z, x, y } = viewRef.current;
        el.style.transition = animateRef.current ? `transform ${ZOOM_EASE}` : 'none';
        el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${z})`;
        // Squares keep their screen size (and glide in step with the plan).
        el.style.setProperty('--mini-inv', String(1 / z));
        el.style.setProperty('--mini-ease', animateRef.current ? `transform ${ZOOM_EASE}` : 'none');
    }, []);

    /** Clamp to the card (the plan can't be dragged off it) and schedule a write. */
    const setView = useCallback((next: View, animate = false) => {
        const box = boxRef.current;
        const w = box?.clientWidth ?? 0;
        const h = box?.clientHeight ?? 0;
        const z = Math.min(MAX_ZOOM, Math.max(1, next.z));
        viewRef.current = {
            z,
            x: Math.min(0, Math.max(w - w * z, next.x)),
            y: Math.min(0, Math.max(h - h * z, next.y)),
        };
        animateRef.current = animate;
        setZoomState(prev => (Math.abs(prev - z) < 0.001 ? prev : z));
        if (frameRef.current === null) {
            frameRef.current = requestAnimationFrame(() => {
                frameRef.current = null;
                write();
            });
        }
    }, [write]);

    useEffect(() => () => {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    }, []);

    /** Zoom so the point (px inside the card) stays put under the finger/cursor. */
    const zoomAbout = useCallback((z: number, px: number, py: number, animate = false) => {
        const v = viewRef.current;
        const nz = Math.min(MAX_ZOOM, Math.max(1, z));
        const k = nz / v.z;
        setView({ z: nz, x: px - (px - v.x) * k, y: py - (py - v.y) * k }, animate);
    }, [setView]);

    /** Where the photo on screen sits in the card right now (or its centre). */
    const focusPoint = useCallback(() => {
        const box = boxRef.current;
        const w = box?.clientWidth ?? 0;
        const h = box?.clientHeight ?? 0;
        if (!active) return { x: w / 2, y: h / 2 };
        const v = viewRef.current;
        const sx = v.x + (active.x / 100) * w * v.z;
        const sy = v.y + (active.y / 100) * h * v.z;
        const inside = sx >= 0 && sx <= w && sy >= 0 && sy <= h;
        return inside ? { x: sx, y: sy } : { x: w / 2, y: h / 2 };
    }, [active]);

    // A new photo: if zoomed in, glide so its square is in view.
    useEffect(() => {
        const v = viewRef.current;
        const box = boxRef.current;
        if (!active || !box || v.z <= 1.001) return;
        const w = box.clientWidth;
        const h = box.clientHeight;
        const sx = v.x + (active.x / 100) * w * v.z;
        const sy = v.y + (active.y / 100) * h * v.z;
        const margin = 24;
        if (sx >= margin && sx <= w - margin && sy >= margin && sy <= h - margin) return;
        setView({ z: v.z, x: w / 2 - (active.x / 100) * w * v.z, y: h / 2 - (active.y / 100) * h * v.z }, true);
    }, [active, setView]);

    // The card changing size (rotation, window resize) re-clamps the view.
    useLayoutEffect(() => {
        const box = boxRef.current;
        if (!box) return;
        const observer = new ResizeObserver(() => setView(viewRef.current));
        observer.observe(box);
        return () => observer.disconnect();
    }, [setView, ratio]);

    // ── Gestures on the plan ────────────────────────────────────────────────
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const gesture = useRef<{ start: View; mid: { x: number; y: number }; dist: number; dragging: boolean; left: number; top: number } | null>(null);
    const suppressClick = useRef(false);
    const lastTap = useRef(0);

    const begin = () => {
        const box = boxRef.current;
        const pts = Array.from(pointers.current.values());
        if (!box || pts.length === 0) { gesture.current = null; return; }
        const r = box.getBoundingClientRect();
        const [a, b] = pts;
        gesture.current = {
            start: { ...viewRef.current },
            mid: b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : { x: a.x, y: a.y },
            dist: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
            dragging: !!b,
            left: r.left,
            top: r.top,
        };
    };

    const onPointerDown = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        suppressClick.current = false;
        begin();
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const g = gesture.current;
        if (!g) return;
        const [a, b] = Array.from(pointers.current.values());
        const mid = b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a;
        if (!g.dragging) {
            // Nothing to move at 1× — leave taps (and the squares) alone.
            if (viewRef.current.z <= 1.001 || Math.hypot(mid.x - g.mid.x, mid.y - g.mid.y) < DRAG_SLOP) return;
            g.dragging = true;
            // Capture only once it is a real drag, so a tap still reaches its square.
            boxRef.current?.setPointerCapture(e.pointerId);
        }
        suppressClick.current = true;
        const z = b && g.dist > 0 ? g.start.z * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist) : g.start.z;
        const k = Math.min(MAX_ZOOM, Math.max(1, z)) / g.start.z;
        const sx = g.mid.x - g.left;
        const sy = g.mid.y - g.top;
        setView({
            z: g.start.z * k,
            x: (mid.x - g.left) - (sx - g.start.x) * k,
            y: (mid.y - g.top) - (sy - g.start.y) * k,
        });
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (!pointers.current.delete(e.pointerId)) return;
        if (boxRef.current?.hasPointerCapture(e.pointerId)) boxRef.current.releasePointerCapture(e.pointerId);
        const wasTap = !gesture.current?.dragging && pointers.current.size === 0;
        if (pointers.current.size > 0) begin();
        else gesture.current = null;
        // Two taps (not drags or pinches) in quick succession toggle a
        // close-up at that point.
        if (!wasTap) { lastTap.current = 0; return; }
        const now = Date.now();
        if (now - lastTap.current < 300) {
            lastTap.current = 0;
            const r = boxRef.current!.getBoundingClientRect();
            if (viewRef.current.z > 1.5) setView({ z: 1, x: 0, y: 0 }, true);
            else zoomAbout(2.5, e.clientX - r.left, e.clientY - r.top, true);
        } else {
            lastTap.current = now;
        }
    };

    // Trackpad pinch (ctrl + wheel) zooms about the cursor. A plain wheel is
    // left alone so it can still scroll the sidebar.
    useEffect(() => {
        const box = boxRef.current;
        if (!box) return;
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            const r = box.getBoundingClientRect();
            zoomAbout(viewRef.current.z * Math.exp(-Math.max(-50, Math.min(50, e.deltaY)) * 0.01), e.clientX - r.left, e.clientY - r.top);
        };
        box.addEventListener('wheel', onWheel, { passive: false });
        return () => box.removeEventListener('wheel', onWheel);
    }, [zoomAbout]);

    // ── Slider ──────────────────────────────────────────────────────────────
    // A drawn slider rather than <input type="range">: iOS Safari ignores the
    // track height on a styled range input and paints it as a tall pill.
    const trackRef = useRef<HTMLDivElement>(null);
    const [sliding, setSliding] = useState(false);
    const zoomFromTrack = (clientX: number) => {
        const r = trackRef.current!.getBoundingClientRect();
        const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
        const p = focusPoint();
        zoomAbout(1 + f * (MAX_ZOOM - 1), p.x, p.y);
    };
    const step = (delta: number) => {
        const p = focusPoint();
        zoomAbout(Math.round((viewRef.current.z + delta) * 2) / 2, p.x, p.y, true);
    };
    const pct = ((zoom - 1) / (MAX_ZOOM - 1)) * 100;

    return (
        <section className="flex flex-col min-h-0 flex-1 rounded-lg bg-[#3b3f46] overflow-hidden">
            <header className="flex items-center justify-between px-3 md:px-4 pt-2 md:pt-3 pb-1.5 md:pb-2 flex-shrink-0">
                <h3 className="text-sm font-semibold text-white truncate">{label}</h3>
                <button
                    type="button"
                    onClick={onExpand}
                    className="p-1 -mr-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label={t('property:floorPlan.viewer.openFloorPlan', 'Open floor plan')}
                    title={t('property:floorPlan.viewer.openFloorPlan', 'Open floor plan')}
                >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </button>
            </header>

            {/* Plan, fitted to the card with container query units */}
            <div className="relative flex-1 min-h-[120px] px-2 pb-2 md:px-3 md:pb-3" style={{ containerType: 'size' }}>
                <div
                    ref={boxRef}
                    className={`relative mx-auto overflow-hidden rounded-md bg-white shadow-inner select-none ${zoom > 1.001 ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    style={{ width: `min(100cqw, 100cqh * ${ratio})`, aspectRatio: String(ratio), touchAction: 'none' }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onClickCapture={(e) => {
                        // The click that ends a drag must not select a square.
                        if (suppressClick.current) { e.stopPropagation(); e.preventDefault(); suppressClick.current = false; }
                    }}
                >
                    {/* transform is written directly by write() */}
                    <div ref={contentRef} className="absolute inset-0" style={{ transformOrigin: '0 0', willChange: 'transform' }}>
                        <img
                            src={optimizeCloudinaryUrl(planUrl, { width: 1200, quality: 'auto' }) || planUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                            draggable={false}
                            onLoad={(e) => {
                                const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                                if (w && h) setRatio(w / h);
                            }}
                        />
                        {photos.map((photo, i) => {
                            const spot = photo.floorplanSpot;
                            if (!spot || spotFloor(spot) !== floor) return null;
                            const isActive = i === activeIndex;
                            return (
                                <button
                                    key={photo.url}
                                    type="button"
                                    onClick={() => onSelect(i)}
                                    className="absolute w-6 h-6 -ml-3 -mt-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm"
                                    style={{
                                        left: `${spot.x}%`,
                                        top: `${spot.y}%`,
                                        transform: 'scale(var(--mini-inv, 1))',
                                        transition: 'var(--mini-ease, none)',
                                        zIndex: isActive ? 2 : 1,
                                    }}
                                    aria-label={t('property:floorPlan.viewer.showPhoto', 'Show photo {{n}}', { n: i + 1 })}
                                    aria-pressed={isActive}
                                >
                                    <span className="absolute left-1/2 top-1/2 pointer-events-none">
                                        <PhotoSpotSquare angle={spot.angle} active={isActive} size={isActive ? 13 : 11} coneLength={46} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Zoom */}
            <div className="flex-shrink-0 flex items-center justify-center gap-2 h-11 px-3 bg-black/80 text-white">
                <button
                    type="button"
                    onClick={() => step(-0.5)}
                    disabled={zoom <= 1.001}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 transition"
                    aria-label={t('property:floorPlan.viewer.zoomOut', 'Zoom out')}
                >
                    <MagnifyingGlassMinusIcon className="w-4 h-4" />
                </button>
                <div
                    ref={trackRef}
                    role="slider"
                    tabIndex={0}
                    aria-label={t('property:floorPlan.viewer.zoomLevel', 'Zoom level')}
                    aria-valuemin={1}
                    aria-valuemax={MAX_ZOOM}
                    aria-valuenow={Math.round(zoom * 10) / 10}
                    aria-valuetext={`${Math.round(zoom * 100)}%`}
                    className="relative flex-1 max-w-[200px] h-8 flex items-center cursor-pointer touch-none select-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setSliding(true);
                        zoomFromTrack(e.clientX);
                    }}
                    onPointerMove={(e) => { if (sliding) zoomFromTrack(e.clientX); }}
                    onPointerUp={() => setSliding(false)}
                    onPointerCancel={() => setSliding(false)}
                    onKeyDown={(e) => {
                        const p = focusPoint();
                        const keys: Record<string, number> = { ArrowRight: 0.25, ArrowUp: 0.25, ArrowLeft: -0.25, ArrowDown: -0.25 };
                        if (e.key in keys) { e.preventDefault(); zoomAbout(viewRef.current.z + keys[e.key], p.x, p.y, true); }
                        else if (e.key === 'Home') { e.preventDefault(); setView({ z: 1, x: 0, y: 0 }, true); }
                        else if (e.key === 'End') { e.preventDefault(); zoomAbout(MAX_ZOOM, p.x, p.y, true); }
                    }}
                >
                    <span className="absolute inset-x-0 h-1.5 rounded-full bg-white/25 overflow-hidden" aria-hidden="true">
                        <span className="block h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                    </span>
                    <span
                        className={`absolute w-5 h-5 -ml-2.5 rounded-full bg-white shadow-md transition-transform ${sliding ? 'scale-110' : ''}`}
                        style={{ left: `${pct}%` }}
                        aria-hidden="true"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => step(0.5)}
                    disabled={zoom >= MAX_ZOOM - 0.001}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 transition"
                    aria-label={t('property:floorPlan.viewer.zoomIn', 'Zoom in')}
                >
                    <MagnifyingGlassPlusIcon className="w-4 h-4" />
                </button>
            </div>
        </section>
    );
};

export default FloorPlanMiniMap;
