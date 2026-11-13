import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHintsStore } from '../hooks/hintsStore';

/** Turns the tips that show up on their own on or off. */
const HintsAutoSwitch: React.FC = () => {
  const { t } = useTranslation('common');
  const enabled = useHintsStore((s) => s.enabled);
  const setEnabled = useHintsStore((s) => s.setEnabled);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => setEnabled(!enabled)}
      className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left text-sm text-neutral-700"
    >
      <span>{t('hints.ui.autoSwitch', 'Show a tip now and then')}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-neutral-300'}`} aria-hidden="true">
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
};

export default HintsAutoSwitch;
