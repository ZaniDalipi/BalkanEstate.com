/**
 * Buttons to move around the 3D view: turn, tilt, fly around, reset. The
 * same moves work by dragging (right-drag / two fingers to turn and tilt);
 * these are for anyone who doesn't know that.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Camera3D } from '../../hooks/useCamera3D';

const BUTTON = 'flex items-center justify-center w-11 h-11 rounded-full text-lg leading-none text-gray-700 hover:bg-gray-100 transition-colors';

const Camera3DControls: React.FC<{ camera: Camera3D }> = ({ camera }) => {
  const { t } = useTranslation('search');
  const buttons: Array<{ key: string; glyph: string; label: string; onClick: () => void; pressed?: boolean }> = [
    { key: 'left', glyph: '↺', label: t('terrain.view3d.turnLeft', 'Turn left'), onClick: camera.turnLeft },
    { key: 'right', glyph: '↻', label: t('terrain.view3d.turnRight', 'Turn right'), onClick: camera.turnRight },
    { key: 'more', glyph: '⤒', label: t('terrain.view3d.tiltMore', 'Tilt more'), onClick: camera.tiltMore },
    { key: 'less', glyph: '⤓', label: t('terrain.view3d.tiltLess', 'Look from above'), onClick: camera.tiltLess },
  ];
  if (camera.canOrbit) {
    buttons.push({ key: 'orbit', glyph: '⟳', label: t('terrain.view3d.orbit', 'Fly around'), onClick: camera.toggleOrbit, pressed: camera.orbiting });
  }
  buttons.push({ key: 'reset', glyph: '⌖', label: t('terrain.view3d.reset', 'Reset view'), onClick: camera.reset });

  return (
    <div role="group" aria-label={t('terrain.view3d.camera', 'Camera')} className="flex items-center gap-0.5 p-1 rounded-full bg-white/95 shadow-lg">
      {buttons.map((b) => (
        <button
          key={b.key}
          type="button"
          onClick={b.onClick}
          aria-label={b.label}
          title={b.label}
          aria-pressed={b.pressed}
          className={`${BUTTON} ${b.pressed ? '!bg-emerald-600 !text-white' : ''}`}
        >
          <span aria-hidden="true">{b.glyph}</span>
        </button>
      ))}
    </div>
  );
};

export default Camera3DControls;
