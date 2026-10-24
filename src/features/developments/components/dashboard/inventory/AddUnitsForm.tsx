import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
import { useDevelopmentUnits } from '../../../hooks';
import type { CreateUnitPayload, DevelopmentBuilding, DevelopmentFloor } from '../../../types';
import { nextUnitNumbers } from '../../../utils/inventoryNaming';
import { BuildingSelect, selectClassName } from './BuildingSelect';
import { UnitFeatureToggles } from './UnitFeatureToggles';

interface AddUnitsFormProps {
  developmentId: string;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
  createUnit: (payload: CreateUnitPayload) => Promise<unknown>;
  isCreating: boolean;
  onError: (message: string | null) => void;
}

/**
 * Add one or several apartments to a floor. The unit number is suggested from
 * the floor ("401", or continuing "A-402" → "A-403") and moves on after each
 * add; "How many" adds a run of numbers in one go.
 */
export const AddUnitsForm: React.FC<AddUnitsFormProps> = ({ developmentId, buildings, floors, createUnit, isCreating, onError }) => {
  const { t } = useTranslation('developments');
  const floorSelectId = useId();
  const [chosenBuilding, setChosenBuilding] = useState('');
  const [floorId, setFloorId] = useState('');
  const [numberText, setNumberText] = useState<string | null>(null);
  const [countText, setCountText] = useState('1');
  const [unitType, setUnitType] = useState('apartment');
  const [features, setFeatures] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const buildingId = chosenBuilding || (buildings.length === 1 ? buildings[0].id : '');
  const building = buildings.find((b) => b.id === buildingId);
  const buildingFloors = floors.filter((f) => f.buildingId === buildingId).sort((a, b) => a.level - b.level);
  const floor = buildingFloors.find((f) => f.id === floorId);
  const { units: onFloor } = useDevelopmentUnits(floor ? developmentId : undefined, { floorId: floor?.id, limit: 200 });

  const count = Math.max(1, Math.min(50, Number.parseInt(countText, 10) || 1));
  const existing = onFloor.map((u) => u.unitNumber);
  const custom = numberText?.trim();
  const numbers = !floor
    ? []
    : custom
      ? [custom, ...(count > 1 ? nextUnitNumbers([...existing, custom], floor.level, count - 1) : [])]
      : nextUnitNumbers(existing, floor.level, count, building?.code ?? '');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!floor || numbers.length === 0) return;
    onError(null);
    setBusy(true);
    try {
      for (const unitNumber of numbers) {
        await createUnit({ buildingId, floorId: floor.id, unitNumber, unitType: unitType.trim() || 'apartment', features });
      }
      setNumberText(null);
      setCountText('1');
      setFeatures([]);
    } catch (err) {
      onError((err as { message?: string })?.message || t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-[1.2fr_1.2fr_1fr_0.6fr_1fr_auto] lg:items-end">
        <BuildingSelect buildings={buildings} value={buildingId} onChange={(id) => { setChosenBuilding(id); setFloorId(''); setNumberText(null); }} />
        <div>
          <label htmlFor={floorSelectId} className="mb-1.5 block text-sm font-medium text-gray-700">{t('detail.floors')}</label>
          <select id={floorSelectId} className={selectClassName} value={floorId} disabled={!buildingId} onChange={(e) => { setFloorId(e.target.value); setNumberText(null); }}>
            <option value="">—</option>
            {buildingFloors.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>
        <Input label={t('unit.number')} value={numberText ?? numbers[0] ?? ''} placeholder={floor ? undefined : '401'} onChange={(e) => setNumberText(e.target.value || null)} disabled={!floor} />
        <Input label={t('unit.howMany', 'How many')} type="number" min={1} max={50} value={countText} onChange={(e) => setCountText(e.target.value)} disabled={!floor} />
        <Input label={t('unit.type')} value={unitType} onChange={(e) => setUnitType(e.target.value)} />
        <Button type="submit" variant="outline" disabled={busy || isCreating || !floor || numbers.length === 0}>
          {count > 1 ? t('unit.addMany', { n: count, defaultValue: 'Add units ({{n}})' }) : t('unit.add')}
        </Button>
      </div>
      {floor && numbers.length > 0 && (
        <p className="text-xs text-slate-600" aria-live="polite">
          {t('unit.numbersHint', { numbers: numbers.join(', '), defaultValue: 'Adds {{numbers}}.' })}
        </p>
      )}
      <UnitFeatureToggles value={features} onChange={setFeatures} />
    </form>
  );
};
