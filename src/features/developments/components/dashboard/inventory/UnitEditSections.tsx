import React from 'react';
import { useTranslation } from 'react-i18next';
import { AVAILABILITY_ORDER } from '../../../utils/availability';
import type { DevelopmentBuilding, DevelopmentFloor } from '../../../types';
import { NumberField, SelectField, TextField, type UnitSectionProps } from './UnitFieldControls';
import { useUnitChoices } from './useUnitChoices';


const Fieldset: React.FC<{ legend: string; children: React.ReactNode }> = ({ legend, children }) => (
  <fieldset className="rounded-xl border border-slate-200 p-3">
    <legend className="px-1 text-sm font-semibold text-slate-900">{legend}</legend>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
  </fieldset>
);

interface IdentityProps extends UnitSectionProps {
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
}

/** Unit number, type, location (floor list filtered by building), status and visibility. */
export const UnitIdentitySection: React.FC<IdentityProps> = ({ buildings, floors, ...p }) => {
  const { t } = useTranslation('developments');
  const choices = useUnitChoices();
  const floorOptions = floors
    .filter((f) => f.buildingId === p.form.buildingId)
    .sort((a, b) => a.level - b.level)
    .map((f) => ({ value: f.id, label: f.label }));

  return (
    <Fieldset legend={t('inventory.edit.identity', 'Unit')}>
      <TextField {...p} name="unitNumber" label={t('unit.number', 'Unit number')} required disabled={p.disabled.unit} maxLength={40} />
      <SelectField {...p} name="unitType" label={t('unit.type', 'Type')} required disabled={p.disabled.unit} options={choices.types(p.form.unitType)} />
      <SelectField
        {...p}
        set={(key, value) => {
          p.set(key, value);
          // Changing building invalidates the floor (a floor belongs to one building).
          if (key === 'buildingId') p.set('floorId', '');
        }}
        name="buildingId"
        label={t('inventory.filters.building', 'Building')}
        required
        disabled={p.disabled.unit}
        options={buildings.map((b) => ({ value: b.id, label: b.name }))}
        placeholder={t('inventory.edit.selectBuilding', 'Select a building')}
      />
      <SelectField
        {...p}
        name="floorId"
        label={t('inventory.filters.floor', 'Floor')}
        required
        disabled={p.disabled.unit || !p.form.buildingId}
        options={floorOptions}
        placeholder={t('inventory.edit.selectFloor', 'Select a floor')}
      />
      <SelectField
        {...p}
        name="availability"
        label={t('unit.availability', 'Availability')}
        disabled={p.disabled.availability}
        options={AVAILABILITY_ORDER.map((s) => ({ value: s, label: t(`availability.${s}`) }))}
      />
      <SelectField
        {...p}
        name="visibility"
        label={t('inventory.col.visibility', 'Visibility')}
        disabled={p.disabled.unit}
        options={[
          { value: 'public', label: t('inventory.visibility.public', 'Public') },
          { value: 'hidden', label: t('inventory.visibility.hidden', 'Hidden') },
        ]}
      />
    </Fieldset>
  );
};

/** Rooms, areas and outlook. */
export const UnitSizeSection: React.FC<UnitSectionProps> = (p) => {
  const { t } = useTranslation('developments');
  const choices = useUnitChoices();
  const d = p.disabled.unit;
  return (
    <Fieldset legend={t('inventory.edit.layout', 'Layout & size')}>
      <NumberField {...p} name="beds" label={t('unit.beds', 'Beds')} disabled={d} />
      <NumberField {...p} name="baths" label={t('unit.baths', 'Baths')} disabled={d} />
      <NumberField {...p} name="livingRooms" label={t('inventory.edit.livingRooms', 'Living rooms')} disabled={d} />
      <NumberField {...p} name="netArea" label={t('inventory.edit.netArea', 'Internal area')} suffix="m²" step="0.01" disabled={d} />
      <NumberField {...p} name="totalArea" label={t('inventory.edit.totalArea', 'Total area')} suffix="m²" step="0.01" disabled={d} />
      <NumberField {...p} name="externalArea" label={t('inventory.edit.externalArea', 'External area')} suffix="m²" step="0.01" disabled={d} />
      <NumberField {...p} name="terraceArea" label={t('inventory.edit.terraceArea', 'Terrace area')} suffix="m²" step="0.01" disabled={d} />
      <NumberField {...p} name="balconies" label={t('inventory.edit.balconies', 'Balconies')} disabled={d} />
      <NumberField {...p} name="terraces" label={t('inventory.edit.terraces', 'Terraces')} disabled={d} />
      <SelectField {...p} name="orientation" label={t('unit.orientation', 'Orientation')} disabled={d} options={choices.orientations(p.form.orientation)} placeholder={t('inventory.edit.notSet', 'Not set')} />
      <SelectField {...p} name="viewType" label={t('inventory.edit.viewType', 'View')} disabled={d} options={choices.views(p.form.viewType)} placeholder={t('inventory.edit.notSet', 'Not set')} />
    </Fieldset>
  );
};
