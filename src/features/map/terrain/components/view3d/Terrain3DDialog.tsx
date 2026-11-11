/**
 * The drawn area as a 3D model you can turn, tilt and fly around: by
 * default the slope grid itself, each cell raised as a tile as tall as the
 * ground under it; or the real surface with the slope colours draped on the
 * satellite relief. Heights can be stretched so gentle land shows its shape;
 * the footer says by how much.
 */
import React, { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import 'maplibre-gl/dist/maplibre-gl.css';
import { XCircleIcon } from '@/constants';
import { SoftIcon } from '@/src/shared/illustrations';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import { useCamera3D } from '../../hooks/useCamera3D';
import { useTerrain3DMap } from '../../hooks/useTerrain3DMap';
import type { TerrainAnalysis, TerrainPoint } from '../../types';
import { SLOPE_CLASSES, slopeRangeLabel } from '../../utils/slopeClasses';
import { EXAGGERATIONS, defaultExaggeration, type Exaggeration, type View3DMode } from '../../utils/terrain3dScene';
import Camera3DControls from './Camera3DControls';
import SegmentedControl from './SegmentedControl';

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
  const [mode, setMode] = useState<View3DMode>('blocks');
  useEscapeLayer(ref, onClose);
  const { status, map } = useTerrain3DMap(mapEl, {
    analysis,
    polygon,
    mode,
    exaggeration,
    reduceMotion,
    spotLabel: t('search:terrain.spot.marker', 'Best spot'),
  });
  const camera = useCamera3D(map, polygon, reduceMotion);
  const modes = [
    { value: 'blocks' as const, text: t('search:terrain.view3d.blocks', 'Grid blocks') },
    { value: 'surface' as const, text: t('search:terrain.view3d.surface', 'Real surface') },
  ];
  const heights = EXAGGERATIONS.map((n) => ({ value: n, text: `×${n}` }));

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/60 sm:p-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex flex-col w-full h-full sm:h-[min(82dvh,760px)] sm:max-w-5xl bg-white sm:rounded-2xl overflow-hidden shadow-2xl"
      >
        <header className="flex items-center gap-2 pl-4 pr-1 py-1 border-b border-gray-100">
          <SoftIcon name="cube" className="w-5 h-5 shrink-0" />
          <h2 id={titleId} className="flex-1 font-bold text-sm text-gray-800">
            {t('search:terrain.view3d.title', 'Terrain in 3D')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="flex items-center justify-center w-11 h-11 rounded-full text-gray-500 hover:bg-gray-100"
            aria-label={t('common:close', 'Close')}
          >
            <XCircleIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="relative flex-1 min-h-0 bg-[#dfe7d6]">
          {/* MapLibre makes its container position: relative, so it gets its own full-size box. */}
          <div className="absolute inset-0">
            <div ref={mapEl} className="w-full h-full" />
          </div>
          {status === 'loading' && (
            <div role="status" className="absolute inset-0 flex items-center justify-center gap-3 bg-white/60 text-sm text-gray-700">
              <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
              {t('search:terrain.view3d.loading', 'Loading 3D terrain…')}
            </div>
          )}
          {status === 'failed' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 bg-white text-center">
              <p role="alert" className="max-w-sm text-sm text-gray-700">
                {t('search:terrain.view3d.noWebgl', "This browser can't show 3D maps (WebGL is off or not supported). The slope map still works.")}
              </p>
              <button type="button" onClick={onClose} className="min-h-11 px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold">
                {t('search:terrain.view3d.back', 'Back to the slope map')}
              </button>
            </div>
          )}
          {status === 'ready' && (
            <>
              <div className="absolute left-3 top-3 right-14 flex flex-wrap gap-2">
                <SegmentedControl<View3DMode> label={t('search:terrain.view3d.view', 'View')} options={modes} value={mode} onChange={setMode} />
                <SegmentedControl<Exaggeration> label={t('search:terrain.view3d.height', 'Height')} options={heights} value={exaggeration} onChange={setExaggeration} />
              </div>
              <div className="absolute left-1/2 bottom-12 -translate-x-1/2">
                <Camera3DControls camera={camera} />
              </div>
            </>
          )}
        </div>

        <footer className="px-4 py-2 space-y-1.5 border-t border-gray-100 text-[11px] text-gray-500">
          <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-hidden="true">
            {SLOPE_CLASSES.map((c) => (
              <li key={c.id} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                {slopeRangeLabel(c)}
              </li>
            ))}
          </ul>
          <p>
            {exaggeration === 1
              ? t('search:terrain.view3d.trueScale', 'Heights are shown true to scale.')
              : t('search:terrain.view3d.exaggerated', 'Heights are stretched ×{{n}} so the shape of the land is easier to see.', { n: exaggeration })}
            {' '}
            {t('search:terrain.view3d.hint', 'Drag to move · right-drag or two fingers to turn and tilt · scroll or pinch to zoom.')}
          </p>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default Terrain3DDialog;
