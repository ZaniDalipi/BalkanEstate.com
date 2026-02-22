import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XMarkIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowPathIcon } from '@/constants';

interface FloorPlanViewerModalProps {
    imageUrl: string;
    onClose: () => void;
}

interface Annotation {
    id: string;
    x: number; // percentage of image width
    y: number; // percentage of image height
    label: string;
}

type InteractionMode = 'pan' | 'annotate';

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5, 8];

const FloorPlanViewerModal: React.FC<FloorPlanViewerModalProps> = ({ imageUrl, onClose }) => {
    // Transform state
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // Image state
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

    // Interaction mode
    const [mode, setMode] = useState<InteractionMode>('pan');
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);

    // Touch state
    const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
    const [touchStartScale, setTouchStartScale] = useState(1);
    const [touchStartCenter, setTouchStartCenter] = useState({ x: 0, y: 0 });
    const lastTapRef = useRef(0);

    // Refs
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const annotationInputRef = useRef<HTMLInputElement>(null);

    // Fit image to container on load
    const fitToScreen = useCallback(() => {
        if (!imageContainerRef.current || imageDimensions.width === 0) return;
        const container = imageContainerRef.current;
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        const scaleX = containerW / imageDimensions.width;
        const scaleY = containerH / imageDimensions.height;
        const fitScale = Math.min(scaleX, scaleY, 1) * 0.9;
        const centerX = (containerW - imageDimensions.width * fitScale) / 2;
        const centerY = (containerH - imageDimensions.height * fitScale) / 2;
        setTransform({ scale: fitScale, x: centerX, y: centerY });
    }, [imageDimensions]);

    const resetTransform = useCallback(() => {
        fitToScreen();
    }, [fitToScreen]);

    useEffect(() => {
        if (!isLoading && imageDimensions.width > 0) {
            fitToScreen();
        }
    }, [isLoading, imageDimensions, fitToScreen]);

    // Zoom with pivot point
    const zoom = useCallback((direction: 'in' | 'out', clientX?: number, clientY?: number) => {
        setTransform(prev => {
            const scaleFactor = 1.3;
            const newScale = direction === 'in'
                ? prev.scale * scaleFactor
                : prev.scale / scaleFactor;

            if (newScale < 0.1 || newScale > 15) return prev;

            const container = imageContainerRef.current;
            if (!container) return prev;

            const rect = container.getBoundingClientRect();
            const pivotX = clientX !== undefined ? clientX - rect.left : rect.width / 2;
            const pivotY = clientY !== undefined ? clientY - rect.top : rect.height / 2;

            const newX = pivotX - (pivotX - prev.x) * (newScale / prev.scale);
            const newY = pivotY - (pivotY - prev.y) * (newScale / prev.scale);

            return { scale: newScale, x: newX, y: newY };
        });
    }, []);

    // Zoom to specific level
    const zoomToLevel = useCallback((level: number) => {
        setTransform(prev => {
            const container = imageContainerRef.current;
            if (!container) return prev;

            const rect = container.getBoundingClientRect();
            const pivotX = rect.width / 2;
            const pivotY = rect.height / 2;

            const newX = pivotX - (pivotX - prev.x) * (level / prev.scale);
            const newY = pivotY - (pivotY - prev.y) * (level / prev.scale);

            return { scale: level, x: newX, y: newY };
        });
    }, []);

    // Mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        zoom(e.deltaY < 0 ? 'in' : 'out', e.clientX, e.clientY);
    }, [zoom]);

    // Mouse pan
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;

        if (mode === 'annotate') {
            // Prevent browser default focus behavior — without this, the browser
            // steals focus from the annotation input on the subsequent click event,
            // triggering onBlur which removes the empty-label annotation instantly.
            e.preventDefault();
            e.stopPropagation();

            // Add annotation at clicked position
            const container = imageContainerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const imgX = ((e.clientX - rect.left - transform.x) / transform.scale / imageDimensions.width) * 100;
            const imgY = ((e.clientY - rect.top - transform.y) / transform.scale / imageDimensions.height) * 100;

            if (imgX >= 0 && imgX <= 100 && imgY >= 0 && imgY <= 100) {
                const newId = `ann-${Date.now()}`;
                setAnnotations(prev => [...prev, { id: newId, x: imgX, y: imgY, label: '' }]);
                setEditingAnnotation(newId);
            }
            return;
        }

        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }, [mode, transform, imageDimensions]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning) return;
        e.preventDefault();
        setTransform(prev => ({
            ...prev,
            x: e.clientX - panStart.x,
            y: e.clientY - panStart.y,
        }));
    }, [isPanning, panStart]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Touch handlers for mobile pinch-to-zoom and pan
    const getTouchDistance = (touches: React.TouchList) => {
        if (touches.length < 2) return 0;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touches: React.TouchList) => {
        if (touches.length < 2) {
            return { x: touches[0].clientX, y: touches[0].clientY };
        }
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
        };
    };

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();

        if (e.touches.length === 1) {
            // In annotate mode, single tap creates an annotation
            if (mode === 'annotate') {
                const container = imageContainerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const touch = e.touches[0];
                const imgX = ((touch.clientX - rect.left - transform.x) / transform.scale / imageDimensions.width) * 100;
                const imgY = ((touch.clientY - rect.top - transform.y) / transform.scale / imageDimensions.height) * 100;

                if (imgX >= 0 && imgX <= 100 && imgY >= 0 && imgY <= 100) {
                    const newId = `ann-${Date.now()}`;
                    setAnnotations(prev => [...prev, { id: newId, x: imgX, y: imgY, label: '' }]);
                    setEditingAnnotation(newId);
                }
                return;
            }

            // Double-tap detection
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
                // Double tap - toggle zoom
                const container = imageContainerRef.current;
                if (container) {
                    const nextScale = transform.scale < 2 ? 3 : 1;
                    const rect = container.getBoundingClientRect();
                    const pivotX = e.touches[0].clientX - rect.left;
                    const pivotY = e.touches[0].clientY - rect.top;
                    const newX = pivotX - (pivotX - transform.x) * (nextScale / transform.scale);
                    const newY = pivotY - (pivotY - transform.y) * (nextScale / transform.scale);
                    setTransform({ scale: nextScale, x: newX, y: newY });
                }
                lastTapRef.current = 0;
                return;
            }
            lastTapRef.current = now;

            // Single finger pan
            setIsPanning(true);
            setPanStart({ x: e.touches[0].clientX - transform.x, y: e.touches[0].clientY - transform.y });
        } else if (e.touches.length === 2) {
            // Pinch zoom
            setIsPanning(false);
            const dist = getTouchDistance(e.touches);
            setTouchStartDistance(dist);
            setTouchStartScale(transform.scale);
            setTouchStartCenter(getTouchCenter(e.touches));
        }
    }, [mode, transform, imageDimensions]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();

        if (e.touches.length === 1 && isPanning) {
            setTransform(prev => ({
                ...prev,
                x: e.touches[0].clientX - panStart.x,
                y: e.touches[0].clientY - panStart.y,
            }));
        } else if (e.touches.length === 2 && touchStartDistance !== null) {
            const currentDist = getTouchDistance(e.touches);
            const currentCenter = getTouchCenter(e.touches);
            const scaleDelta = currentDist / touchStartDistance;
            const newScale = Math.min(Math.max(touchStartScale * scaleDelta, 0.1), 15);

            const container = imageContainerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const pivotX = touchStartCenter.x - rect.left;
            const pivotY = touchStartCenter.y - rect.top;

            // Calculate new position with both scale and pan applied
            const dx = currentCenter.x - touchStartCenter.x;
            const dy = currentCenter.y - touchStartCenter.y;

            const baseX = pivotX - (pivotX - transform.x) * (newScale / transform.scale);
            const baseY = pivotY - (pivotY - transform.y) * (newScale / transform.scale);

            setTransform({ scale: newScale, x: baseX + dx, y: baseY + dy });
        }
    }, [isPanning, panStart, touchStartDistance, touchStartScale, touchStartCenter, transform]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (e.touches.length < 2) {
            setTouchStartDistance(null);
        }
        if (e.touches.length === 0) {
            setIsPanning(false);
        }
    }, []);

    // Double-click zoom (desktop)
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        if (mode === 'annotate') return;
        const nextScale = transform.scale < 2 ? 3 : 1;
        const container = imageContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const pivotX = e.clientX - rect.left;
        const pivotY = e.clientY - rect.top;
        const newX = pivotX - (pivotX - transform.x) * (nextScale / transform.scale);
        const newY = pivotY - (pivotY - transform.y) * (nextScale / transform.scale);
        setTransform({ scale: nextScale, x: newX, y: newY });
    }, [transform, mode]);

    // Annotation handlers
    const handleAnnotationLabelChange = useCallback((id: string, label: string) => {
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
    }, [editingAnnotation]);

    // Keyboard handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    if (editingAnnotation) {
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
    }, [onClose, zoom, resetTransform, mode, editingAnnotation, handleAnnotationLabelSubmit]);

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
    const zoomPercent = Math.round(transform.scale * 100);

    // Find closest zoom preset index for the slider
    const closestZoomIndex = ZOOM_LEVELS.reduce((closest, level, i) =>
        Math.abs(level - transform.scale) < Math.abs(ZOOM_LEVELS[closest] - transform.scale) ? i : closest
    , 0);

    return (
        <div
            className="fixed inset-0 bg-black/90 z-[6000] flex flex-col"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label="Floor plan viewer"
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
                            aria-label="Pan mode"
                            title="Pan & Zoom (drag to move, scroll to zoom)"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                            </svg>
                            <span className="hidden sm:inline">Pan</span>
                        </button>
                        <button
                            onClick={() => setMode('annotate')}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                                mode === 'annotate'
                                    ? 'bg-amber-500/30 text-amber-300'
                                    : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                            aria-label="Annotate mode"
                            title="Click on the floor plan to add room labels"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                            </svg>
                            <span className="hidden sm:inline">Label</span>
                        </button>
                    </div>

                    {/* Annotation count badge */}
                    {annotations.length > 0 && (
                        <button
                            onClick={() => setAnnotations([])}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg backdrop-blur-md text-xs font-medium transition-colors border border-red-500/20"
                            title="Clear all labels"
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
                            aria-label="Zoom out"
                        >
                            <MagnifyingGlassMinusIcon className="w-5 h-5" />
                        </button>

                        {/* Zoom level indicator */}
                        <button
                            onClick={resetTransform}
                            className="px-2 py-1 text-xs sm:text-sm font-mono text-white/80 hover:text-white hover:bg-white/10 rounded-md min-w-[3.5rem] text-center transition-colors"
                            title="Click to fit to screen"
                        >
                            {zoomPercent}%
                        </button>

                        <button
                            onClick={() => zoom('in')}
                            className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                            aria-label="Zoom in"
                        >
                            <MagnifyingGlassPlusIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Reset button */}
                    <button
                        onClick={resetTransform}
                        className="p-1.5 sm:p-2 bg-neutral-800/80 text-white/70 hover:text-white hover:bg-white/10 rounded-lg backdrop-blur-md transition-colors border border-white/10"
                        aria-label="Fit to screen"
                        title="Fit to screen (0)"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                    </button>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="p-1.5 sm:p-2 bg-neutral-800/80 text-white/70 hover:text-white hover:bg-red-500/40 rounded-lg backdrop-blur-md transition-colors border border-white/10"
                        aria-label="Close floor plan viewer"
                        title="Close (Esc)"
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
                        Click anywhere on the floor plan to add a room label
                    </div>
                </div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                        <span className="text-white/70 text-sm">Loading floor plan...</span>
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
                            <h3 className="text-white font-semibold text-lg mb-1">Failed to Load Floor Plan</h3>
                            <p className="text-white/60 text-sm">The floor plan image could not be loaded. It may have been moved or deleted.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setHasError(false); setIsLoading(true); }}
                                className="px-4 py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors"
                            >
                                Retry
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-red-500/20 text-red-300 text-sm rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                                Close
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
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'none' }}
            >
                <div
                    className="origin-top-left"
                    style={{
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        transition: isPanning || touchStartDistance !== null ? 'none' : 'transform 0.15s ease-out',
                        willChange: 'transform',
                    }}
                >
                    <div
                        className="relative"
                        style={{
                            width: imageDimensions.width || 'auto',
                            height: imageDimensions.height || 'auto',
                            boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.5), 0 10px 20px -5px rgba(0, 0, 0, 0.3)',
                            borderRadius: '4px',
                        }}
                    >
                        <img
                            ref={imageRef}
                            src={imageUrl}
                            alt="Floor Plan"
                            className={`block select-none ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                            style={{
                                imageRendering: transform.scale > 2 ? 'pixelated' : 'auto',
                                maxWidth: 'none',
                                borderRadius: '4px',
                            }}
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                            onDragStart={(e) => e.preventDefault()}
                        />

                        {/* Annotations layer */}
                        {annotations.map(ann => (
                            <div
                                key={ann.id}
                                className="absolute"
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                style={{
                                    left: `${ann.x}%`,
                                    top: `${ann.y}%`,
                                    transform: `translate(-50%, -50%) scale(${1 / transform.scale})`,
                                    transformOrigin: 'center',
                                    pointerEvents: 'auto',
                                }}
                            >
                                {/* Pin - always visible */}
                                <div className="group relative">
                                    <div className={`w-5 h-5 bg-amber-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${editingAnnotation === ann.id ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-transparent' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); setEditingAnnotation(ann.id); }}
                                    >
                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                    </div>

                                    {/* Editing input */}
                                    {editingAnnotation === ann.id && (
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap z-10">
                                            <input
                                                ref={annotationInputRef}
                                                type="text"
                                                value={ann.label}
                                                onChange={(e) => handleAnnotationLabelChange(ann.id, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleAnnotationLabelSubmit(ann.id, true);
                                                    if (e.key === 'Escape') { removeAnnotation(ann.id); }
                                                }}
                                                onBlur={() => handleAnnotationLabelSubmit(ann.id, false)}
                                                placeholder="Room name..."
                                                className="px-2 py-1 text-xs bg-white text-neutral-800 rounded-md border-2 border-amber-400 outline-none shadow-lg min-w-[100px]"
                                                autoFocus
                                            />
                                        </div>
                                    )}

                                    {/* Label tooltip */}
                                    {editingAnnotation !== ann.id && ann.label && (
                                        <div
                                            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap"
                                            onClick={(e) => { e.stopPropagation(); setEditingAnnotation(ann.id); }}
                                        >
                                            <div className="relative px-2.5 py-1 bg-amber-500 text-white text-xs font-semibold rounded-md shadow-lg cursor-pointer hover:bg-amber-600 transition-colors">
                                                {ann.label}
                                                {/* Triangle pointer */}
                                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-500" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Remove button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        aria-label="Remove label"
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom zoom slider */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-neutral-800/80 rounded-xl backdrop-blur-md border border-white/10">
                    <button
                        onClick={() => zoom('out')}
                        className="text-white/60 hover:text-white transition-colors"
                        aria-label="Zoom out"
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
                        aria-label="Zoom level"
                    />
                    <button
                        onClick={() => zoom('in')}
                        className="text-white/60 hover:text-white transition-colors"
                        aria-label="Zoom in"
                    >
                        <MagnifyingGlassPlusIcon className="w-4 h-4" />
                    </button>
                    <span className="text-white/50 text-xs font-mono min-w-[3rem] text-center">{zoomPercent}%</span>
                </div>
            </div>

            {/* Keyboard shortcuts hint - hidden on mobile */}
            <div className="absolute bottom-4 right-4 z-20 hidden lg:block pointer-events-none">
                <div className="text-white/30 text-[10px] space-y-0.5">
                    <div>Scroll: Zoom | Drag: Pan | Double-click: Quick zoom</div>
                    <div>+/-: Zoom | 0: Reset | Esc: Close</div>
                    {mode === 'annotate' && <div>Click: Add label | Esc: Exit label mode</div>}
                </div>
            </div>
        </div>
    );
};

export default FloorPlanViewerModal;
