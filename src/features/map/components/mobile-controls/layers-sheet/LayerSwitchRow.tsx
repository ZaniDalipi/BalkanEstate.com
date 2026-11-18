import React, { useId } from 'react';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import { ToggleSwitch } from '@/src/features/developments/components/shared/ToggleSwitch';
import { tapHaptic } from '@/shared/utils/haptics';

interface LayerSwitchRowProps {
  icon: SoftIconName;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Already-formatted count shown before the switch (e.g. premium listings). */
  badge?: string | null;
}

/** An iOS Settings-style row: icon, label, optional count, and a switch. The whole row toggles. */
const LayerSwitchRow: React.FC<LayerSwitchRowProps> = ({ icon, label, checked, onChange, badge }) => {
  const id = useId();
  return (
    <div className="flex min-h-[52px] items-center gap-3 pl-3 pr-2">
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
        <SoftIcon name={icon} className="h-5 w-5" />
      </span>
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer truncate py-3 text-[16px] text-neutral-900">
        {label}
      </label>
      {badge && (
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[12px] font-bold leading-none text-white">{badge}</span>
      )}
      <ToggleSwitch
        id={id}
        checked={checked}
        onChange={(next) => {
          tapHaptic();
          onChange(next);
        }}
      />
    </div>
  );
};

export default LayerSwitchRow;
