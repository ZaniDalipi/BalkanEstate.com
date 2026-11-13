/**
 * The drawn area in 3D with the land round it: real relief a few times the
 * plot's size, the satellite photo of the surroundings, the plot's slope
 * colours (or the photo) inside its outline, the buildings round it at their
 * heights, the house at the best place to build — to turn, tilt and fly around. Heights can be stretched so even
 * gentle land shows its shape; the info card says by how much.
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import type { PlotSurface } from '../../hooks/usePlotModel';
import { useSurroundings } from '../../hooks/useSurroundings';
import type { TerrainAnalysis, TerrainPoint } from '../../types';
import { defaultExaggeration, type Exaggeration } from '../../utils/terrain3dScene';
import { GLASS } from '../terrainStyles';
import PlotModelScene from './PlotModelScene';
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
  const [surface, setSurface] = useState<PlotSurface>('slope');
  const [showBuildings, setShowBuildings] = useState(true);
  const { ground, buildings } = useSurroundings(analysis);
  const buildingsShown = showBuildings && Boolean(buildings?.length);
  useEscapeLayer(ref, onClose);
  useEffect(() => { ref.current?.focus(); }, []);

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/45 backdrop-blur-sm sm:p-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Focus lands on the dialog itself: inside it for the keyboard, with no ring drawn on a button nobody chose.
        tabIndex={-1}
        className="relative h-full w-full overflow-hidden bg-[#e6ebf1] shadow-2xl outline-none sm:h-[min(86dvh,820px)] sm:max-w-6xl sm:rounded-[28px] sm:ring-1 sm:ring-black/10"
      >
        <PlotModelScene
          analysis={analysis}
          polygon={polygon}
          ground={ground}
          buildings={buildings}
          showBuildings={showBuildings}
          onShowBuildings={setShowBuildings}
          surface={surface}
          onSurface={setSurface}
          exaggeration={exaggeration}
          onExaggeration={setExaggeration}
          reduceMotion={reduceMotion}
          onClose={onClose}
        />
        <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
          <Terrain3DInfo titleId={titleId} analysis={analysis} surface={surface} exaggeration={exaggeration} buildings={buildingsShown} />
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
