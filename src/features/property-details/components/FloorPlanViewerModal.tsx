import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { XMarkIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowPathIcon } from '@/constants';
import { useTranslation } from 'react-i18next';

interface FloorPlanViewerModalProps {
    imageUrl: string;
    propertyId?: string;
    onClose: () => void;
}

type RoomType = 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'office' | 'garage' | 'storage' | 'balcony' | 'hallway' | 'other';

const ROOM_TYPE_CONFIG: Record<RoomType, { label: string; color: string; bg: string; border: string; ring: string }> = {
    bedroom: { label: 'Bedroom', color: 'bg-blue-500', bg: 'bg-blue-500', border: 'border-t-blue-500', ring: 'ring-blue-300' },
    bathroom: { label: 'Bathroom', color: 'bg-cyan-500', bg: 'bg-cyan-500', border: 'border-t-cyan-500', ring: 'ring-cyan-300' },
    kitchen: { label: 'Kitchen', color: 'bg-orange-500', bg: 'bg-orange-500', border: 'border-t-orange-500', ring: 'ring-orange-300' },
    living: { label: 'Living Room', color: 'bg-emerald-500', bg: 'bg-emerald-500', border: 'border-t-emerald-500', ring: 'ring-emerald-300' },
    dining: { label: 'Dining Room', color: 'bg-violet-500', bg: 'bg-violet-500', border: 'border-t-violet-500', ring: 'ring-violet-300' },
    office: { label: 'Office', color: 'bg-indigo-500', bg: 'bg-indigo-500', border: 'border-t-indigo-500', ring: 'ring-indigo-300' },
    garage: { label: 'Garage', color: 'bg-neutral-500', bg: 'bg-neutral-500', border: 'border-t-neutral-500', ring: 'ring-neutral-300' },
    storage: { label: 'Storage', color: 'bg-stone-500', bg: 'bg-stone-500', border: 'border-t-stone-500', ring: 'ring-stone-300' },
    balcony: { label: 'Balcony', color: 'bg-teal-500', bg: 'bg-teal-500', border: 'border-t-teal-500', ring: 'ring-teal-300' },
    hallway: { label: 'Hallway', color: 'bg-rose-400', bg: 'bg-rose-400', border: 'border-t-rose-400', ring: 'ring-rose-300' },
    other: { label: 'Other', color: 'bg-amber-500', bg: 'bg-amber-500', border: 'border-t-amber-500', ring: 'ring-amber-300' },
};

const LABEL_MAX_LENGTH = 40;
const NOTES_MAX_LENGTH = 200;
const AREA_MAX = 99999;

interface Annotation {
    id: string;
    x: number; // percentage of image width
    y: number; // percentage of image height
    label: string;
    roomType: RoomType;
    area: string; // stored as string to avoid NaN issues, validated on save
    notes: string;
}

type InteractionMode = 'pan' | 'annotate';

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5, 8];
const MAX_SCALE = 8;
// Smallest zoom, as a fraction of the fitted size.
const MIN_FIT_RATIO = 0.5;

interface View {
    scale: number; // natural image pixels → screen pixels
    x: number;
    y: number;
}

const getStorageKey = (propertyId?: string) =>
    propertyId ? `floorplan-annotations-${propertyId}` : null;

const loadAnnotations = (propertyId?: string): Annotation[] => {
    const key = getStorageKey(propertyId);
    if (!key) return [];
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        // Validate each annotation shape
        return parsed.filter((a: unknown): a is Annotation => {
            if (!a || typeof a !== 'object') return false;
            const obj = a as Record<string, unknown>;
            return (
                typeof obj.id === 'string' &&
                typeof obj.x === 'number' && obj.x >= 0 && obj.x <= 100 &&
                typeof obj.y === 'number' && obj.y >= 0 && obj.y <= 100 &&
                typeof obj.label === 'string' && obj.label.length <= LABEL_MAX_LENGTH &&
                typeof obj.roomType === 'string' && obj.roomType in ROOM_TYPE_CONFIG &&
                typeof obj.area === 'string' &&
                typeof obj.notes === 'string' && obj.notes.length <= NOTES_MAX_LENGTH
            );
        });
    } catch {
        return [];
    }
};

const saveAnnotations = (propertyId: string | undefined, annotations: Annotation[]) => {
    const key = getStorageKey(propertyId);
    if (!key) return;
    try {
        // Only save annotations that have labels (completed)
        const toSave = annotations.filter(a => a.label.trim());
        localStorage.setItem(key, JSON.stringify(toSave));
    } catch {
        // localStorage full or unavailable — silently fail
    }
};

const FloorPlanViewerModal: React.FC<FloorPlanViewerModalProps> = ({ imageUrl, propertyId, onClose }) => {
    const { t } = useTranslation(['property', 'common']);

    const getRoomLabel = (type: RoomType): string => {
        const labels: Record<RoomType, string> = {
            bedroom: t('property:floorPlan.viewer.rooms.bedroom', 'Bedroom'),
            bathroom: t('property:floorPlan.viewer.rooms.bathroom', 'Bathroom'),
            kitchen: t('property:floorPlan.viewer.rooms.kitchen', 'Kitchen'),
            living: t('property:floorPlan.viewer.rooms.living', 'Living Room'),
            dining: t('property:floorPlan.viewer.rooms.dining', 'Dining Room'),
            office: t('property:floorPlan.viewer.rooms.office', 'Office'),
            garage: t('property:floorPlan.viewer.rooms.garage', 'Garage'),
            storage: t('property:floorPlan.viewer.rooms.storage', 'Storage'),
            balcony: t('property:floorPlan.viewer.rooms.balcony', 'Balcony'),
            hallway: t('property:floorPlan.viewer.rooms.hallway', 'Hallway'),
            other: t('property:floorPlan.viewer.rooms.other', 'Other'),
        };
        return labels[type];
    };

    // View transform. Pan/zoom lives in a ref and is written straight to the
    // DOM once per animation frame; React state only follows the settled
    // zoom level (for the % label, slider and pixel rendering). Re-rendering
    // the whole viewer on every pointer move is what made it laggy.
    const viewRef = useRef<View>({ scale: 1, x: 0, y: 0 });
    // Natural-pixel → on-screen scale that fits the plan in the frame. The
    // plan is laid out at this size and CSS-scaled relative to it, so the
    // browser never composites a full-resolution (often 4000px+) layer.
    const fitScaleRef = useRef(1);
    const [baseScale, setBaseScale] = useState(1);
    const [viewScale, setViewScale] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const frameRef = useRef<number | null>(null);
    const animateRef = useRef(false);
    const commitTimerRef = useRef<number | null>(null);

    // Image state
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

    // Interaction mode
    const [mode, setMode] = useState<InteractionMode>('pan');
    const [annotations, setAnnotations] = useState<Annotation[]>(() => loadAnnotations(propertyId));
    const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
    const [detailAnnotation, setDetailAnnotation] = useState<string | null>(null);

    // Pointer gesture state (mouse, pen and touch alike)
    const pointersRef = useRef(new Map<number, { x: number; y: number }>());
    const gestureRef = useRef<{ start: View; mid: { x: number; y: number }; dist: number; left: number; top: number } | null>(null);
    const lastTapRef = useRef(0);
    const lastPointerTypeRef = useRef('mouse');

    // Refs
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const annotationInputRef = useRef<HTMLInputElement>(null);

    // Persist annotations to localStorage whenever they change
    useEffect(() => {
        saveAnnotations(propertyId, annotations);
    }, [annotations, propertyId]);

    const writeTransform = useCallback(() => {
        const el = contentRef.current;
        if (!el) return;
        const v = viewRef.current;
        const base = fitScaleRef.current || 1;
        el.style.transition = animateRef.current ? 'transform 0.18s ease-out' : 'none';
        el.style.transform = `translate3d(${v.x}px, ${v.y}px, 0) scale(${v.scale / base})`;
        // Pins keep a constant on-screen size.
        el.style.setProperty('--pin-scale', String(base / v.scale));
    }, []);

    const scheduleWrite = useCallback(() => {
        if (frameRef.current !== null) return;
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            writeTransform();
        });
    }, [writeTransform]);

    // Sync React with the settled zoom and let the browser re-raster sharply.
    const commitView = useCallback((immediate: boolean) => {
        if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
        const run = () => {
            commitTimerRef.current = null;
            setViewScale(viewRef.current.scale);
            if (contentRef.current) contentRef.current.style.willChange = 'auto';
        };
        if (immediate) run();
        else commitTimerRef.current = window.setTimeout(run, 150);
    }, []);

    useEffect(() => () => {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    }, []);

    // Keep the plan inside the frame: a plan smaller than the frame can move
    // only within it, a larger one can't be dragged past its own edges. The
    // picture can never be flung off-screen.
    const clampView = useCallback((v: View): View => {
        const container = imageContainerRef.current;
        const { width, height } = imageDimensions;
        if (!container || width === 0 || height === 0) return v;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const fit = fitScaleRef.current;
        const scale = Math.min(Math.max(v.scale, fit * MIN_FIT_RATIO), Math.max(MAX_SCALE, fit));
        const axis = (pos: number, size: number, frame: number) =>
            size <= frame
                ? Math.min(Math.max(pos, 0), frame - size)
                : Math.min(Math.max(pos, frame - size), 0);
        return { scale, x: axis(v.x, width * scale, cw), y: axis(v.y, height * scale, ch) };
    }, [imageDimensions]);

    const setView = useCallback((next: View, opts: { animate?: boolean; commit?: boolean } = {}) => {
        viewRef.current = clampView(next);
        animateRef.current = !!opts.animate;
        if (!opts.animate && contentRef.current) contentRef.current.style.willChange = 'transform';
        scheduleWrite();
        commitView(!!opts.commit);
    }, [clampView, scheduleWrite, commitView]);

    // Scale about a point (container coordinates) so it stays under the cursor.
    const zoomAt = useCallback((targetScale: number, pivotX: number, pivotY: number, from: View = viewRef.current, animate = false) => {
        const scale = clampView({ ...from, scale: targetScale }).scale;
        const ratio = scale / from.scale;
        setView({
            scale,
            x: pivotX - (pivotX - from.x) * ratio,
            y: pivotY - (pivotY - from.y) * ratio,
        }, { animate });
    }, [clampView, setView]);

    // Fit image to container
    const fitToScreen = useCallback((animate = false) => {
        const container = imageContainerRef.current;
        if (!container || imageDimensions.width === 0) return;
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        const fitScale = Math.min(containerW / imageDimensions.width, containerH / imageDimensions.height, 1) * 0.9;
        fitScaleRef.current = fitScale;
        setBaseScale(fitScale);
        setView({
            scale: fitScale,
            x: (containerW - imageDimensions.width * fitScale) / 2,
            y: (containerH - imageDimensions.height * fitScale) / 2,
        }, { animate, commit: true });
    }, [imageDimensions, setView]);

    const resetTransform = useCallback(() => {
        fitToScreen(true);
    }, [fitToScreen]);

    useEffect(() => {
        if (!isLoading && imageDimensions.width > 0) {
            fitToScreen();
        }
    }, [isLoading, imageDimensions, fitToScreen]);

    // Refit when the window (and with it the frame) changes size.
    useEffect(() => {
        const onResize = () => fitToScreen();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [fitToScreen]);

    // The laid-out size changes with baseScale; rewrite before paint so the
    // plan doesn't jump for a frame.
    useLayoutEffect(() => {
        writeTransform();
    }, [baseScale, imageDimensions, writeTransform]);

    // Zoom buttons / keyboard: one step about the frame centre (or a point)
    const zoom = useCallback((direction: 'in' | 'out', clientX?: number, clientY?: number) => {
        const container = imageContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const pivotX = clientX !== undefined ? clientX - rect.left : rect.width / 2;
        const pivotY = clientY !== undefined ? clientY - rect.top : rect.height / 2;
        const factor = direction === 'in' ? 1.3 : 1 / 1.3;
        zoomAt(viewRef.current.scale * factor, pivotX, pivotY, viewRef.current, true);
    }, [zoomAt]);

    // Zoom to specific level
    const zoomToLevel = useCallback((level: number) => {
        const container = imageContainerRef.current;
        if (!container) return;
        zoomAt(level, container.clientWidth / 2, container.clientHeight / 2, viewRef.current, true);
    }, [zoomAt]);

    // Toggle between the fitted view and a close-up at a point
    const toggleZoomAt = useCallback((clientX: number, clientY: number) => {
        const container = imageContainerRef.current;
        if (!container) return;
        if (viewRef.current.scale > fitScaleRef.current * 1.5) {
            fitToScreen(true);
            return;
        }
        const rect = container.getBoundingClientRect();
        zoomAt(fitScaleRef.current * 3, clientX - rect.left, clientY - rect.top, viewRef.current, true);
    }, [zoomAt, fitToScreen]);

    // Wheel / trackpad zoom. Registered natively as non-passive (React's
    // onWheel is passive, so preventDefault was ignored). The zoom is
    // proportional to the scroll distance, so a trackpad's burst of small
    // events zooms smoothly instead of 1.3x per event.
    useEffect(() => {
        const container = imageContainerRef.current;
        if (!container) return;
        const onWheel = (e: WheelEvent) => {
            // Let a room's notes box scroll normally.
            if ((e.target as HTMLElement).closest?.('input, textarea, select')) return;
            e.preventDefault();
            e.stopPropagation();
            let delta = e.deltaY;
            if (e.deltaMode === 1) delta *= 16;
            else if (e.deltaMode === 2) delta *= container.clientHeight;
            delta = Math.max(-120, Math.min(120, delta));
            // ctrlKey marks a trackpad pinch, whose deltas are small.
            const factor = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.002));
            const rect = container.getBoundingClientRect();
            zoomAt(viewRef.current.scale * factor, e.clientX - rect.left, e.clientY - rect.top);
        };
        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, [zoomAt]);

    // Snapshot the view and pointers at the start of a pan/pinch (and again
    // whenever a finger is added or lifted, so nothing jumps).
    const beginGesture = useCallback(() => {
        const container = imageContainerRef.current;
        const pts = Array.from(pointersRef.current.values());
        if (!container || pts.length === 0) {
            gestureRef.current = null;
            return;
        }
        const rect = container.getBoundingClientRect();
        const [a, b] = pts;
        gestureRef.current = {
            start: { ...viewRef.current },
            mid: b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : { x: a.x, y: a.y },
            dist: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
            left: rect.left,
            top: rect.top,
        };
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        lastPointerTypeRef.current = e.pointerType;
        if (mode === 'annotate') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        setDetailAnnotation(null);
        imageContainerRef.current?.setPointerCapture(e.pointerId);
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (e.pointerType === 'touch' && pointersRef.current.size === 1) {
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
                lastTapRef.current = 0;
                toggleZoomAt(e.clientX, e.clientY);
            } else {
                lastTapRef.current = now;
            }
        }

        beginGesture();
        setIsPanning(true);
    }, [mode, beginGesture, toggleZoomAt]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!pointersRef.current.has(e.pointerId)) return;
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const g = gestureRef.current;
        if (!g) return;
        const [a, b] = Array.from(pointersRef.current.values());
        const mid = b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a;
        const targetScale = b && g.dist > 0
            ? g.start.scale * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist)
            : g.start.scale;
        const scale = clampView({ ...g.start, scale: targetScale }).scale;
        const ratio = scale / g.start.scale;
        // The plan point under the gesture's start midpoint follows the fingers.
        const startMidX = g.mid.x - g.left;
        const startMidY = g.mid.y - g.top;
        setView({
            scale,
            x: (mid.x - g.left) - (startMidX - g.start.x) * ratio,
            y: (mid.y - g.top) - (startMidY - g.start.y) * ratio,
        });
    }, [clampView, setView]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (!pointersRef.current.delete(e.pointerId)) return;
        if (imageContainerRef.current?.hasPointerCapture(e.pointerId)) {
            imageContainerRef.current.releasePointerCapture(e.pointerId);
        }
        if (pointersRef.current.size > 0) {
            beginGesture();
        } else {
            gestureRef.current = null;
            setIsPanning(false);
            commitView(true);
        }
    }, [beginGesture, commitView]);

    // Annotate mode: a click/tap drops a pin where it lands on the plan
    const addAnnotationAt = useCallback((clientX: number, clientY: number) => {
        const container = imageContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const v = viewRef.current;
        const imgX = ((clientX - rect.left - v.x) / v.scale / imageDimensions.width) * 100;
        const imgY = ((clientY - rect.top - v.y) / v.scale / imageDimensions.height) * 100;

        if (imgX >= 0 && imgX <= 100 && imgY >= 0 && imgY <= 100) {
            const newId = `ann-${Date.now()}`;
            setAnnotations(prev => [...prev, { id: newId, x: imgX, y: imgY, label: '', roomType: 'other', area: '', notes: '' }]);
            setEditingAnnotation(newId);
            setDetailAnnotation(null);
        }
    }, [imageDimensions]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (mode !== 'annotate' || e.button !== 0) return;
        // Prevent browser default focus behavior — without this, the browser
        // steals focus from the annotation input on the subsequent click event,
        // triggering onBlur which removes the empty-label annotation instantly.
        e.preventDefault();
        e.stopPropagation();
        addAnnotationAt(e.clientX, e.clientY);
    }, [mode, addAnnotationAt]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (mode !== 'annotate' || e.touches.length !== 1) return;
        e.preventDefault();
        addAnnotationAt(e.touches[0].clientX, e.touches[0].clientY);
    }, [mode, addAnnotationAt]);

    // Double-click zoom (desktop; touch double-tap is handled on pointerdown)
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        if (mode === 'annotate' || lastPointerTypeRef.current !== 'mouse') return;
        toggleZoomAt(e.clientX, e.clientY);
    }, [mode, toggleZoomAt]);

    // Annotation handlers
    const handleAnnotationLabelChange = useCallback((id: string, label: string) => {
        if (label.length > LABEL_MAX_LENGTH) return;
        setAnnotations(prev => prev.map(a => a.id === id ? { ...a, label } : a));
    }, []);

    const handleAnnotationLabelSubmit = useCallback((id: string, removeIfEmpty = true) => {
        if (removeIfEmpty) {
            setAnnotations(prev => {
                const ann = prev.find(a => a.id === id);
                if (ann && !ann.label.trim()) {
                    return prev.filter(a => a.id !== id);
                }
                return prev;
            });
        }
        setEditingAnnotation(null);
    }, []);

    // Focus annotation input when editing starts
    useEffect(() => {
        if (editingAnnotation) {
            requestAnimationFrame(() => {
                annotationInputRef.current?.focus();
            });
        }
    }, [editingAnnotation]);

    const removeAnnotation = useCallback((id: string) => {
        setAnnotations(prev => prev.filter(a => a.id !== id));
        if (editingAnnotation === id) setEditingAnnotation(null);
        if (detailAnnotation === id) setDetailAnnotation(null);
    }, [editingAnnotation, detailAnnotation]);

    // Room detail handlers
    const handleRoomTypeChange = useCallback((id: string, roomType: RoomType) => {
        setAnnotations(prev => prev.map(a => a.id === id ? { ...a, roomType } : a));
    }, []);

    const handleAreaChange = useCallback((id: string, value: string) => {
        // Only allow digits and a single decimal point
        const sanitized = value.replace(/[^0-9.]/g, '');
        // Prevent multiple decimal points
        const parts = sanitized.split('.');
        const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
        // Validate range
        const num = parseFloat(cleaned);
        if (cleaned !== '' && (num < 0 || num > AREA_MAX)) return;
        setAnnotations(prev => prev.map(a => a.id === id ? { ...a, area: cleaned } : a));
    }, []);

    const handleNotesChange = useCallback((id: string, notes: string) => {
        if (notes.length > NOTES_MAX_LENGTH) return;
        setAnnotations(prev => prev.map(a => a.id === id ? { ...a, notes } : a));
    }, []);

    const toggleDetailPanel = useCallback((id: string) => {
        setDetailAnnotation(prev => prev === id ? null : id);
        setEditingAnnotation(null);
    }, []);

    // Keyboard handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    if (detailAnnotation) {
                        setDetailAnnotation(null);
                    } else if (editingAnnotation) {
                        handleAnnotationLabelSubmit(editingAnnotation);
                    } else if (mode === 'annotate') {
                        setMode('pan');
                    } else {
                        onClose();
                    }
                    break;
                case '+':
                case '=':
                    zoom('in');
                    break;
                case '-':
                    zoom('out');
                    break;
                case '0':
                    resetTransform();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, zoom, resetTransform, mode, editingAnnotation, detailAnnotation, handleAnnotationLabelSubmit]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Image load/error handlers
    const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setIsLoading(false);
        setHasError(false);
    }, []);

    const handleImageError = useCallback(() => {
        setIsLoading(false);
        setHasError(true);
    }, []);

    // Current zoom percentage
    const zoomPercent = Math.round(viewScale * 100);

    // Find closest zoom preset index for the slider
    const closestZoomIndex = ZOOM_LEVELS.reduce((closest, level, i) =>
        Math.abs(level - viewScale) < Math.abs(ZOOM_LEVELS[closest] - viewScale) ? i : closest
    , 0);

    return (
        <div
            className="fixed inset-0 bg-black/90 z-[6000] flex flex-col"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={t('property:floorPlan.viewer.ariaLabel', 'Floor plan viewer')}
        >
            {/* Top toolbar */}
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2">
                    {/* Mode toggle */}
                    <div className="flex items-center bg-neutral-800/80 rounded-lg backdrop-blur-md border border-white/10 overflow-hidden">
                        <button
                            onClick={() => setMode('pan')}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                                mode === 'pan'
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                            aria-label={t('property:floorPlan.viewer.panMode', 'Pan mode')}
                            title={t('property:floorPlan.viewer.panTitle', 'Pan & Zoom (drag to move, scroll to zoom)')}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                            </svg>
                            <span className="hidden sm:inline">{t('property:floorPlan.viewer.pan', 'Pan')}</span>
                        </button>
                        <button
                            onClick={() => setMode('annotate')}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                                mode === 'annotate'
                                    ? 'bg-amber-500/30 text-amber-300'
                                    : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                            aria-label={t('property:floorPlan.viewer.annotateMode', 'Annotate mode')}
                            title={t('property:floorPlan.viewer.annotateTitle', 'Click on the floor plan to add room labels')}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                            </svg>
                            <span className="hidden sm:inline">{t('property:floorPlan.viewer.label', 'Label')}</span>
                        </button>
                    </div>

                    {/* Annotation count badge */}
                    {annotations.length > 0 && (
                        <button
                            onClick={() => { setAnnotations([]); setEditingAnnotation(null); setDetailAnnotation(null); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg backdrop-blur-md text-xs font-medium transition-colors border border-red-500/20"
                            title={t('property:floorPlan.viewer.clearLabels', 'Clear all labels')}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            {annotations.length}
                        </button>
                    )}
                </div>

                <div className="pointer-events-auto flex items-center gap-2">
                    {/* Zoom controls */}
                    <div className="flex items-center gap-1 bg-neutral-800/80 p-1 rounded-lg backdrop-blur-md border border-white/10">
                        <button
                            onClick={() => zoom('out')}
                            className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                            aria-label={t('property:floorPlan.viewer.zoomOut', 'Zoom out')}
                        >
                            <MagnifyingGlassMinusIcon className="w-5 h-5" />
                        </button>

                        {/* Zoom level indicator */}
                        <button
                            onClick={resetTransform}
                            className="px-2 py-1 text-xs sm:text-sm font-mono text-white/80 hover:text-white hover:bg-white/10 rounded-md min-w-[3.5rem] text-center transition-colors"
                            title={t('property:floorPlan.viewer.fitToScreen', 'Click to fit to screen')}
                        >
                            {zoomPercent}%
                        </button>

                        <button
                            onClick={() => zoom('in')}
                            className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                            aria-label={t('property:floorPlan.viewer.zoomIn', 'Zoom in')}
                        >
                            <MagnifyingGlassPlusIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Reset button */}
                    <button
                        onClick={resetTransform}
                        className="p-1.5 sm:p-2 bg-neutral-800/80 text-white/70 hover:text-white hover:bg-white/10 rounded-lg backdrop-blur-md transition-colors border border-white/10"
                        aria-label={t('property:floorPlan.viewer.fitToScreen', 'Fit to screen')}
                        title={t('property:floorPlan.viewer.fitToScreenShortcut', 'Fit to screen (0)')}
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                    </button>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="p-1.5 sm:p-2 bg-neutral-800/80 text-white/70 hover:text-white hover:bg-red-500/40 rounded-lg backdrop-blur-md transition-colors border border-white/10"
                        aria-label={t('property:floorPlan.viewer.close', 'Close floor plan viewer')}
                        title={t('property:floorPlan.viewer.closeShortcut', 'Close (Esc)')}
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Mode hint banner */}
            {mode === 'annotate' && (
                <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-200 text-xs sm:text-sm rounded-full backdrop-blur-md border border-amber-500/30 animate-pulse">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                        </svg>
                        {t('property:floorPlan.viewer.clickToAddLabel', 'Click anywhere on the floor plan to add a room label')}
                    </div>
                </div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                        <span className="text-white/70 text-sm">{t('property:floorPlan.viewer.loading', 'Loading floor plan...')}</span>
                    </div>
                </div>
            )}

            {/* Error state */}
            {hasError && (
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 p-8 bg-neutral-900/90 rounded-2xl border border-red-500/30 max-w-sm mx-4">
                        <svg className="w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <div className="text-center">
                            <h3 className="text-white font-semibold text-lg mb-1">{t('property:floorPlan.viewer.loadFailed', 'Failed to Load Floor Plan')}</h3>
                            <p className="text-white/60 text-sm">{t('property:floorPlan.viewer.loadFailedDesc', 'The floor plan image could not be loaded. It may have been moved or deleted.')}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setHasError(false); setIsLoading(true); }}
                                className="px-4 py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors"
                            >
                                {t('common:retry', 'Retry')}
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-red-500/20 text-red-300 text-sm rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                                {t('common:close', 'Close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main interactive area */}
            <div
                ref={imageContainerRef}
                className={`flex-1 overflow-hidden ${
                    mode === 'annotate' ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onTouchStart={handleTouchStart}
                style={{ touchAction: 'none' }}
            >
                {/* transform is written directly by writeTransform */}
                <div ref={contentRef} style={{ transformOrigin: '0 0' }}>
                    <div
                        className="relative"
                        style={{
                            width: imageDimensions.width ? imageDimensions.width * baseScale : 'auto',
                            height: imageDimensions.height ? imageDimensions.height * baseScale : 'auto',
                            boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.5), 0 10px 20px -5px rgba(0, 0, 0, 0.3)',
                            borderRadius: '4px',
                        }}
                    >
                        <img
                            ref={imageRef}
                            src={imageUrl}
                            alt={t('property:floorPlan.viewer.floorPlanAlt', 'Floor Plan')}
                            className={`block select-none ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                            style={{
                                imageRendering: viewScale > 2 ? 'pixelated' : 'auto',
                                maxWidth: 'none',
                                width: imageDimensions.width ? '100%' : undefined,
                                height: imageDimensions.height ? '100%' : undefined,
                                borderRadius: '4px',
                            }}
                            draggable={false}
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                            onDragStart={(e) => e.preventDefault()}
                        />

                        {/* Annotations layer */}
                        {annotations.map(ann => {
                            const cfg = ROOM_TYPE_CONFIG[ann.roomType] || ROOM_TYPE_CONFIG.other;
                            const isEditing = editingAnnotation === ann.id;
                            const isDetailOpen = detailAnnotation === ann.id;

                            return (
                            <div
                                key={ann.id}
                                className="absolute"
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                style={{
                                    left: `${ann.x}%`,
                                    top: `${ann.y}%`,
                                    transform: 'translate(-50%, -50%) scale(var(--pin-scale, 1))',
                                    transformOrigin: 'center',
                                    pointerEvents: 'auto',
                                    zIndex: isEditing || isDetailOpen ? 20 : 10,
                                }}
                            >
                                {/* Pin - color-coded by room type */}
                                <div className="group relative">
                                    <div className={`w-5 h-5 ${cfg.bg} rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${isEditing ? `ring-2 ${cfg.ring} ring-offset-1 ring-offset-transparent` : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (ann.label.trim()) {
                                                toggleDetailPanel(ann.id);
                                            } else {
                                                setEditingAnnotation(ann.id);
                                            }
                                        }}
                                    >
                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                    </div>

                                    {/* Editing input — shown for new annotations */}
                                    {isEditing && (
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap z-10">
                                            <input
                                                ref={annotationInputRef}
                                                type="text"
                                                value={ann.label}
                                                onChange={(e) => handleAnnotationLabelChange(ann.id, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAnnotationLabelSubmit(ann.id, true);
                                                        if (ann.label.trim()) setDetailAnnotation(ann.id);
                                                    }
                                                    if (e.key === 'Escape') { removeAnnotation(ann.id); }
                                                }}
                                                onBlur={() => {
                                                    handleAnnotationLabelSubmit(ann.id, false);
                                                }}
                                                placeholder={t('property:floorPlan.viewer.roomNamePlaceholder', 'Room name...')}
                                                maxLength={LABEL_MAX_LENGTH}
                                                className={`px-2 py-1 text-xs bg-white text-neutral-800 rounded-md border-2 outline-none shadow-lg min-w-[100px]`}
                                                style={{ borderColor: `var(--pin-color, #f59e0b)` }}
                                                autoFocus
                                            />
                                        </div>
                                    )}

                                    {/* Label tooltip — color-coded */}
                                    {!isEditing && ann.label && (
                                        <div
                                            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap"
                                            onClick={(e) => { e.stopPropagation(); toggleDetailPanel(ann.id); }}
                                        >
                                            <div className={`relative px-2.5 py-1 ${cfg.bg} text-white text-xs font-semibold rounded-md shadow-lg cursor-pointer hover:opacity-90 transition-opacity`}>
                                                {ann.label}
                                                {ann.area && <span className="ml-1 opacity-80">({ann.area}m²)</span>}
                                                {/* Triangle pointer */}
                                                <div className={`absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${cfg.border}`} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Detail popover */}
                                    {isDetailOpen && ann.label && (
                                        <div
                                            className="absolute left-1/2 -translate-x-1/2 top-full mt-3 z-30"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-56 overflow-hidden">
                                                {/* Header */}
                                                <div className={`${cfg.bg} px-3 py-2 flex items-center justify-between`}>
                                                    <span className="text-white text-xs font-bold truncate">{ann.label}</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setDetailAnnotation(null); }}
                                                        className="text-white/80 hover:text-white ml-2 flex-shrink-0"
                                                        aria-label={t('property:floorPlan.viewer.closeDetails', 'Close details')}
                                                    >
                                                        <XMarkIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <div className="p-3 space-y-2.5">
                                                    {/* Room type selector */}
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">{t('property:floorPlan.viewer.roomType', 'Room Type')}</label>
                                                        <select
                                                            value={ann.roomType}
                                                            onChange={(e) => handleRoomTypeChange(ann.id, e.target.value as RoomType)}
                                                            className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-neutral-300"
                                                        >
                                                            {(Object.keys(ROOM_TYPE_CONFIG) as RoomType[]).map(type => (
                                                                <option key={type} value={type}>
                                                                    {getRoomLabel(type)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Area input */}
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">{t('property:floorPlan.viewer.area', 'Area (m²)')}</label>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={ann.area}
                                                            onChange={(e) => handleAreaChange(ann.id, e.target.value)}
                                                            placeholder={t('property:floorPlan.viewer.areaPlaceholder', 'e.g. 25')}
                                                            className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-300"
                                                        />
                                                    </div>

                                                    {/* Notes */}
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                                                            {t('property:floorPlan.viewer.notes', 'Notes')}
                                                            <span className="text-neutral-400 ml-1 normal-case">({ann.notes.length}/{NOTES_MAX_LENGTH})</span>
                                                        </label>
                                                        <textarea
                                                            value={ann.notes}
                                                            onChange={(e) => handleNotesChange(ann.id, e.target.value)}
                                                            placeholder={t('property:floorPlan.viewer.notesPlaceholder', 'Window facing south, built-in closet...')}
                                                            rows={2}
                                                            maxLength={NOTES_MAX_LENGTH}
                                                            className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-neutral-300"
                                                        />
                                                    </div>

                                                    {/* Edit label / Delete */}
                                                    <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDetailAnnotation(null);
                                                                setEditingAnnotation(ann.id);
                                                            }}
                                                            className="flex-1 text-[11px] text-neutral-600 hover:text-neutral-800 font-medium py-1 rounded hover:bg-neutral-50 transition-colors"
                                                        >
                                                            {t('property:floorPlan.viewer.rename', 'Rename')}
                                                        </button>
                                                        <div className="w-px h-4 bg-neutral-200" />
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}
                                                            className="flex-1 text-[11px] text-red-500 hover:text-red-700 font-medium py-1 rounded hover:bg-red-50 transition-colors"
                                                        >
                                                            {t('common:delete', 'Delete')}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Arrow pointing up */}
                                                <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-white border-l border-t border-neutral-200 rotate-45" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Remove button on hover */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        aria-label={t('property:floorPlan.viewer.removeLabel', 'Remove label')}
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom zoom slider */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-neutral-800/80 rounded-xl backdrop-blur-md border border-white/10">
                    <button
                        onClick={() => zoom('out')}
                        className="text-white/60 hover:text-white transition-colors"
                        aria-label={t('property:floorPlan.viewer.zoomOut', 'Zoom out')}
                    >
                        <MagnifyingGlassMinusIcon className="w-4 h-4" />
                    </button>
                    <input
                        type="range"
                        min={0}
                        max={ZOOM_LEVELS.length - 1}
                        step={1}
                        value={closestZoomIndex}
                        onChange={(e) => zoomToLevel(ZOOM_LEVELS[Number(e.target.value)])}
                        className="w-32 sm:w-48 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                        aria-label={t('property:floorPlan.viewer.zoomLevel', 'Zoom level')}
                    />
                    <button
                        onClick={() => zoom('in')}
                        className="text-white/60 hover:text-white transition-colors"
                        aria-label={t('property:floorPlan.viewer.zoomIn', 'Zoom in')}
                    >
                        <MagnifyingGlassPlusIcon className="w-4 h-4" />
                    </button>
                    <span className="text-white/50 text-xs font-mono min-w-[3rem] text-center">{zoomPercent}%</span>
                </div>
            </div>

            {/* Annotation list panel — visible when annotations exist */}
            {annotations.filter(a => a.label.trim()).length > 0 && (
                <div className="absolute top-16 sm:top-20 left-3 z-30 pointer-events-auto hidden sm:block">
                    <div className="bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 w-48 max-h-[50vh] overflow-y-auto">
                        <div className="px-3 py-2 border-b border-white/10">
                            <span className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">{t('property:floorPlan.viewer.roomLabels', 'Room Labels')}</span>
                        </div>
                        <div className="p-1.5 space-y-0.5">
                            {annotations.filter(a => a.label.trim()).map(ann => {
                                const c = ROOM_TYPE_CONFIG[ann.roomType] || ROOM_TYPE_CONFIG.other;
                                return (
                                    <button
                                        key={ann.id}
                                        onClick={() => toggleDetailPanel(ann.id)}
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${detailAnnotation === ann.id ? 'bg-white/15' : 'hover:bg-white/10'}`}
                                    >
                                        <div className={`w-2.5 h-2.5 rounded-full ${c.bg} flex-shrink-0`} />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-white text-xs font-medium truncate">{ann.label}</div>
                                            {ann.area && (
                                                <div className="text-white/50 text-[10px]">{ann.area} m²</div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Keyboard shortcuts hint - hidden on mobile */}
            <div className="absolute bottom-4 right-4 z-20 hidden lg:block pointer-events-none">
                <div className="text-white/30 text-[10px] space-y-0.5">
                    <div>{t('property:floorPlan.viewer.shortcuts.scroll', 'Scroll: Zoom | Drag: Pan | Double-click: Quick zoom')}</div>
                    <div>{t('property:floorPlan.viewer.shortcuts.keys', '+/-: Zoom | 0: Reset | Esc: Close')}</div>
                    {mode === 'annotate' && <div>{t('property:floorPlan.viewer.shortcuts.annotate', 'Click: Add label | Esc: Exit label mode')}</div>}
                </div>
            </div>
        </div>
    );
};

export default FloorPlanViewerModal;
