import React from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';
import type { RailSide } from './sectionNavStore';

interface Props {
  side: RailSide;
  title: string;
  settingsOpen: boolean;
  onToggleSettings: () => void;
}

/** The panel's heading: its title and a gear (or "Done" while in settings). */
const ThumbRailPanelHeader: React.FC<Props> = ({ side, title, settingsOpen, onToggleSettings }) => {
  const { t } = useTranslation(['property']);
  const right = side === 'right';
  const settingsLabel = t('property:sectionNav.settings', 'Quick navigation');
  const doneLabel = t('property:sectionNav.done', 'Done');
  return (
    <div className={`flex items-center gap-2 pt-1.5 pb-1 ${right ? 'flex-row-reverse pl-1.5 pr-4' : 'pl-4 pr-1.5'}`}>
      <div className={`flex-1 min-w-0 ${right ? 'text-right' : ''}`}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 truncate">
          {settingsOpen ? settingsLabel : title}
        </p>
        <p className={`text-[11px] text-neutral-500 truncate transition-opacity duration-200 ${settingsOpen ? 'opacity-0' : 'opacity-100'}`}>
          {t('property:sectionNav.slideHint', 'Slide your thumb, let go to jump')}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggleSettings}
        aria-label={settingsOpen ? doneLabel : settingsLabel}
        aria-expanded={settingsOpen}
        className="flex-none min-w-[44px] h-11 px-2 rounded-full flex items-center justify-center text-primary-dark font-bold text-sm transition-transform duration-150 active:scale-90 active:bg-white/70 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {settingsOpen ? doneLabel : <Settings2 aria-hidden="true" className="w-5 h-5 text-neutral-600" />}
      </button>
    </div>
  );
};

export default ThumbRailPanelHeader;
