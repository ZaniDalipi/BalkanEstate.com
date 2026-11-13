// The thumb rail's glass panel: "On this page" with every section, opened
// beside the rail so the thumb never covers a label. A gear swaps the list
// for the rail's settings.

import React, { forwardRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';
import ThumbRailRow from './ThumbRailRow';
import ThumbRailSettings from './ThumbRailSettings';
import type { NavSection } from './sectionDefs';
import type { RailSide } from './sectionNavStore';
import type { PanelLayout } from './thumbRailLayout';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  side: RailSide;
  geometry: PanelLayout;
  room: number;
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

const ThumbRailPanel = forwardRef<HTMLDivElement, Props>(
  ({ side, geometry, room, sections, activeKey, hover, sliding, settingsOpen, onToggleSettings, onSelect, listRef, panelRef, style, ...motionProps }, ref) => {
    const { t } = useTranslation(['property']);
    const title = t('property:sectionNav.onThisPage', 'On this page');
    const setRefs = useCallback((el: HTMLDivElement | null) => {
      panelRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    }, [panelRef, ref]);
    return (
      <div
        ref={setRefs}
        role="dialog"
        aria-label={title}
        className="thumb-glass thumb-glass--panel fixed z-[45] w-60 max-w-[calc(100vw-5rem)] rounded-[26px] flex flex-col overflow-hidden"
        style={{
          top: geometry.top,
          ...(settingsOpen ? { maxHeight: room } : { height: geometry.height }),
          ...(side === 'right'
            ? { right: 'calc(env(safe-area-inset-right, 0px) + 3.5rem)' }
            : { left: 'calc(var(--thumb-rail-left) + 3.5rem)' }),
          ...style,
        }}
        {...motionProps}
      >
        <div className={`flex items-center gap-2 pl-4 pr-1.5 pt-1.5 pb-1 ${side === 'right' ? 'flex-row-reverse pl-1.5 pr-4' : ''}`}>
          <div className={`flex-1 min-w-0 ${side === 'right' ? 'text-right' : ''}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 truncate">
              {settingsOpen ? t('property:sectionNav.settings', 'Quick navigation') : title}
            </p>
            {!settingsOpen && (
              <p className="text-[11px] text-neutral-500 truncate">
                {t('property:sectionNav.slideHint', 'Slide your thumb, let go to jump')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleSettings}
            aria-label={settingsOpen ? t('property:sectionNav.done', 'Done') : t('property:sectionNav.settings', 'Quick navigation')}
            aria-expanded={settingsOpen}
            className="flex-none min-w-[44px] h-11 px-2 rounded-full flex items-center justify-center text-primary-dark font-bold text-sm active:bg-white/70"
          >
            {settingsOpen ? t('property:sectionNav.done', 'Done') : <Settings2 aria-hidden="true" className="w-5 h-5 text-neutral-600" />}
          </button>
        </div>

        {settingsOpen ? (
          <div className="overflow-y-auto overscroll-contain">
            <ThumbRailSettings />
          </div>
        ) : (
          <ul ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-1.5 pb-1.5">
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
        )}
      </div>
    );
  }
);
ThumbRailPanel.displayName = 'ThumbRailPanel';

export default ThumbRailPanel;
