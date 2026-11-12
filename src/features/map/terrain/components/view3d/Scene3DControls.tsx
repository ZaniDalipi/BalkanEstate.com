/** The bar along the bottom of the 3D window: what to show, (for the blocks) how tall, and the camera. */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Camera3D } from '../../hooks/useCamera3D';
import { EXAGGERATIONS, type Exaggeration, type Scene3D } from '../../utils/terrain3dScene';
import { CAPTION, GLASS } from '../terrainStyles';
import Camera3DControls from './Camera3DControls';
import SegmentedControl from './SegmentedControl';

export interface Scene3DControlsProps {
  scene: Scene3D;
  onScene: (scene: Scene3D) => void;
  /** Whether Google's realistic 3D can be offered. */
  realistic: boolean;
  /** Only the blocks can be stretched: the realistic view shows the real heights. */
  height?: { value: Exaggeration; onChange: (value: Exaggeration) => void };
  camera: Camera3D;
}

const Scene3DControls: React.FC<Scene3DControlsProps> = ({ scene, onScene, realistic, height, camera }) => {
  const { t } = useTranslation('search');
  const scenes = [
    ...(realistic
      ? [
          { value: 'slope' as const, text: t('terrain.view3d.slope', 'Slope') },
          { value: 'photo' as const, text: t('terrain.view3d.satellite', 'Satellite') },
        ]
      : []),
    { value: 'blocks' as const, text: t('terrain.view3d.blocks', 'Grid blocks') },
  ];
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-11 flex flex-col items-center gap-2 px-3 sm:bottom-12">
      <p className={`hidden rounded-full px-3 py-1 sm:block ${GLASS} ${CAPTION}`}>
        {t('terrain.view3d.hint', 'Drag to move · right-drag or two fingers to turn and tilt · scroll or pinch to zoom.')}
      </p>
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
        {scenes.length > 1 && <SegmentedControl<Scene3D> label={t('terrain.view3d.layer', 'Show')} options={scenes} value={scene} onChange={onScene} />}
        {height && (
          <SegmentedControl<Exaggeration>
            label={t('terrain.view3d.height', 'Height')}
            options={EXAGGERATIONS.map((n) => ({ value: n, text: `${n}×` }))}
            value={height.value}
            onChange={height.onChange}
          />
        )}
        <Camera3DControls camera={camera} />
      </div>
    </div>
  );
};

export default Scene3DControls;
