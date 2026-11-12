/** The grid of raised blocks (MapLibre), with its controls. */
import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCamera3D } from '../../hooks/useCamera3D';
import { useTerrain3DMap } from '../../hooks/useTerrain3DMap';
import type { TerrainAnalysis, TerrainPoint } from '../../types';
import { openingBearing, type Exaggeration, type Scene3D } from '../../utils/terrain3dScene';
import Scene3DControls from './Scene3DControls';
import { SceneFailed, SceneLoading } from './SceneStatus';

export interface BlocksSceneProps {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
  exaggeration: Exaggeration;
  onExaggeration: (value: Exaggeration) => void;
  onScene: (scene: Scene3D) => void;
  realistic: boolean;
  reduceMotion: boolean;
  onClose: () => void;
}

const BlocksScene: React.FC<BlocksSceneProps> = ({ analysis, polygon, exaggeration, onExaggeration, onScene, realistic, reduceMotion, onClose }) => {
  const { t } = useTranslation('search');
  const mapEl = useRef<HTMLDivElement>(null);
  const { status, map } = useTerrain3DMap(mapEl, {
    analysis,
    polygon,
    view: 'blocks',
    exaggeration,
    reduceMotion,
    spotLabel: t('terrain.spot.marker', 'Best spot'),
  });
  const startBearing = useMemo(() => openingBearing(analysis), [analysis]);
  const camera = useCamera3D(map, polygon, startBearing, reduceMotion);

  return (
    <>
      {/* MapLibre makes its container position: relative, so it gets its own full-size box. */}
      <div className="absolute inset-0">
        <div ref={mapEl} className="h-full w-full" />
      </div>
      {status === 'loading' && <SceneLoading />}
      {status === 'failed' && <SceneFailed onClose={onClose} />}
      {status === 'ready' && (
        <Scene3DControls
          scene="blocks"
          onScene={onScene}
          realistic={realistic}
          height={{ value: exaggeration, onChange: onExaggeration }}
          camera={camera}
        />
      )}
    </>
  );
};

export default BlocksScene;
