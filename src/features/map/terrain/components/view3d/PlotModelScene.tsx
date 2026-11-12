/** The plot as a 3D table model (three.js), with the "Best spot" label over the house and the controls. */
import React, { useRef } from 'react';
import { House } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlotModel, type PlotSurface } from '../../hooks/usePlotModel';
import type { TerrainAnalysis, TerrainPoint } from '../../types';
import type { Exaggeration } from '../../utils/terrain3dScene';
import Scene3DControls from './Scene3DControls';
import { SceneFailed, SceneLoading } from './SceneStatus';

export interface PlotModelSceneProps {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
  surface: PlotSurface;
  onSurface: (surface: PlotSurface) => void;
  exaggeration: Exaggeration;
  onExaggeration: (value: Exaggeration) => void;
  reduceMotion: boolean;
  onClose: () => void;
}

const PlotModelScene: React.FC<PlotModelSceneProps> = ({ analysis, polygon, surface, onSurface, exaggeration, onExaggeration, reduceMotion, onClose }) => {
  const { t } = useTranslation('search');
  const host = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const { status, satelliteReady, camera } = usePlotModel(host, label, { analysis, polygon, surface, exaggeration, reduceMotion });

  return (
    <>
      {/* The model sits on a soft studio backdrop. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,#ffffff_0%,#eef0f3_45%,#d9dce2_100%)]" />
      <div ref={host} className="absolute inset-0 touch-none" />
      {analysis.buildSpot && status === 'ready' && (
        <div ref={label} className="pointer-events-none absolute left-0 top-0 flex flex-col items-center opacity-0 will-change-transform">
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-xs font-semibold tracking-tight text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.2)] backdrop-blur-md">
            <House aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.4} />
            {t('terrain.spot.marker', 'Best spot')}
          </span>
          <span className="h-4 w-px bg-gray-900/40" />
        </div>
      )}
      {status === 'loading' && <SceneLoading />}
      {status === 'failed' && <SceneFailed onClose={onClose} />}
      {status === 'ready' && (
        <Scene3DControls
          surface={surface}
          onSurface={onSurface}
          satellite={satelliteReady}
          exaggeration={exaggeration}
          onExaggeration={onExaggeration}
          camera={camera}
        />
      )}
    </>
  );
};

export default PlotModelScene;
