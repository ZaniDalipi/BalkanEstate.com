import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
import { useInventoryMutations, useDevelopmentStructure } from '../../../hooks';

/**
 * Compact inventory builder: add a building, a floor (within a building), and a
 * unit (within a building + floor). Deliberately minimal — a full guided wizard
 * can replace this later; the shape of the API calls stays the same.
 */
export const QuickAddInventory: React.FC<{ developmentId: string }> = ({ developmentId }) => {
  const { t } = useTranslation('developments');
  const { buildings, floors } = useDevelopmentStructure(developmentId);
  const { createBuilding, createFloor, createUnit, isCreatingBuilding, isCreatingFloor, isCreatingUnit } =
    useInventoryMutations(developmentId);

  const [buildingName, setBuildingName] = useState('');
  const [floorBuildingId, setFloorBuildingId] = useState('');
  const [floorLabel, setFloorLabel] = useState('');
  const [floorLevel, setFloorLevel] = useState('1');
  const [unitBuildingId, setUnitBuildingId] = useState('');
  const [unitFloorId, setUnitFloorId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [unitType, setUnitType] = useState('apartment');
  const [error, setError] = useState<string | null>(null);

  const selectClass =
    'min-h-[40px] w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const floorsForUnitBuilding = floors.filter((f) => f.buildingId === unitBuildingId);

  const run = async (fn: () => Promise<unknown>, reset: () => void) => {
    setError(null);
    try {
      await fn();
      reset();
    } catch (e) {
      const msg = (e as { message?: string })?.message;
      setError(msg || t('errors.generic'));
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Building */}
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!buildingName.trim()) return;
          run(() => createBuilding({ name: buildingName.trim() }), () => setBuildingName(''));
        }}
      >
        <div className="flex-1">
          <Input label={t('building.name')} value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
        </div>
        <Button type="submit" variant="outline" disabled={isCreatingBuilding || !buildingName.trim()}>
          {t('building.add')}
        </Button>
      </form>

      {/* Floor */}
      {buildings.length > 0 && (
        <form
          className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!floorBuildingId || !floorLabel.trim()) return;
            run(
              () =>
                createFloor({
                  buildingId: floorBuildingId,
                  label: floorLabel.trim(),
                  level: Number(floorLevel) || 0,
                }),
              () => {
                setFloorLabel('');
              }
            );
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">{t('detail.buildings')}</span>
            <select className={selectClass} value={floorBuildingId} onChange={(e) => setFloorBuildingId(e.target.value)}>
              <option value="">—</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <Input label={t('floor.label')} value={floorLabel} onChange={(e) => setFloorLabel(e.target.value)} />
          <Input
            label={t('floor.level')}
            type="number"
            value={floorLevel}
            onChange={(e) => setFloorLevel(e.target.value)}
            className="w-20"
          />
          <Button type="submit" variant="outline" disabled={isCreatingFloor || !floorBuildingId || !floorLabel.trim()}>
            {t('floor.add')}
          </Button>
        </form>
      )}

      {/* Unit */}
      {buildings.length > 0 && floors.length > 0 && (
        <form
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!unitBuildingId || !unitFloorId || !unitNumber.trim()) return;
            run(
              () =>
                createUnit({
                  buildingId: unitBuildingId,
                  floorId: unitFloorId,
                  unitNumber: unitNumber.trim(),
                  unitType: unitType.trim() || 'apartment',
                }),
              () => setUnitNumber('')
            );
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">{t('detail.buildings')}</span>
            <select
              className={selectClass}
              value={unitBuildingId}
              onChange={(e) => {
                setUnitBuildingId(e.target.value);
                setUnitFloorId('');
              }}
            >
              <option value="">—</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">{t('detail.floors')}</span>
            <select
              className={selectClass}
              value={unitFloorId}
              onChange={(e) => setUnitFloorId(e.target.value)}
              disabled={!unitBuildingId}
            >
              <option value="">—</option>
              {floorsForUnitBuilding.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </label>
          <Input label={t('unit.number')} value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} />
          <Input label={t('unit.type')} value={unitType} onChange={(e) => setUnitType(e.target.value)} />
          <Button
            type="submit"
            variant="outline"
            disabled={isCreatingUnit || !unitBuildingId || !unitFloorId || !unitNumber.trim()}
          >
            {t('unit.add')}
          </Button>
        </form>
      )}
    </div>
  );
};
