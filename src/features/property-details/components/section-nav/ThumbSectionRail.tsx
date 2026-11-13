// Phones and tablets: the property page's "On this page" menu as a liquid
// glass rail on the left or right edge (the reader's choice). Press it and
// slide the thumb to a section, let go to jump; or tap it and tap a row.
// See useRailScrub for the gesture, ThumbRailSettings for the choices.

import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import ThumbRailHandle from './ThumbRailHandle';
import ThumbRailPanel from './ThumbRailPanel';
import { readRailGeometry } from './railGeometry';
import { DIM_FADE, PANEL_EXIT, PANEL_SPRING, REDUCED } from './railMotion';
import { panelOriginY } from './thumbRailLayout';
import { useSectionNavPrefs } from './sectionNavStore';
import { useRailScrub } from './useRailScrub';
import { useScrollActivity } from './useScrollActivity';
import { useSelectionGuard } from './useSelectionGuard';
import type { NavSection } from './sectionDefs';

const MotionPanel = motion.create(ThumbRailPanel);

interface Props {
  sections: NavSection[];
  activeKey: string;
  overMap: boolean;
  onSelect: (key: string) => void;
}

const ThumbSectionRail: React.FC<Props> = ({ sections, activeKey, overMap, onSelect }) => {
  const { t } = useTranslation(['property']);
  const reduceMotion = useReducedMotion();
  const { side, visibility } = useSectionNavPrefs();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const scrolling = useScrollActivity(visibility === 'scroll');

  // Measured as the panel opens: the header and contact bar may have moved.
  const [geometry, setGeometry] = useState(() => readRailGeometry(sections.length));

  const pick = useCallback((i: number) => {
    const s = sections[i];
    if (s) onSelect(s.key);
  }, [sections, onSelect]);

  const { open, sliding, hover, close, handleProps } = useRailScrub({
    rowCount: sections.length,
    rowHeight: geometry.layout.rowHeight,
    listRef,
    onPick: pick,
  });

  const closeAll = useCallback(() => {
    const hadFocus = panelRef.current?.contains(document.activeElement) ?? false;
    close();
    setSettingsOpen(false);
    if (hadFocus) handleRef.current?.focus();
  }, [close]);

  useEscapeLayer(panelRef, closeAll, open);
  // A long press must never start iOS text selection on the page.
  useSelectionGuard(handleRef, open);

  const onPressHandle = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!open) setGeometry(readRailGeometry(sections.length));
    handleProps.onPointerDown(e);
  };
  const onKeyActivate = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!open && e.detail === 0) setGeometry(readRailGeometry(sections.length));
    handleProps.onClick(e);
  };

  const away = !open && (overMap || (visibility === 'scroll' && scrolling));
  // The panel grows out of the rail and folds back into it, like an iOS
  // context menu: scaled from the rail's edge, at the rail's height.
  const origin = `${side === 'right' ? '100%' : '0%'} ${panelOriginY(geometry.anchorY, geometry.layout)}px`;
  const shown = { opacity: 1, scale: 1, x: 0 };
  const folded = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5, x: side === 'right' ? 16 : -16 };

  return (
    <div className="lg:hidden print:hidden [--thumb-rail-left:env(safe-area-inset-left,0px)] md:[--thumb-rail-left:var(--sidebar-rail-w)]">
      <AnimatePresence>
        {open && (
          <motion.div
            key="dim"
            aria-hidden="true"
            data-testid="thumb-rail-backdrop"
            onClick={closeAll}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? REDUCED : DIM_FADE}
            className="fixed inset-0 z-[44] bg-neutral-900/15 select-none"
          />
        )}
      </AnimatePresence>
      <ThumbRailHandle
        ref={handleRef}
        side={side}
        tucked={visibility === 'hidden'}
        away={away}
        sections={sections}
        activeKey={activeKey}
        expanded={open}
        label={t('property:sectionNav.open', 'Jump to a section')}
        {...handleProps}
        onPointerDown={onPressHandle}
        onClick={onKeyActivate}
      />
      <AnimatePresence>
        {open && (
          <MotionPanel
            key="panel"
            panelRef={panelRef}
            listRef={listRef}
            side={side}
            geometry={geometry.layout}
            sections={sections}
            activeKey={activeKey}
            hover={hover}
            sliding={sliding}
            settingsOpen={settingsOpen}
            onToggleSettings={() => setSettingsOpen((v) => !v)}
            onSelect={(i: number) => {
              closeAll();
              pick(i);
            }}
            initial={folded}
            animate={{ ...shown, transition: reduceMotion ? REDUCED : PANEL_SPRING }}
            exit={{ ...folded, transition: reduceMotion ? REDUCED : PANEL_EXIT }}
            style={{ transformOrigin: origin }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThumbSectionRail;
