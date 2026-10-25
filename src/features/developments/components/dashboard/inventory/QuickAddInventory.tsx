import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
import { useInventoryMutations, useDevelopmentStructure } from '../../../hooks';
import { AddFloorsForm } from './AddFloorsForm';
import { AddUnitsForm } from './AddUnitsForm';

/**
 * Inventory builder: add buildings, then floors (one or a range, named for
 * you), then units (numbered for you, one or several at a time).
 */
export const QuickAddInventory: React.FC<{ developmentId: string; role?: string }> = ({ developmentId, role }) => {
  const { t } = useTranslation('developments');
  const { buildings, floors } = useDevelopmentStructure(developmentId);
  const { createBuilding, createFloor, createUnit, isCreatingBuilding, isCreatingFloor, isCreatingUnit } = useInventoryMutations(developmentId);
  const [buildingName, setBuildingName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingName.trim()) return;
    setError(null);
    try {
      await createBuilding({ name: buildingName.trim() });
      setBuildingName('');
    } catch (err) {
      setError((err as { message?: string })?.message || t('errors.generic'));
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={onAddBuilding}>
        <div className="flex-1">
          <Input label={t('building.name')} value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
        </div>
        <Button type="submit" variant="outline" disabled={isCreatingBuilding || !buildingName.trim()}>
          {t('building.add')}
        </Button>
      </form>
      {buildings.length > 0 && (
        <AddFloorsForm buildings={buildings} floors={floors} createFloor={createFloor} isCreating={isCreatingFloor} onError={setError} />
      )}
      {buildings.length > 0 && floors.length > 0 && (
        <AddUnitsForm developmentId={developmentId} buildings={buildings} floors={floors} createUnit={createUnit} isCreating={isCreatingUnit} onError={setError} role={role} />
      )}
    </div>
  );
};
