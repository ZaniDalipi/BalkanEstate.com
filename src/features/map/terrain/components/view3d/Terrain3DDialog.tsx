/**
 * The drawn area as a 3D model to turn, tilt and fly around: the real
 * relief with the slope colours (or just the satellite photo) on it, and a
 * house at the best place to build. Heights can be stretched so gentle land
 * shows its shape; the info card says by how much.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import { useCamera3D } from '../../hooks/useCamera3D';
import { useTerrain3DMap } from '../../hooks/useTerrain3DMap';
import type { TerrainAnalysis, TerrainPoint } from '../../types';
import { EXAGGERATIONS, defaultExaggeration, openingBearing, type Exaggeration, type Overlay3D } from '../../utils/terrain3dScene';
import { CAPTION, GLASS, PRIMARY_BUTTON } from '../terrainStyles';
import Camera3DControls from './Camera3DControls';
import SegmentedControl from './SegmentedControl';
import Terrain3DInfo from './Terrain3DInfo';

export interface Terrain3DDialogProps {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
  onClose: () => void;
}

const Terrain3DDialog: React.FC<Terrain3DDialogProps> = ({ analysis, polygon, onClose }) => {
  const { t } = useTranslation(['search', 'common']);
  const ref = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reduceMotion = useReducedMotion() ?? false;
  const [exaggeration, setExaggeration] = useState<Exaggeration>(() => defaultExaggeration(analysis.stats));
  const [overlay, setOverlay] = useState<Overlay3D>('slope');
  useEscapeLayer(ref, onClose);
  useEffect(() => { ref.current?.focus(); }, []);
  const { status, map } = useTerrain3DMap(mapEl, {
    analysis,
    polygon,
    overlay,
    exaggeration,
    reduceMotion,
    spotLabel: t('search:terrain.spot.marker', 'Best spot'),
  });
  const startBearing = useMemo(() => openingBearing(analysis), [analysis]);
  const camera = useCamera3D(map, polygon, startBearing, reduceMotion);
  const overlays = [
    { value: 'slope' as const, text: t('search:terrain.view3d.slope', 'Slope') },
    { value: 'satellite' as const, text: t('search:terrain.view3d.satellite', 'Satellite') },
  ];
  const heights = EXAGGERATIONS.map((n) => ({ value: n, text: `${n}×` }));

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/45 backdrop-blur-sm sm:p-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Focus lands on the dialog itself: inside it for the keyboard, with no ring drawn on a button nobody chose.
        tabIndex={-1}
        className="relative h-full w-full overflow-hidden bg-[#e7eae4] shadow-2xl outline-none sm:h-[min(86dvh,820px)] sm:max-w-6xl sm:rounded-[28px] sm:ring-1 sm:ring-black/10"
      >
        {/* MapLibre makes its container position: relative, so it gets its own full-size box. */}
        <div className="absolute inset-0">
          <div ref={mapEl} className="h-full w-full" />
        </div>

        <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
          <Terrain3DInfo titleId={titleId} analysis={analysis} overlay={overlay} exaggeration={exaggeration} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common:close', 'Close')}
          className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-gray-800 transition hover:bg-white sm:right-4 sm:top-4 ${GLASS}`}
        >
          <X aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
        </button>

        {status === 'loading' && (
          <div role="status" className="absolute inset-0 flex items-center justify-center bg-[#e7eae4]">
            <span className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-[13px] font-medium text-gray-700 ${GLASS}`}>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 motion-reduce:animate-none" />
              {t('search:terrain.view3d.loading', 'Loading 3D terrain…')}
            </span>
          </div>
        )}
        {status === 'failed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white p-6 text-center">
            <p role="alert" className="max-w-sm text-[15px] leading-relaxed text-gray-700">
              {t('search:terrain.view3d.noWebgl', "This browser can't show 3D maps (WebGL is off or not supported). The slope map still works.")}
            </p>
            <button type="button" onClick={onClose} className={`${PRIMARY_BUTTON} !w-auto`}>
              {t('search:terrain.view3d.back', 'Back to the slope map')}
            </button>
          </div>
        )}
        {status === 'ready' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-11 flex flex-col items-center gap-2 px-3 sm:bottom-12">
            <p className={`hidden rounded-full px-3 py-1 sm:block ${GLASS} ${CAPTION}`}>
              {t('search:terrain.view3d.hint', 'Drag to move · right-drag or two fingers to turn and tilt · scroll or pinch to zoom.')}
            </p>
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
              <SegmentedControl<Overlay3D> label={t('search:terrain.view3d.layer', 'Show')} options={overlays} value={overlay} onChange={setOverlay} />
              <SegmentedControl<Exaggeration> label={t('search:terrain.view3d.height', 'Height')} options={heights} value={exaggeration} onChange={setExaggeration} />
              <Camera3DControls camera={camera} />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Terrain3DDialog;
