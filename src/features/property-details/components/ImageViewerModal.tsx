import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, BuildingOfficeIcon } from '@/constants';
import { optimizeCloudinaryUrl, cloudinarySrcSet } from '@/config/cloudinaryConfig';
import { useAppContext } from '@/context/AppContext';
import { createConversation, sendMessage, uploadMessageImage } from '../../../../services/apiService';

const RoomStylerModal = lazy(() => import('../../room-styler/components/RoomStylerModal'));

interface ImageViewerModalProps {
    images: { url: string; tag: string }[];
    startIndex: number;
    onClose: () => void;
    propertyId?: string;
}

type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string; width: number };

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const SWIPE_THRESHOLD = 50;
const DOUBLE_TAP_MS = 300;

const COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7', '#FFFFFF', '#111827'];
const WIDTHS = [3, 7, 14];

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ images, startIndex, onClose, propertyId }) => {
    const { t } = useTranslation(['property']);
    const { state, dispatch } = useAppContext();
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isSendingToChat, setIsSendingToChat] = useState(false);
    const [showStyler, setShowStyler] = useState(false);

    // The AI Room Styler only works on Cloudinary-hosted listing photos.
    const currentUrl = images[currentIndex]?.url;
    const canRestyle = !!currentUrl && currentUrl.includes('res.cloudinary.com');

    const openStyler = useCallback(() => {
        if (!state.isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
            return;
        }
        setShowStyler(true);
    }, [state.isAuthenticated, dispatch]);

    // Zoom / pan
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const zoomRef = useRef(1);
    const panXRef = useRef(0);
    const panYRef = useRef(0);
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useEffect(() => { panXRef.current = panX; }, [panX]);
    useEffect(() => { panYRef.current = panY; }, [panY]);

    // Annotate
    const [annotateMode, setAnnotateMode] = useState(false);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);
    const [drawColor, setDrawColor] = useState('#EF4444');
    const [drawWidth, setDrawWidth] = useState(WIDTHS[1]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const imageElRef = useRef<HTMLImageElement>(null);
    const imageAreaRef = useRef<HTMLDivElement>(null);

    // Touch tracking (never causes re-renders)
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const lastTapRef = useRef(0);
    const pinchStartDist = useRef(0);
    const pinchStartZoom = useRef(1);
    const panOriginRef = useRef<{ x: number; y: number } | null>(null);

    // Mouse drag tracking
    const isMouseDraggingRef = useRef(false);
    const mouseDragOriginRef = useRef<{ x: number; y: number } | null>(null);

    // ── Canvas draw ──────────────────────────────────────────────────────────
    const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke) => {
        if (s.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
        ctx.stroke();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !annotateMode) return;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokes.forEach(s => drawStroke(ctx, s));
        if (activeStroke) drawStroke(ctx, activeStroke);
    }, [strokes, activeStroke, annotateMode]);

    const canvasPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        let cx: number, cy: number;
        if ('touches' in e) {
            const t = e.touches.length > 0 ? e.touches[0] : (e as React.TouchEvent).changedTouches[0];
            cx = t.clientX; cy = t.clientY;
        } else {
            cx = (e as React.MouseEvent).clientX; cy = (e as React.MouseEvent).clientY;
        }
        return { x: cx - rect.left, y: cy - rect.top };
    };

    const onDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        isDrawingRef.current = true;
        const pt = canvasPoint(e);
        setActiveStroke({ points: [pt, pt], color: drawColor, width: drawWidth });
    };

    const onDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawingRef.current) return;
        e.preventDefault();
        const pt = canvasPoint(e);
        setActiveStroke(prev => prev ? { ...prev, points: [...prev.points, pt] } : null);
    };

    const onDrawEnd = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        setActiveStroke(prev => {
            if (prev && prev.points.length > 1) setStrokes(ss => [...ss, prev]);
            return null;
        });
    };

    const undo = useCallback(() => setStrokes(s => s.slice(0, -1)), []);
    const clearAnnotations = useCallback(() => setStrokes([]), []);

    const buildAnnotatedCanvas = useCallback((): HTMLCanvasElement | null => {
        const canvas = canvasRef.current;
        const imgEl = imageElRef.current;
        if (!canvas || !imgEl) return null;
        const W = canvas.offsetWidth, H = canvas.offsetHeight;
        const off = document.createElement('canvas');
        off.width = W; off.height = H;
        const ctx = off.getContext('2d')!;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        try {
            const s = Math.min(W / imgEl.naturalWidth, H / imgEl.naturalHeight);
            const rw = imgEl.naturalWidth * s, rh = imgEl.naturalHeight * s;
            ctx.drawImage(imgEl, (W - rw) / 2, (H - rh) / 2, rw, rh);
        } catch (e) {
            console.error('Failed to draw image on canvas (may be cross-origin):', e);
        }
        strokes.forEach(stroke => drawStroke(ctx, stroke));
        return off;
    }, [strokes]);

    const downloadAnnotated = useCallback(() => {
        const off = buildAnnotatedCanvas();
        if (!off) return;
        const a = document.createElement('a');
        a.download = 'annotated-property.jpg';
        a.href = off.toDataURL('image/jpeg', 0.92);
        a.click();
    }, [buildAnnotatedCanvas]);

    const sendAnnotatedToChat = useCallback(async () => {
        if (!propertyId || isSendingToChat) return;
        const off = buildAnnotatedCanvas();
        if (!off) return;
        setIsSendingToChat(true);
        try {
            off.toBlob(async (blob) => {
                if (!blob) { setIsSendingToChat(false); return; }
                try {
                    let convId = state.conversations?.find((c: { property?: { id: string }; id: string }) => c.property?.id === propertyId)?.id;
                    if (!convId) {
                        const newConv = await createConversation(propertyId);
                        convId = newConv.id;
                        dispatch({ type: 'CREATE_CONVERSATION', payload: newConv });
                    }
                    const file = new File([blob], 'annotated-property.png', { type: 'image/png' });
                    const imageUrl = await uploadMessageImage(convId, file);
                    await sendMessage(convId, {
                        id: `msg-${Date.now()}`,
                        text: '',
                        imageUrl,
                        senderId: state.currentUser?.id || '',
                        timestamp: Date.now(),
                        isRead: false,
                    } as Parameters<typeof sendMessage>[1]);
                    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
                    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });
                    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: convId });
                    window.history.pushState({}, '', '/inbox');
                    onClose();
                } catch (err) {
                    console.error('Failed to send annotated image:', err);
                    dispatch({ type: 'SHOW_ALERT', payload: { type: 'error', title: t('property:imageViewer.annotate.sendError', 'Error'), message: t('property:imageViewer.annotate.sendFailed', 'Failed to send annotated image.') } });
                    setIsSendingToChat(false);
                }
            }, 'image/png');
        } catch (err) {
            console.error('Failed to export canvas:', err);
            dispatch({ type: 'SHOW_ALERT', payload: { type: 'error', title: t('property:imageViewer.annotate.sendError', 'Error'), message: t('property:imageViewer.annotate.sendFailed', 'Failed to send annotated image.') } });
            setIsSendingToChat(false);
        }
    }, [propertyId, isSendingToChat, buildAnnotatedCanvas, state, dispatch, onClose, t]);

    // ── Zoom helpers ─────────────────────────────────────────────────────────
    const resetZoom = useCallback(() => { setZoom(1); setPanX(0); setPanY(0); }, []);

    const zoomIn = useCallback(() => setZoom(z => Math.min(MAX_ZOOM, parseFloat((z + 0.5).toFixed(1)))), []);
    const zoomOut = useCallback(() => {
        setZoom(z => {
            const n = Math.max(MIN_ZOOM, parseFloat((z - 0.5).toFixed(1)));
            if (n === 1) { setPanX(0); setPanY(0); }
            return n;
        });
    }, []);

    // Clamp pan so the (scaled) image can travel all the way to its own edges —
    // no further, no less. Bounds are derived from the real container + image
    // sizes rather than a fixed constant, so panning works on any screen size.
    const clampPan = useCallback((x: number, y: number, z: number) => {
        const container = imageAreaRef.current;
        const img = imageElRef.current;
        if (!container || !img || !img.naturalWidth || !img.naturalHeight) {
            const max = (z - 1) * 160;
            return { x: Math.max(-max, Math.min(max, x)), y: Math.max(-max, Math.min(max, y)) };
        }
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        // Image is rendered with object-contain, so it fits inside the container first.
        const fit = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
        const renderedW = img.naturalWidth * fit;
        const renderedH = img.naturalHeight * fit;
        // Half of the amount the scaled image overflows the container on each axis.
        const maxX = Math.max(0, (renderedW * z - cw) / 2);
        const maxY = Math.max(0, (renderedH * z - ch) / 2);
        return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
    }, []);

    // Keep the pan within bounds whenever the zoom level changes (e.g. via the
    // +/- buttons or wheel), so zooming out re-centers instead of leaving gaps.
    useEffect(() => {
        if (zoom <= 1) return;
        const c = clampPan(panXRef.current, panYRef.current, zoom);
        if (c.x !== panXRef.current) setPanX(c.x);
        if (c.y !== panYRef.current) setPanY(c.y);
    }, [zoom, clampPan]);

    // ── Navigation ───────────────────────────────────────────────────────────
    const goNext = useCallback(() => {
        resetZoom(); setStrokes([]); setAnnotateMode(false);
        setCurrentIndex(i => (i + 1) % images.length);
    }, [images.length, resetZoom]);

    const goPrev = useCallback(() => {
        resetZoom(); setStrokes([]); setAnnotateMode(false);
        setCurrentIndex(i => (i - 1 + images.length) % images.length);
    }, [images.length, resetZoom]);

    // ── Touch handling ───────────────────────────────────────────────────────
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartDist.current = Math.sqrt(dx * dx + dy * dy);
            pinchStartZoom.current = zoomRef.current;
        } else if (e.touches.length === 1) {
            const { clientX: x, clientY: y } = e.touches[0];
            touchStartRef.current = { x, y, time: Date.now() };
            if (zoomRef.current > 1) panOriginRef.current = { x: x - panXRef.current, y: y - panYRef.current };
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchStartDist.current > 0) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartZoom.current * (dist / pinchStartDist.current))));
            try { e.preventDefault(); } catch (e) { /* passive listener, ignored */ }
        } else if (e.touches.length === 1 && zoomRef.current > 1 && panOriginRef.current) {
            const { clientX: x, clientY: y } = e.touches[0];
            const c = clampPan(x - panOriginRef.current.x, y - panOriginRef.current.y, zoomRef.current);
            setPanX(c.x); setPanY(c.y);
            try { e.preventDefault(); } catch (e) { /* passive listener, ignored */ }
        }
    }, [clampPan]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const start = touchStartRef.current;
        pinchStartDist.current = 0; panOriginRef.current = null;
        if (!start || zoomRef.current > 1) { touchStartRef.current = null; return; }
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x, dy = t.clientY - start.y;
        const quick = Date.now() - start.time < 300;
        const still = Math.abs(dx) < 10 && Math.abs(dy) < 10;
        if (still && quick) {
            const now = Date.now();
            if (now - lastTapRef.current < DOUBLE_TAP_MS) { setZoom(2); lastTapRef.current = 0; }
            else lastTapRef.current = now;
        } else if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < -SWIPE_THRESHOLD) goNext();
            else if (dx > SWIPE_THRESHOLD) goPrev();
        } else if (dy > SWIPE_THRESHOLD) onClose();
        touchStartRef.current = null;
    }, [goNext, goPrev, onClose]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        try { e.preventDefault(); } catch (e) { /* passive listener, ignored */ }
        const newZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * (e.deltaY < 0 ? 1.15 : 0.87)));
        setZoom(newZ);
        if (newZ === 1) { setPanX(0); setPanY(0); }
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (annotateMode || zoomRef.current <= 1) return;
        isMouseDraggingRef.current = true;
        mouseDragOriginRef.current = { x: e.clientX - panXRef.current, y: e.clientY - panYRef.current };
    }, [annotateMode]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isMouseDraggingRef.current || !mouseDragOriginRef.current) return;
        const c = clampPan(e.clientX - mouseDragOriginRef.current.x, e.clientY - mouseDragOriginRef.current.y, zoomRef.current);
        setPanX(c.x); setPanY(c.y);
    }, [clampPan]);

    const handleMouseUp = useCallback(() => {
        isMouseDraggingRef.current = false;
        mouseDragOriginRef.current = null;
    }, []);

    // ── Effects ──────────────────────────────────────────────────────────────
    useEffect(() => {
        setImageError(false); setImageLoaded(false);
        resetZoom(); setStrokes([]); setAnnotateMode(false);
    }, [currentIndex, images, resetZoom]);

    useEffect(() => {
        if (images.length <= 1) return;
        [((currentIndex - 1 + images.length) % images.length), ((currentIndex + 1) % images.length)].forEach(idx => {
            const url = images[idx]?.url;
            if (url) { const img = new Image(); img.src = optimizeCloudinaryUrl(url, { width: 1920, quality: 'auto' }); }
        });
    }, [currentIndex, images]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' && !annotateMode) goNext();
            else if (e.key === 'ArrowLeft' && !annotateMode) goPrev();
            else if (e.key === 'Escape') { if (annotateMode) setAnnotateMode(false); else if (zoomRef.current > 1) resetZoom(); else onClose(); }
            else if ((e.key === '+' || e.key === '=') && !annotateMode) zoomIn();
            else if (e.key === '-' && !annotateMode) zoomOut();
            else if (e.key === '0' && !annotateMode) resetZoom();
            else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && annotateMode) { e.preventDefault(); undo(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [goNext, goPrev, onClose, resetZoom, zoomIn, zoomOut, annotateMode, undo]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    if (images.length === 0) return null;

    const isZoomed = zoom > 1;

    return (
        <div className="fixed inset-0 bg-black z-[6000] flex flex-col" role="dialog" aria-modal="true">

            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <div
                className="flex-shrink-0 flex items-center gap-2 px-3 z-20"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)', height: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}
            >
                {/* Zoom controls pill */}
                <div className="flex items-center rounded-full bg-white/10 backdrop-blur-sm overflow-hidden">
                    <button
                        type="button"
                        onClick={zoomOut}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Zoom out"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35M8 11h6"/>
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={resetZoom}
                        className="px-2 text-white text-xs font-semibold min-w-[46px] min-h-[44px] flex items-center justify-center hover:bg-white/10 transition-colors tabular-nums"
                        aria-label="Reset zoom"
                    >
                        {Math.round(zoom * 100)}%
                    </button>
                    <button
                        type="button"
                        onClick={zoomIn}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Zoom in"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
                        </svg>
                    </button>
                </div>

                {/* Reimagine (AI Room Styler) */}
                {canRestyle && !annotateMode && (
                    <button
                        type="button"
                        onClick={openStyler}
                        className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-full text-sm font-medium bg-white/10 text-white/80 hover:text-white hover:bg-white/20 backdrop-blur-sm transition-colors"
                        aria-label={t('property:roomStyler.reimagine', 'Reimagine this room')}
                    >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                        </svg>
                        <span className="hidden sm:inline">{t('property:roomStyler.reimagine', 'Reimagine')}</span>
                    </button>
                )}

                {/* Annotate toggle */}
                <button
                    type="button"
                    onClick={() => { if (!annotateMode && isZoomed) resetZoom(); setAnnotateMode(m => !m); }}
                    className={`flex items-center gap-1.5 px-3 min-h-[44px] rounded-full text-sm font-medium backdrop-blur-sm transition-colors ${
                        annotateMode ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/80 hover:text-white hover:bg-white/20'
                    }`}
                    aria-pressed={annotateMode}
                    aria-label="Toggle annotation mode"
                >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
                    </svg>
                    <span className="hidden sm:inline">{annotateMode ? t('property:imageViewer.annotate.done', 'Done') : t('property:imageViewer.annotate.label', 'Annotate')}</span>
                </button>

                {/* Close */}
                <button
                    type="button"
                    onClick={onClose}
                    className="ml-auto min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white/80 hover:text-white transition-colors"
                    aria-label={t('property:imageViewer.close', 'Close image viewer')}
                >
                    <XMarkIcon className="w-6 h-6"/>
                </button>
            </div>

            {/* ── Annotate toolbar ─────────────────────────────────────────── */}
            {annotateMode && (
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-neutral-900/80 backdrop-blur-sm z-20 border-t border-white/10 flex-wrap">
                    {/* Color swatches */}
                    <div className="flex items-center gap-1.5">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setDrawColor(c)}
                                className="rounded-full transition-transform focus:outline-none"
                                style={{
                                    width: drawColor === c ? 28 : 24,
                                    height: drawColor === c ? 28 : 24,
                                    backgroundColor: c,
                                    boxShadow: drawColor === c ? `0 0 0 3px rgba(255,255,255,0.9)` : `0 0 0 1px rgba(255,255,255,0.3)`,
                                    transform: drawColor === c ? 'scale(1.15)' : 'scale(1)',
                                }}
                                aria-label={`Color ${c}`}
                                aria-pressed={drawColor === c}
                            />
                        ))}
                    </div>

                    <div className="w-px h-6 bg-white/20 flex-shrink-0"/>

                    {/* Brush sizes */}
                    <div className="flex items-center gap-1">
                        {WIDTHS.map(w => (
                            <button
                                key={w}
                                type="button"
                                onClick={() => setDrawWidth(w)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${drawWidth === w ? 'bg-white/25' : 'hover:bg-white/10'}`}
                                aria-label={`Brush size ${w}`}
                                aria-pressed={drawWidth === w}
                            >
                                <div className="rounded-full bg-white" style={{ width: Math.min(w * 1.8, 18), height: Math.min(w * 1.8, 18) }}/>
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-white/20 flex-shrink-0"/>

                    {/* Undo */}
                    <button
                        type="button"
                        onClick={undo}
                        disabled={strokes.length === 0}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Undo last stroke"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/>
                        </svg>
                    </button>

                    {/* Clear */}
                    <button
                        type="button"
                        onClick={clearAnnotations}
                        disabled={strokes.length === 0}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Clear all annotations"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>

                    {/* Download + Send to Chat */}
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            type="button"
                            onClick={downloadAnnotated}
                            disabled={strokes.length === 0}
                            className="flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-semibold text-white bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Download annotated image"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            {t('property:imageViewer.annotate.save', 'Save')}
                        </button>
                        {propertyId && (
                            <button
                                type="button"
                                onClick={sendAnnotatedToChat}
                                disabled={strokes.length === 0 || isSendingToChat}
                                className="flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-semibold text-white bg-primary hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                aria-label="Send annotated image to chat"
                            >
                                {isSendingToChat ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
                                    </svg>
                                )}
                                {t('property:imageViewer.annotate.sendToChat', 'Send')}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Image area ───────────────────────────────────────────────── */}
            <div
                ref={imageAreaRef}
                className="relative flex-1 overflow-hidden"
                onTouchStart={annotateMode ? undefined : handleTouchStart}
                onTouchMove={annotateMode ? undefined : handleTouchMove}
                onTouchEnd={annotateMode ? undefined : handleTouchEnd}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ touchAction: isZoomed || annotateMode ? 'none' : 'pan-y' }}
            >
                {/* Blurred LQIP backdrop */}
                {!imageError && (
                    <img
                        src={optimizeCloudinaryUrl(images[currentIndex].url, { width: 40, quality: 'auto:eco' })}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-40 pointer-events-none select-none"
                    />
                )}

                {/* Zoom + pan wrapper */}
                <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: pinchStartDist.current > 0 || isMouseDraggingRef.current ? 'none' : 'transform 0.15s ease-out',
                        willChange: 'transform',
                        cursor: annotateMode ? 'crosshair' : isZoomed ? (isMouseDraggingRef.current ? 'grabbing' : 'grab') : 'zoom-in',
                    }}
                    onDoubleClick={annotateMode ? undefined : (isZoomed ? resetZoom : () => setZoom(2))}
                >
                    {imageError ? (
                        <div className="flex flex-col items-center justify-center text-white p-8">
                            <BuildingOfficeIcon className="w-20 h-20 text-neutral-500"/>
                            <p className="mt-4 text-sm font-medium text-white/70">{t('property:imageViewer.loadError', 'Image could not be loaded')}</p>
                        </div>
                    ) : (
                        <img
                            ref={imageElRef}
                            key={images[currentIndex].url}
                            src={optimizeCloudinaryUrl(images[currentIndex].url, { width: 1920, quality: 'auto' })}
                            srcSet={cloudinarySrcSet(images[currentIndex].url, [640, 1024, 1440, 1920])}
                            sizes="100vw"
                            alt={t('property:imageViewer.imageAlt', 'Property image {{current}} of {{total}}', { current: currentIndex + 1, total: images.length })}
                            width={1920}
                            height={1280}
                            loading="eager"
                            decoding="async"
                            draggable={false}
                            crossOrigin="anonymous"
                            className={`max-w-full max-h-full object-contain select-none transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            style={{ userSelect: 'none', pointerEvents: 'none' }}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                        />
                    )}
                </div>

                {/* Drawing canvas — only in annotate mode, NOT inside zoom wrapper so it covers full area */}
                {annotateMode && (
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full"
                        style={{ cursor: 'crosshair', touchAction: 'none' }}
                        onMouseDown={onDrawStart}
                        onMouseMove={onDrawMove}
                        onMouseUp={onDrawEnd}
                        onMouseLeave={onDrawEnd}
                        onTouchStart={onDrawStart}
                        onTouchMove={onDrawMove}
                        onTouchEnd={onDrawEnd}
                    />
                )}

                {/* Prev / Next — hidden when single image, zoomed, or annotating */}
                {images.length > 1 && !isZoomed && !annotateMode && (
                    <>
                        <button
                            type="button"
                            onClick={goPrev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 backdrop-blur-sm p-3 rounded-full hover:bg-black/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label={t('property:imageViewer.previous', 'Previous image')}
                        >
                            <ChevronLeftIcon className="w-6 h-6 text-white"/>
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 backdrop-blur-sm p-3 rounded-full hover:bg-black/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label={t('property:imageViewer.next', 'Next image')}
                        >
                            <ChevronRightIcon className="w-6 h-6 text-white"/>
                        </button>
                    </>
                )}

                {/* Annotate hint */}
                {annotateMode && strokes.length === 0 && !isDrawingRef.current && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white/70 text-xs px-4 py-2 rounded-full pointer-events-none">
                        {t('property:imageViewer.annotate.hint', 'Draw on the image to annotate')}
                    </div>
                )}
            </div>

            {/* ── Bottom bar ───────────────────────────────────────────────── */}
            <div
                className="flex-shrink-0 flex items-center justify-center z-20"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)', height: 'calc(env(safe-area-inset-bottom, 0px) + 3rem)' }}
            >
                {images.length > 1 && (
                    <div className="bg-black/50 backdrop-blur-sm text-white text-sm font-medium px-4 py-1.5 rounded-full" role="status" aria-live="polite">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
            </div>

            {/* AI Room Styler overlay */}
            {showStyler && currentUrl && (
                <Suspense fallback={null}>
                    <RoomStylerModal imageUrl={currentUrl} onClose={() => setShowStyler(false)} />
                </Suspense>
            )}
        </div>
    );
};

export default ImageViewerModal;
