/** The plot on Google's photorealistic 3D map, with the slope colours and the marks of its fall on it, and the controls. */
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGoogle3DMap } from '../../hooks/useGoogle3DMap';
import type { PlotSurface } from '../../hooks/usePlotModel';
import type { TerrainAnalysis, TerrainPoint } from '../../types';
import type { SlopeFall } from '../../utils/slopeFall';
import Scene3DControls from './Scene3DControls';
import { SceneLoading } from './SceneStatus';

export interface GoogleTerrainSceneProps {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
  fall: SlopeFall | null;
  surface: PlotSurface;
  onSurface: (surface: PlotSurface) => void;
  reduceMotion: boolean;
  /** Google's 3D map can't be shown here: the dialog switches to its own model. */
  onUnavailable: () => void;
}

const noop = () => {};

const GoogleTerrainScene: React.FC<GoogleTerrainSceneProps> = ({ analysis, polygon, fall, surface, onSurface, reduceMotion, onUnavailable }) => {
  const { t } = useTranslation('search');
  const host = useRef<HTMLDivElement>(null);
  const labels = {
    spot: t('terrain.spot.marker', 'Best spot'),
    high: fall ? t('terrain.view3d.highest', 'Highest · {{m}} m', { m: Math.round(fall.high.elevation) }) : '',
    low: fall ? t('terrain.view3d.lowest', 'Lowest · {{m}} m', { m: Math.round(fall.low.elevation) }) : '',
  };
  const { status, camera } = useGoogle3DMap(host, { analysis, polygon, fall, surface, labels, reduceMotion });
  const unavailable = useRef(onUnavailable);
  unavailable.current = onUnavailable;

  useEffect(() => {
    if (status === 'failed') unavailable.current();
  }, [status]);

  return (
    <>
      <div ref={host} className="absolute inset-0 touch-none" />
      {status !== 'ready' && <SceneLoading />}
      {status === 'ready' && (
        <Scene3DControls
          surface={surface}
          onSurface={onSurface}
          satellite
          buildings={null}
          onBuildings={noop}
          exaggeration={null}
          onExaggeration={noop}
          camera={camera}
        />
      )}
    </>
  );
};

export default GoogleTerrainScene;
