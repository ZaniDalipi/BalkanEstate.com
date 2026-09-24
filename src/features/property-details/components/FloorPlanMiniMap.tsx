import React, { useState } from 'react';
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

/**
 * The floor plan card beside the photo in the Photos tab (Zillow style):
 * a green square for every placed photo, the one on screen in red with its
 * view cone, and a zoom slider. Tapping a square jumps to that photo.
 *
 * The plan is fitted into whatever height the card gets using container
 * query units, so the sidebar never scrolls.
 */
const FloorPlanMiniMap: React.FC<FloorPlanMiniMapProps> = ({ planUrl, label, floor, photos, activeIndex, onSelect, onExpand }) => {
    const { t } = useTranslation(['property']);
    const [zoom, setZoom] = useState(1);
    // While the slider is being dragged the plan follows it frame by frame;
    // otherwise (buttons, photo changes) changes glide.
    const [sliding, setSliding] = useState(false);
    const glide = sliding ? 'none' : `transform ${ZOOM_EASE}, transform-origin ${ZOOM_EASE}`;
    const zoomPct = ((zoom - 1) / (MAX_ZOOM - 1)) * 100;
    const [ratio, setRatio] = useState(4 / 3);
    const activeSpot = photos[activeIndex]?.floorplanSpot;
    const active = activeSpot && spotFloor(activeSpot) === floor ? activeSpot : undefined;
    // Zoom about the photo on screen, so its square stays in view.
    const origin = active ? `${active.x}% ${active.y}%` : '50% 50%';

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
                    className="relative mx-auto overflow-hidden rounded-md bg-white shadow-inner"
                    style={{ width: `min(100cqw, 100cqh * ${ratio})`, aspectRatio: String(ratio) }}
                >
                    <div
                        className="absolute inset-0"
                        style={{ transform: `scale(${zoom})`, transformOrigin: origin, transition: glide, willChange: 'transform' }}
                    >
                        <img
                            src={optimizeCloudinaryUrl(planUrl, { width: 800, quality: 'auto' }) || planUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-contain select-none"
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
                                    className="absolute w-5 h-5 -ml-2.5 -mt-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm"
                                    style={{
                                        left: `${spot.x}%`,
                                        top: `${spot.y}%`,
                                        transform: `scale(${1 / zoom})`,
                                        transition: sliding ? 'none' : `transform ${ZOOM_EASE}`,
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

            {/* Zoom slider */}
            <div className="flex-shrink-0 flex items-center justify-center gap-3 h-10 px-3 bg-black/80 text-white">
                <button
                    type="button"
                    onClick={() => setZoom(z => Math.max(1, Math.round((z - 0.5) * 2) / 2))}
                    disabled={zoom <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 transition"
                    aria-label={t('property:floorPlan.viewer.zoomOut', 'Zoom out')}
                >
                    <MagnifyingGlassMinusIcon className="w-4 h-4" />
                </button>
                <input
                    type="range"
                    min={1}
                    max={MAX_ZOOM}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    onPointerDown={() => setSliding(true)}
                    onPointerUp={() => setSliding(false)}
                    onPointerCancel={() => setSliding(false)}
                    onBlur={() => setSliding(false)}
                    className="flex-1 max-w-[180px] h-1.5 rounded-full appearance-none cursor-pointer touch-none focus:outline-none
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform active:[&::-webkit-slider-thumb]:scale-110
                        [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md
                        focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-blue-400"
                    style={{ background: `linear-gradient(to right, #ffffff ${zoomPct}%, rgba(255,255,255,0.25) ${zoomPct}%)` }}
                    aria-label={t('property:floorPlan.viewer.zoomLevel', 'Zoom level')}
                />
                <button
                    type="button"
                    onClick={() => setZoom(z => Math.min(MAX_ZOOM, Math.round((z + 0.5) * 2) / 2))}
                    disabled={zoom >= MAX_ZOOM}
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
