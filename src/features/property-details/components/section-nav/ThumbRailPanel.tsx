// The thumb rail's glass panel: "On this page" with every section, opened
// beside the rail so the thumb never covers a label. A gear pushes the rail's
// settings in from the side, like an iOS navigation page; the panel keeps its
// size, so nothing jumps.

import React, { forwardRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import ThumbRailPanelHeader from './ThumbRailPanelHeader';
import ThumbRailRow from './ThumbRailRow';
import ThumbRailSettings from './ThumbRailSettings';
import { PAGE_SPRING, REDUCED } from './railMotion';
import type { NavSection } from './sectionDefs';
import type { RailSide } from './sectionNavStore';
import type { PanelLayout } from './thumbRailLayout';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  side: RailSide;
  geometry: PanelLayout;
  sections: NavSection[];
  activeKey: string;
  /** Row under the sliding thumb, -1 for none. */
  hover: number;
  sliding: boolean;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onSelect: (index: number) => void;
  listRef: React.RefObject<HTMLUListElement>;
  /** The panel element, for Esc and focus handling (the forwarded ref belongs to framer-motion). */
  panelRef: React.MutableRefObject<HTMLDivElement | null>;
}

/** `custom` = going to settings: it enters from the trailing side, the list slips back under it. */
const PAGES: Variants = {
  enter: (toSettings: boolean) => ({ x: toSettings ? '100%' : '-30%', opacity: toSettings ? 1 : 0 }),
  center: { x: 0, opacity: 1 },
  exit: (toSettings: boolean) => ({ x: toSettings ? '-30%' : '100%', opacity: toSettings ? 0 : 1 }),
};
const FADE: Variants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

const ThumbRailPanel = forwardRef<HTMLDivElement, Props>(
  ({ side, geometry, sections, activeKey, hover, sliding, settingsOpen, onToggleSettings, onSelect, listRef, panelRef, style, ...motionProps }, ref) => {
    const { t } = useTranslation(['property']);
    const reduceMotion = useReducedMotion();
    const title = t('property:sectionNav.onThisPage', 'On this page');
    const setRefs = useCallback((el: HTMLDivElement | null) => {
      panelRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    }, [panelRef, ref]);
    const page = {
      custom: settingsOpen,
      variants: reduceMotion ? FADE : PAGES,
      initial: 'enter',
      animate: 'center',
      exit: 'exit',
      transition: reduceMotion ? REDUCED : PAGE_SPRING,
      className: 'absolute inset-0 overflow-y-auto overscroll-contain',
    };
    return (
      <div
        ref={setRefs}
        role="dialog"
        aria-label={title}
        className="thumb-glass thumb-glass--panel fixed z-[45] w-60 max-w-[calc(100vw-5rem)] rounded-[26px] flex flex-col overflow-hidden select-none"
        style={{
          top: geometry.top,
          height: geometry.height,
          ...(side === 'right'
            ? { right: 'calc(env(safe-area-inset-right, 0px) + 3.5rem)' }
            : { left: 'calc(var(--thumb-rail-left) + 3.5rem)' }),
          ...style,
        }}
        {...motionProps}
      >
        <ThumbRailPanelHeader side={side} title={title} settingsOpen={settingsOpen} onToggleSettings={onToggleSettings} />
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <AnimatePresence initial={false} custom={settingsOpen}>
            {settingsOpen ? (
              <motion.div key="settings" {...page}>
                <ThumbRailSettings />
              </motion.div>
            ) : (
              <motion.div key="list" {...page}>
                <ul ref={listRef} className="relative isolate px-1.5 pb-1.5">
                  {sections.map((s, i) => (
                    <ThumbRailRow
                      key={s.key}
                      section={s}
                      side={side}
                      height={geometry.rowHeight}
                      hot={sliding && i === hover}
                      current={s.key === activeKey}
                      onSelect={() => onSelect(i)}
                    />
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);
ThumbRailPanel.displayName = 'ThumbRailPanel';

export default ThumbRailPanel;
