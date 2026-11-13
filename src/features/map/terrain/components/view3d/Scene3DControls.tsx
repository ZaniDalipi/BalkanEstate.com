/** The bar along the bottom of the 3D window: what is on top of the land, the buildings round it, how tall the land stands, and the camera. */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Camera3D } from '../../hooks/camera3d';
import type { PlotSurface } from '../../hooks/usePlotModel';
import { EXAGGERATIONS, type Exaggeration } from '../../utils/terrain3dScene';
import { CAPTION, GLASS } from '../terrainStyles';
import BuildingsToggle from './BuildingsToggle';
import Camera3DControls from './Camera3DControls';
import SegmentedControl from './SegmentedControl';

export interface Scene3DControlsProps {
  surface: PlotSurface;
  onSurface: (surface: PlotSurface) => void;
  /** Whether the satellite photo has arrived and can be offered. */
  satellite: boolean;
  /** Whether buildings are shown; null when there are none to show. */
  buildings: boolean | null;
  onBuildings: (on: boolean) => void;
  exaggeration: Exaggeration;
  onExaggeration: (value: Exaggeration) => void;
  camera: Camera3D;
}

const Scene3DControls: React.FC<Scene3DControlsProps> = ({ surface, onSurface, satellite, buildings, onBuildings, exaggeration, onExaggeration, camera }) => {
  const { t } = useTranslation('search');
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-3 sm:bottom-6">
      <p className={`hidden rounded-full px-3 py-1 sm:block ${GLASS} ${CAPTION}`}>
        {t('terrain.view3d.hint', 'Drag to move · right-drag or two fingers to turn and tilt · scroll or pinch to zoom.')}
      </p>
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
        {satellite && (
          <SegmentedControl<PlotSurface>
            label={t('terrain.view3d.layer', 'Show')}
            options={[
              { value: 'slope', text: t('terrain.view3d.slope', 'Slope') },
              { value: 'satellite', text: t('terrain.view3d.satellite', 'Satellite') },
            ]}
            value={surface}
            onChange={onSurface}
          />
        )}
        {buildings !== null && <BuildingsToggle on={buildings} onChange={onBuildings} />}
        <SegmentedControl<Exaggeration>
          label={t('terrain.view3d.height', 'Height')}
          options={EXAGGERATIONS.map((n) => ({ value: n, text: `${n}×` }))}
          value={exaggeration}
          onChange={onExaggeration}
        />
        <Camera3DControls camera={camera} />
      </div>
    </div>
  );
};

export default Scene3DControls;
