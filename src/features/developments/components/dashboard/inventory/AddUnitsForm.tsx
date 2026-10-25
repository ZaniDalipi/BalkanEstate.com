import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
import { useDevelopmentUnits } from '../../../hooks';
import { useListingAttachment } from '../../../hooks/useDevelopmentMutations';
import type { CreateUnitPayload, DevelopmentBuilding, DevelopmentFloor, DevelopmentUnit, UnitPrefill } from '../../../types';
import { nextUnitNumbers } from '../../../utils/inventoryNaming';
import { FormSelect } from '../../shared/FormSelect';
import { BuildingSelect } from './BuildingSelect';
import { useStructureOptions } from './useStructureOptions';
import { useUnitChoices } from './useUnitChoices';
import { usePrefillDescription } from './usePrefillDescription';
import { FillFromListing } from './FillFromListing';
import { UnitFeatureToggles } from './UnitFeatureToggles';
import { roleCan } from './permissions';

interface AddUnitsFormProps {
  developmentId: string;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
  createUnit: (payload: CreateUnitPayload) => Promise<{ unit: DevelopmentUnit }>;
  isCreating: boolean;
  onError: (message: string | null) => void;
  role?: string;
}

/** A listing's unit fields as a create payload (features are merged by the caller). */
const fromListing = ({ features: _f, unitType: _t, ...rest }: UnitPrefill['fields']): Partial<CreateUnitPayload> => rest;

/**
 * Add one or several apartments to a floor. The unit number is suggested from
 * the floor ("401", or continuing "A-402" → "A-403") and moves on after each
 * add; "How many" adds a run of numbers in one go.
 */
export const AddUnitsForm: React.FC<AddUnitsFormProps> = ({ developmentId, buildings, floors, createUnit, isCreating, onError, role }) => {
  const { t } = useTranslation('developments');
  const [chosenBuilding, setChosenBuilding] = useState('');
  const [floorId, setFloorId] = useState('');
  const [numberText, setNumberText] = useState<string | null>(null);
  const [countText, setCountText] = useState('1');
  const [unitType, setUnitType] = useState('apartment');
  const [features, setFeatures] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [prefill, setPrefill] = useState<(UnitPrefill & { link: boolean }) | null>(null);
  const { attach } = useListingAttachment(developmentId);
  const canLink = roleCan(role, 'listing.attach');
  const options = useStructureOptions(developmentId, buildings, floors);
  const choices = useUnitChoices();
  const describe = usePrefillDescription();

  const buildingId = chosenBuilding || (buildings.length === 1 ? buildings[0].id : '');
  const building = buildings.find((b) => b.id === buildingId);
  const buildingFloors = floors.filter((f) => f.buildingId === buildingId).sort((a, b) => a.level - b.level);
  const floor = buildingFloors.find((f) => f.id === floorId);
  const { units: onFloor } = useDevelopmentUnits(floor ? developmentId : undefined, { floorId: floor?.id, limit: 200 });

  // One listing describes one apartment, so a filled form adds a single unit.
  const count = prefill ? 1 : Math.max(1, Math.min(50, Number.parseInt(countText, 10) || 1));
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
        const { unit } = await createUnit({ ...(prefill ? fromListing(prefill.fields) : {}), buildingId, floorId: floor.id, unitNumber, unitType: unitType.trim() || 'apartment', features });
        if (prefill?.link) await attach({ unitId: unit.id, listingId: prefill.listing.id });
      }
      setNumberText(null);
      setCountText('1');
      setFeatures([]);
      setPrefill(null);
    } catch (err) {
      onError((err as { message?: string })?.message || t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const applyListing = (p: UnitPrefill, link: boolean) => {
    setPrefill({ ...p, link });
    if (p.fields.unitType) setUnitType(p.fields.unitType);
    if (p.fields.features?.length) setFeatures((prev) => [...new Set([...prev, ...(p.fields.features ?? [])])]);
    const match = buildingFloors.find((f) => f.level === p.floorLevel);
    if (match && !floorId) setFloorId(match.id);
  };
  const chooseBuilding = (id: string) => {
    setChosenBuilding(id);
    setNumberText(null);
    // Keep the listing's floor when the newly chosen building has that level.
    const match = prefill?.floorLevel === undefined ? undefined : floors.find((f) => f.buildingId === id && f.level === prefill.floorLevel);
    setFloorId(match?.id ?? '');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FillFromListing
        developmentId={developmentId}
        source={prefill ? { title: prefill.listing.title, filled: Object.keys(prefill.fields).length, skipped: prefill.skipped, link: prefill.link, details: describe(prefill.fields) } : null}
        canLink={canLink}
        disabled={busy}
        onFill={applyListing}
        onUndo={() => setPrefill(null)}
        onLinkChange={(link) => setPrefill((cur) => (cur ? { ...cur, link } : cur))}
        mode="create"
      />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-[1.7fr_1.1fr_0.9fr_0.5fr_1fr_auto] lg:items-end">
        <BuildingSelect options={options.buildingOptions} value={buildingId} onChange={chooseBuilding} />
        <FormSelect
          label={t('detail.floors')}
          placeholder="—"
          options={options.floorOptions(buildingId)}
          value={floorId}
          disabled={!buildingId}
          onChange={(e) => {
            setFloorId(e.target.value);
            setNumberText(null);
          }}
        />
        <Input label={t('unit.number')} value={numberText ?? numbers[0] ?? ''} placeholder={floor ? undefined : '401'} onChange={(e) => setNumberText(e.target.value || null)} disabled={!floor} />
        <Input label={t('unit.howMany', 'How many')} type="number" min={1} max={50} value={countText} onChange={(e) => setCountText(e.target.value)} disabled={!floor || !!prefill} />
        <FormSelect label={t('unit.type')} options={choices.types(unitType)} value={unitType} onChange={(e) => setUnitType(e.target.value)} />
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
