import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
import type { CreateFloorPayload, DevelopmentBuilding, DevelopmentFloor } from '../../../types';
import { floorKindFor, floorLabelFor, levelsToAdd, nextFreeLevel } from '../../../utils/inventoryNaming';
import { BuildingSelect } from './BuildingSelect';
import { useFloorNames } from './useFloorNames';
import { useStructureOptions } from './useStructureOptions';

interface AddFloorsFormProps {
  developmentId: string;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
  createFloor: (payload: CreateFloorPayload) => Promise<unknown>;
  isCreating: boolean;
  onError: (message: string | null) => void;
}

/**
 * Add one floor or a whole range. The level starts at the next free one and
 * moves on after each add; an empty label names the floor from its level
 * ("Floor 4", "Ground floor", "Basement 1"). Levels that exist are skipped.
 */
export const AddFloorsForm: React.FC<AddFloorsFormProps> = ({ developmentId, buildings, floors, createFloor, isCreating, onError }) => {
  const { t } = useTranslation('developments');
  const names = useFloorNames();
  const { buildingOptions } = useStructureOptions(developmentId, buildings, floors);
  const [chosenBuilding, setChosenBuilding] = useState('');
  const [fromText, setFromText] = useState<string | null>(null);
  const [toText, setToText] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const buildingId = chosenBuilding || (buildings.length === 1 ? buildings[0].id : '');
  const existing = floors.filter((f) => f.buildingId === buildingId).map((f) => f.level);
  const from = fromText ?? String(nextFreeLevel(existing));
  const fromN = Number.parseInt(from, 10);
  const toN = toText.trim() ? Number.parseInt(toText, 10) : null;
  const levels = Number.isFinite(fromN) ? levelsToAdd(fromN, Number.isFinite(toN as number) ? toN : null, existing) : [];
  const isRange = toN !== null && Number.isFinite(toN) && toN !== fromN;
  const autoName = Number.isFinite(fromN) ? floorLabelFor(fromN, names) : '';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId || levels.length === 0) return;
    onError(null);
    setBusy(true);
    try {
      for (const level of levels) {
        const name = !isRange && label.trim() ? label.trim() : floorLabelFor(level, names);
        await createFloor({ buildingId, level, label: name, kind: floorKindFor(level) });
      }
      setFromText(null);
      setToText('');
      setLabel('');
    } catch (err) {
      onError((err as { message?: string })?.message || t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const hint = !buildingId
    ? t('floor.pickBuilding', 'Choose a building.')
    : levels.length === 0
      ? t('floor.exists', 'That floor already exists in this building.')
      : isRange
        ? t('floor.rangeHint', { first: floorLabelFor(levels[0], names), last: floorLabelFor(levels[levels.length - 1], names), n: levels.length, defaultValue: 'Adds {{first}} to {{last}} — {{n}} in total. Existing floors are skipped.' })
        : t('floor.autoNameHint', { name: label.trim() || autoName, defaultValue: 'Will be named “{{name}}”.' });

  return (
    <form onSubmit={onSubmit} className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_0.6fr_0.6fr_1.4fr_auto] sm:items-end">
        <BuildingSelect className="col-span-2 sm:col-span-1" options={buildingOptions} value={buildingId} onChange={(id) => { setChosenBuilding(id); setFromText(null); }} />
        <Input label={t('floor.level')} type="number" value={from} onChange={(e) => setFromText(e.target.value)} />
        <Input label={t('floor.toLevel', 'To level')} type="number" placeholder={t('floor.optional', 'optional')} value={toText} onChange={(e) => setToText(e.target.value)} />
        <div className="col-span-2 sm:col-span-1">
          <Input label={t('floor.label')} placeholder={autoName} value={isRange ? '' : label} onChange={(e) => setLabel(e.target.value)} disabled={isRange} />
        </div>
        <Button type="submit" variant="outline" className="col-span-2 sm:col-span-1" disabled={busy || isCreating || !buildingId || levels.length === 0}>
          {isRange ? t('floor.addRange', { n: levels.length, defaultValue: 'Add floors ({{n}})' }) : t('floor.add')}
        </Button>
      </div>
      <p className="text-xs text-slate-600" aria-live="polite">{hint}</p>
    </form>
  );
};
