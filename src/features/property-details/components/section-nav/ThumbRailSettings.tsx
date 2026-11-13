// The thumb rail's own settings, shown inside its panel: which edge it sits
// on and when it shows. Choices apply at once and are remembered.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSectionNavPrefs, type RailSide, type RailVisibility } from './sectionNavStore';

const SIDES: Array<{ value: RailSide; key: string; fallback: string }> = [
  { value: 'left', key: 'property:sectionNav.left', fallback: 'Left' },
  { value: 'right', key: 'property:sectionNav.right', fallback: 'Right' },
];

const VISIBILITY: Array<{ value: RailVisibility; key: string; fallback: string; hintKey: string; hint: string }> = [
  { value: 'always', key: 'property:sectionNav.showAlways', fallback: 'Always', hintKey: 'property:sectionNav.showAlwaysHint', hint: 'A slim rail stays on the edge' },
  { value: 'scroll', key: 'property:sectionNav.showScroll', fallback: 'Hide while scrolling', hintKey: 'property:sectionNav.showScrollHint', hint: 'Steps aside while you scroll' },
  { value: 'hidden', key: 'property:sectionNav.showHidden', fallback: 'Tucked away', hintKey: 'property:sectionNav.showHiddenHint', hint: 'Only a small tab; press it to open' },
];

const ThumbRailSettings: React.FC = () => {
  const { t } = useTranslation(['property']);
  const { side, visibility, setSide, setVisibility } = useSectionNavPrefs();

  return (
    <div className="px-2 pb-3">
      <p id="thumb-rail-side" className="px-1 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
        {t('property:sectionNav.side', 'Side')}
      </p>
      <div role="radiogroup" aria-labelledby="thumb-rail-side" className="flex p-1 rounded-2xl bg-neutral-900/5">
        {SIDES.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={side === o.value}
            onClick={() => setSide(o.value)}
            className={`flex-1 min-h-[44px] rounded-xl font-bold text-[15px] transition-colors motion-reduce:transition-none ${
              side === o.value ? 'thumb-glass-tint' : 'text-neutral-700 active:bg-white/70'
            }`}
          >
            {t(o.key, o.fallback)}
          </button>
        ))}
      </div>

      <p id="thumb-rail-show" className="px-1 mt-4 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
        {t('property:sectionNav.show', 'Show')}
      </p>
      <div role="radiogroup" aria-labelledby="thumb-rail-show" className="flex flex-col gap-1">
        {VISIBILITY.map((o) => {
          const on = visibility === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setVisibility(o.value)}
              className={`flex items-start gap-3 min-h-[44px] px-2.5 py-2 rounded-xl text-left transition-colors motion-reduce:transition-none ${
                on ? 'bg-primary/10' : 'active:bg-white/70'
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex-none w-[18px] h-[18px] rounded-full ${on ? 'border-[5px] border-primary' : 'border-2 border-neutral-400'}`}
              />
              <span className="min-w-0">
                <span className="block font-bold text-[15px] text-neutral-900">{t(o.key, o.fallback)}</span>
                <span className="block text-[13px] text-neutral-500">{t(o.hintKey, o.hint)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThumbRailSettings;
