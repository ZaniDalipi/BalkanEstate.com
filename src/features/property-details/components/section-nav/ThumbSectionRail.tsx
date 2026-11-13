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
import { useSectionNavPrefs } from './sectionNavStore';
import { useRailScrub } from './useRailScrub';
import { useScrollActivity } from './useScrollActivity';
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

  const onPressHandle = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!open) setGeometry(readRailGeometry(sections.length));
    handleProps.onPointerDown(e);
  };
  const onKeyActivate = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!open && e.detail === 0) setGeometry(readRailGeometry(sections.length));
    handleProps.onClick(e);
  };

  const away = !open && (overMap || (visibility === 'scroll' && scrolling));
  const offset = side === 'right' ? 12 : -12;

  return (
    <div className="lg:hidden print:hidden [--thumb-rail-left:env(safe-area-inset-left,0px)] md:[--thumb-rail-left:var(--sidebar-rail-w)]">
      {open && (
        <div
          aria-hidden="true"
          data-testid="thumb-rail-backdrop"
          onClick={closeAll}
          className="fixed inset-0 z-[44] bg-neutral-900/15"
        />
      )}
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
            room={geometry.room}
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
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: offset, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: offset, scale: 0.96 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ transformOrigin: side === 'right' ? 'right center' : 'left center' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThumbSectionRail;
