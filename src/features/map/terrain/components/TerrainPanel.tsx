/**
 * The terrain tool's panel: draw an area, then read how steep it is and where
 * to build. A frosted-glass sheet where the measuring panel sits; it folds
 * down to its title bar so the map stays visible on a phone.
 */
import React, { useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronUp, Mountain, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import type { TerrainTool } from '../hooks/useTerrainTool';
import TerrainDrawStep from './TerrainDrawStep';
import TerrainResults from './TerrainResults';
import TerrainStatus from './TerrainStatus';
import { GLASS, ICON_BUTTON } from './terrainStyles';

export interface TerrainPanelProps {
  tool: TerrainTool;
  onClose: () => void;
}

const TerrainPanel: React.FC<TerrainPanelProps> = ({ tool, onClose }) => {
  const { t } = useTranslation(['search', 'common']);
  const [collapsed, setCollapsed] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const reduceMotion = useReducedMotion();
  useEscapeLayer(ref, onClose);

  const { phase } = tool;
  const Fold = collapsed ? ChevronDown : ChevronUp;

  return (
    <motion.section
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
      // On a phone it takes at most about half the height, so the slope map stays in view below it.
      className={`absolute left-4 z-[1002] flex w-[min(22rem,calc(100%-2rem))] flex-col rounded-3xl ${GLASS} max-h-(--terrain-panel-max-h) max-sm:max-h-[min(52dvh,var(--terrain-panel-max-h))]`}
      style={{
        top: 'calc(var(--floating-search-top-pad, 8px) + 60px)',
        ['--terrain-panel-max-h' as string]: 'calc(100% - var(--floating-search-top-pad, 8px) - 140px)',
      }}
    >
      <header className="flex items-center gap-2.5 py-1.5 pl-4 pr-1.5">
        <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white">
          <Mountain className="h-4 w-4" strokeWidth={2} />
        </span>
        <h3 id={titleId} className="flex-1 text-[15px] font-semibold tracking-tight text-gray-900">
          {t('search:terrain.title', 'Terrain & slope')}
        </h3>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={ICON_BUTTON}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          aria-label={collapsed ? t('search:terrain.expand', 'Expand panel') : t('search:terrain.collapse', 'Collapse panel')}
        >
          <Fold aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
        </button>
        <button type="button" onClick={onClose} className={ICON_BUTTON} aria-label={t('common:close', 'Close')}>
          <X aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
        </button>
      </header>

      <div id={bodyId} hidden={collapsed} className="space-y-3 overflow-y-auto overscroll-contain px-4 pb-4 pt-1">
        {phase.kind === 'drawing' && <TerrainDrawStep tool={tool} />}
        {(phase.kind === 'loading' || phase.kind === 'failed') && (
          <TerrainStatus phase={phase} onRetry={tool.retry} onEdit={tool.editArea} onRedraw={tool.redraw} />
        )}
        {phase.kind === 'result' && (
          <TerrainResults
            analysis={phase.analysis}
            polygon={tool.points}
            resolutionM={tool.resolutionM}
            onShowSpot={tool.showOnMap}
            onEdit={tool.editArea}
            onRedraw={tool.redraw}
          />
        )}
      </div>
    </motion.section>
  );
};

export default TerrainPanel;
