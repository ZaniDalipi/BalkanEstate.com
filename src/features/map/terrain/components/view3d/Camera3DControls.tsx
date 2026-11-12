/**
 * Buttons to move around the 3D view: zoom, turn, look straight down or
 * tilted, fly around, reset. The same moves work by dragging (right-drag or
 * two fingers to turn and tilt); these are for anyone who doesn't know that.
 */
import React from 'react';
import { LocateFixed, Minus, Plus, Rotate3d, RotateCcw, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Camera3D } from '../../hooks/useCamera3D';
import { GLASS } from '../terrainStyles';

const BUTTON = 'flex h-11 w-11 items-center justify-center rounded-full text-gray-800 transition hover:bg-black/[0.06] active:bg-black/10';
const ON = 'bg-gray-900 text-white hover:bg-gray-900';
const ICON = { className: 'h-[18px] w-[18px]', strokeWidth: 2, 'aria-hidden': true } as const;
const Divider: React.FC = () => <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-black/10" />;

const Camera3DControls: React.FC<{ camera: Camera3D }> = ({ camera }) => {
  const { t } = useTranslation('search');
  const press = (label: string, onClick: () => void, content: React.ReactNode, pressed?: boolean) => (
    <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={pressed} className={`${BUTTON} ${pressed ? ON : ''}`}>
      {content}
    </button>
  );

  return (
    <div role="group" aria-label={t('terrain.view3d.camera', 'Camera')} className={`flex items-center rounded-full p-1 ${GLASS}`}>
      {press(t('terrain.view3d.zoomOut', 'Zoom out'), camera.zoomOut, <Minus {...ICON} />)}
      {press(t('terrain.view3d.zoomIn', 'Zoom in'), camera.zoomIn, <Plus {...ICON} />)}
      <Divider />
      {press(t('terrain.view3d.turnLeft', 'Turn left'), camera.turnLeft, <RotateCcw {...ICON} />)}
      {press(t('terrain.view3d.turnRight', 'Turn right'), camera.turnRight, <RotateCw {...ICON} />)}
      <Divider />
      {press(
        camera.tilted ? t('terrain.view3d.topView', 'Look straight down') : t('terrain.view3d.tiltedView', 'Tilt the view'),
        camera.toggleTilt,
        <span aria-hidden="true" className="text-[13px] font-semibold tracking-tight">{camera.tilted ? '2D' : '3D'}</span>,
      )}
      {camera.canOrbit && press(t('terrain.view3d.orbit', 'Fly around'), camera.toggleOrbit, <Rotate3d {...ICON} />, camera.orbiting)}
      {press(t('terrain.view3d.reset', 'Reset view'), camera.reset, <LocateFixed {...ICON} />)}
    </div>
  );
};

export default Camera3DControls;
