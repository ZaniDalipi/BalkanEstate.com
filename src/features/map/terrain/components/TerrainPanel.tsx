/**
 * The terrain tool's panel: draw an area, then read how steep it is and where
 * to build. Sits where the measuring panel sits; folds down to its title bar
 * so the map stays visible on a phone.
 */
import React, { useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { XCircleIcon } from '@/constants';
import { SoftIcon } from '@/src/shared/illustrations';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import type { TerrainTool } from '../hooks/useTerrainTool';
import TerrainDrawStep from './TerrainDrawStep';
import TerrainResults from './TerrainResults';
import TerrainStatus from './TerrainStatus';

export interface TerrainPanelProps {
  tool: TerrainTool;
  onClose: () => void;
}

const ICON_BUTTON = 'flex items-center justify-center w-11 h-11 rounded-full text-gray-500 hover:bg-gray-100 transition-colors';

const TerrainPanel: React.FC<TerrainPanelProps> = ({ tool, onClose }) => {
  const { t } = useTranslation(['search', 'common']);
  const [collapsed, setCollapsed] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const reduceMotion = useReducedMotion();
  useEscapeLayer(ref, onClose);

  const { phase } = tool;

  return (
    <motion.section
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      // On a phone it takes at most about half the height, so the slope map stays in view below it.
      className="absolute left-4 z-[1002] w-[min(21rem,calc(100%-2rem))] flex flex-col rounded-2xl shadow-2xl border border-white/30 bg-white/95 backdrop-blur-xl max-h-(--terrain-panel-max-h) max-sm:max-h-[min(52dvh,var(--terrain-panel-max-h))]"
      style={{
        top: 'calc(var(--floating-search-top-pad, 8px) + 60px)',
        ['--terrain-panel-max-h' as string]: 'calc(100% - var(--floating-search-top-pad, 8px) - 140px)',
      }}
    >
      <header className="flex items-center gap-1 pl-4 pr-1 py-1 border-b border-gray-100">
        <SoftIcon name="mountain" className="w-5 h-5 shrink-0" />
        <h3 id={titleId} className="flex-1 font-bold text-sm text-gray-800">
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
          <span aria-hidden="true" className="text-lg leading-none">{collapsed ? '▾' : '–'}</span>
        </button>
        <button type="button" onClick={onClose} className={ICON_BUTTON} aria-label={t('common:close', 'Close')}>
          <XCircleIcon className="w-5 h-5" />
        </button>
      </header>

      <div id={bodyId} hidden={collapsed} className="overflow-y-auto overscroll-contain p-4 space-y-3">
        {phase.kind === 'drawing' && <TerrainDrawStep tool={tool} />}
        {(phase.kind === 'loading' || phase.kind === 'failed') && (
          <TerrainStatus phase={phase} onRetry={tool.retry} onEdit={tool.editArea} onRedraw={tool.redraw} />
        )}
        {phase.kind === 'result' && (
          <TerrainResults
            analysis={phase.analysis}
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
