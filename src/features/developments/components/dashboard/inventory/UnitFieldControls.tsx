import React from 'react';
import { Input } from '@/src/shared/components/ui/Input';
import { FormSelect, type SelectOption } from '../../shared/FormSelect';
import type { UnitFormErrors, UnitFormState } from './unitForm';

/** Props every section of the unit editor receives. */
export interface UnitSectionProps {
  form: UnitFormState;
  set: <K extends keyof UnitFormState>(key: K, value: UnitFormState[K]) => void;
  /** Already-translated messages keyed by field. */
  errors: UnitFormErrors;
  disabled: { unit: boolean; price: boolean; availability: boolean };
}

type StringKey = {
  [K in keyof UnitFormState]: UnitFormState[K] extends string ? K : never;
}[keyof UnitFormState];

interface FieldProps extends Pick<UnitSectionProps, 'form' | 'set' | 'errors'> {
  name: StringKey;
  label: string;
  disabled?: boolean;
  required?: boolean;
}

export const TextField: React.FC<FieldProps & { list?: string; maxLength?: number }> = ({
  name,
  label,
  form,
  set,
  errors,
  disabled,
  required,
  list,
  maxLength,
}) => (
  <Input
    id={`unit-edit-${name}`}
    label={label}
    value={form[name] as string}
    onChange={(e) => set(name, e.target.value as UnitFormState[typeof name])}
    error={errors[name]}
    disabled={disabled}
    required={required}
    list={list}
    maxLength={maxLength}
  />
);

export const NumberField: React.FC<FieldProps & { step?: string; suffix?: string }> = ({
  name,
  label,
  form,
  set,
  errors,
  disabled,
  step = '1',
  suffix,
}) => (
  <Input
    id={`unit-edit-${name}`}
    label={suffix ? `${label} (${suffix})` : label}
    type="number"
    inputMode="decimal"
    min={0}
    step={step}
    value={form[name] as string}
    onChange={(e) => set(name, e.target.value as UnitFormState[typeof name])}
    error={errors[name]}
    disabled={disabled}
  />
);

export const SelectField: React.FC<FieldProps & { options: SelectOption[]; placeholder?: string }> = ({
  name,
  label,
  form,
  set,
  errors,
  disabled,
  required,
  options,
  placeholder,
}) => (
  <FormSelect
    id={`unit-edit-${name}`}
    label={label}
    value={form[name] as string}
    onChange={(e) => set(name, e.target.value as UnitFormState[typeof name])}
    error={errors[name]}
    disabled={disabled}
    required={required}
    options={options}
    placeholder={placeholder}
  />
);
