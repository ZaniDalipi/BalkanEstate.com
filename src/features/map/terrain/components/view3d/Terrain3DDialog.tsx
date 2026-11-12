/**
 * The drawn area in 3D, to turn, tilt and fly around. By default Google's
 * photorealistic 3D — the real buildings, trees and hills — with the slope
 * zones on the ground and a house at the best place to build; or the grid of
 * raised blocks, which can be stretched so gentle land shows its shape. When
 * the realistic view isn't available here, the blocks are shown and the info
 * card says why.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import type { TerrainAnalysis, TerrainPoint } from '../../types';
import { defaultExaggeration, type Exaggeration, type Scene3D } from '../../utils/terrain3dScene';
import { GLASS } from '../terrainStyles';
import BlocksScene from './BlocksScene';
import RealisticScene from './RealisticScene';
import Terrain3DInfo from './Terrain3DInfo';

export interface Terrain3DDialogProps {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
  onClose: () => void;
}

const Terrain3DDialog: React.FC<Terrain3DDialogProps> = ({ analysis, polygon, onClose }) => {
  const { t } = useTranslation(['search', 'common']);
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reduceMotion = useReducedMotion() ?? false;
  const [exaggeration, setExaggeration] = useState<Exaggeration>(() => defaultExaggeration(analysis.stats));
  const [scene, setScene] = useState<Scene3D>('slope');
  const [realistic, setRealistic] = useState(true);
  useEscapeLayer(ref, onClose);
  useEffect(() => { ref.current?.focus(); }, []);
  const noRealistic = useCallback(() => {
    setRealistic(false);
    setScene('blocks');
  }, []);

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
        {scene === 'blocks' ? (
          <BlocksScene
            analysis={analysis}
            polygon={polygon}
            exaggeration={exaggeration}
            onExaggeration={setExaggeration}
            onScene={setScene}
            realistic={realistic}
            reduceMotion={reduceMotion}
            onClose={onClose}
          />
        ) : (
          <RealisticScene
            analysis={analysis}
            polygon={polygon}
            scene={scene}
            onScene={setScene}
            onUnavailable={noRealistic}
            reduceMotion={reduceMotion}
          />
        )}

        <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
          <Terrain3DInfo titleId={titleId} analysis={analysis} scene={scene} exaggeration={exaggeration} realisticMissing={!realistic} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common:close', 'Close')}
          className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-gray-800 transition hover:bg-white sm:right-4 sm:top-4 ${GLASS}`}
        >
          <X aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default Terrain3DDialog;
