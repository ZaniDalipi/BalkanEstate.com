/**
 * Google's photorealistic 3D: the real buildings, trees and hills, with the
 * slope zones on the ground (or not) and the house at the best spot. Tells
 * the dialog when it can't be shown, so it can switch to the blocks.
 */
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGoogle3DMap } from '../../hooks/useGoogle3DMap';
import type { TerrainAnalysis, TerrainPoint } from '../../types';
import type { Scene3D } from '../../utils/terrain3dScene';
import Scene3DControls from './Scene3DControls';
import { SceneLoading } from './SceneStatus';

export interface RealisticSceneProps {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
  scene: Exclude<Scene3D, 'blocks'>;
  onScene: (scene: Scene3D) => void;
  onUnavailable: () => void;
  reduceMotion: boolean;
}

const RealisticScene: React.FC<RealisticSceneProps> = ({ analysis, polygon, scene, onScene, onUnavailable, reduceMotion }) => {
  const { t } = useTranslation('search');
  const host = useRef<HTMLDivElement>(null);
  const { status, camera } = useGoogle3DMap(host, {
    analysis,
    polygon,
    showZones: scene === 'slope',
    spotLabel: t('terrain.spot.marker', 'Best spot'),
    reduceMotion,
  });
  const unavailable = useRef(onUnavailable);
  unavailable.current = onUnavailable;
  useEffect(() => {
    if (status === 'unavailable') unavailable.current();
  }, [status]);

  return (
    <>
      <div ref={host} className="absolute inset-0" />
      {status === 'loading' && <SceneLoading />}
      {status === 'ready' && <Scene3DControls scene={scene} onScene={onScene} realistic camera={camera} />}
    </>
  );
};

export default RealisticScene;
