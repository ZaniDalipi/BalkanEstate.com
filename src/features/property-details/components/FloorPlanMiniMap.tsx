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
    const [ratio, setRatio] = useState(4 / 3);
    const activeSpot = photos[activeIndex]?.floorplanSpot;
    const active = activeSpot && spotFloor(activeSpot) === floor ? activeSpot : undefined;
    // Zoom about the photo on screen, so its square stays in view.
    const origin = active ? `${active.x}% ${active.y}%` : '50% 50%';

    return (
        <section className="flex flex-col min-h-0 flex-1 rounded-lg bg-[#3b3f46] overflow-hidden">
            <header className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
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
            <div className="relative flex-1 min-h-[120px] px-3 pb-3" style={{ containerType: 'size' }}>
                <div
                    className="relative mx-auto overflow-hidden rounded bg-white"
                    style={{ width: `min(100cqw, 100cqh * ${ratio})`, aspectRatio: String(ratio) }}
                >
                    <div
                        className="absolute inset-0"
                        style={{ transform: `scale(${zoom})`, transformOrigin: origin, transition: 'transform 0.25s ease-out, transform-origin 0.25s ease-out' }}
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
                                        zIndex: isActive ? 2 : 1,
                                    }}
                                    aria-label={t('property:floorPlan.viewer.showPhoto', 'Show photo {{n}}', { n: i + 1 })}
                                    aria-pressed={isActive}
                                >
                                    <span className="absolute left-1/2 top-1/2 pointer-events-none">
                                        <PhotoSpotSquare angle={spot.angle} active={isActive} size={isActive ? 12 : 10} coneLength={42} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Zoom slider */}
            <div className="flex-shrink-0 flex items-center justify-center gap-3 h-9 bg-black/80 text-white">
                <button
                    type="button"
                    onClick={() => setZoom(z => Math.max(1, z - 0.5))}
                    className="w-6 h-6 flex items-center justify-center text-white/80 hover:text-white"
                    aria-label={t('property:floorPlan.viewer.zoomOut', 'Zoom out')}
                >
                    <MagnifyingGlassMinusIcon className="w-4 h-4" />
                </button>
                <input
                    type="range"
                    min={1}
                    max={MAX_ZOOM}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-32 h-1 accent-white cursor-pointer"
                    aria-label={t('property:floorPlan.viewer.zoomLevel', 'Zoom level')}
                />
                <button
                    type="button"
                    onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.5))}
                    className="w-6 h-6 flex items-center justify-center text-white/80 hover:text-white"
                    aria-label={t('property:floorPlan.viewer.zoomIn', 'Zoom in')}
                >
                    <MagnifyingGlassPlusIcon className="w-4 h-4" />
                </button>
            </div>
        </section>
    );
};

export default FloorPlanMiniMap;
