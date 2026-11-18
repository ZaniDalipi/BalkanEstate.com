import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import { PROPERTY_TYPE_OPTIONS } from '@/shared/constants/propertyTypes';
import type { PropertyType, PropertyTypeSelection } from '@/shared/types/property.types';
import { parsePropertyTypes, togglePropertyType } from '@/shared/search/propertyTypeSelection';
import GlassChoiceTile from './GlassChoiceTile';

const TYPE_ICON: Record<PropertyType, SoftIconName> = {
  house: 'home',
  apartment: 'building',
  villa: 'pool',
  'luxury-villa': 'crown',
  commercial: 'store',
  parking: 'car',
  land: 'tree',
  other: 'cube',
};

interface PropertyTypePickerProps {
  value: PropertyTypeSelection;
  onChange: (value: PropertyTypeSelection) => void;
}

/**
 * Property-type filter: one liquid-glass tile per type, any number chosen at
 * once. "Any" clears the choice and is lit while nothing is chosen.
 */
const PropertyTypePicker: React.FC<PropertyTypePickerProps> = ({ value, onChange }) => {
  const { t } = useTranslation(['search']);
  const labelId = useId();
  const chosen = parsePropertyTypes(value);

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span id={labelId} className="flex items-center gap-1.5 text-xs font-medium text-neutral-700">
          <SoftIcon name="home" className="w-5 h-5 flex-shrink-0" />
          {t('search:filters.propertyType', 'Property Type')}
        </span>
        <span className="text-[11px] text-neutral-500">
          {t('search:filters.propertyTypeHint', 'Choose one or more')}
        </span>
      </div>
      <div role="group" aria-labelledby={labelId} className="grid grid-cols-3 gap-2">
        <GlassChoiceTile
          icon="houses"
          label={t('search:propertyTypes.any', 'Any')}
          isOn={chosen.length === 0}
          onClick={() => onChange('any')}
        />
        {PROPERTY_TYPE_OPTIONS.map((option) => (
          <GlassChoiceTile
            key={option.value}
            icon={TYPE_ICON[option.value]}
            label={t(`search:${option.labelKey}`, option.fallback)}
            isOn={chosen.includes(option.value)}
            onClick={() => onChange(togglePropertyType(value, option.value))}
          />
        ))}
      </div>
    </div>
  );
};

export default PropertyTypePicker;
