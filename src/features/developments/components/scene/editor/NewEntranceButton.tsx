import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useDevelopmentStructure } from '../../../hooks';
import type { DevelopmentEntrance } from '../../../types';
import { EntranceDialog } from '../../dashboard/entrances/EntranceDialog';

interface NewEntranceButtonProps {
  developmentId: string;
  /** The building the picture shows, when it shows one: the new entrance goes there. */
  buildingId?: string;
  onCreated: (entrance: DevelopmentEntrance) => void;
}

/**
 * Add an entrance without leaving the picture editor; the selected region is
 * then linked to it. With several buildings and no building in view, the owner
 * picks which building it belongs to.
 */
export const NewEntranceButton: React.FC<NewEntranceButtonProps> = ({ developmentId, buildingId, onCreated }) => {
  const { t } = useTranslation('developments');
  const { buildings, entrances } = useDevelopmentStructure(developmentId);
  const [chosen, setChosen] = useState(buildingId ?? '');
  const [open, setOpen] = useState(false);
  const target = buildings.find((b) => b.id === (buildingId || chosen)) ?? (buildings.length === 1 ? buildings[0] : undefined);
  const selectId = React.useId();
  if (buildings.length === 0) return <p className="text-xs text-slate-500">{t('entrance.needBuilding', 'Add a building first; entrances belong to a building.')}</p>;

  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-2">
      {!buildingId && buildings.length > 1 && (
        <div>
          <label htmlFor={selectId} className="mb-1 block text-xs font-medium text-slate-600">{t('entrance.inBuilding', 'Entrance of building')}</label>
          <select id={selectId} value={chosen} onChange={(e) => setChosen(e.target.value)} className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-sm sm:min-h-[36px]">
            <option value="">{t('inventory.edit.selectBuilding', 'Select a building')}</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}
      <button
        type="button"
        disabled={!target}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:text-slate-400 sm:min-h-[36px]"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t('entrance.newHere', 'New entrance')}
      </button>
      {open && target && (
        <EntranceDialog
          developmentId={developmentId}
          buildingId={target.id}
          buildingName={target.name}
          siblings={entrances.filter((e) => e.buildingId === target.id)}
          onClose={() => setOpen(false)}
          onSaved={onCreated}
        />
      )}
    </div>
  );
};
