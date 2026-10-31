import { useState } from 'react';
import { useApiErrorText } from '../../../hooks/useApiErrorText';
import { useEntranceActions } from '../../../hooks/useEntranceActions';
import type { DevelopmentEntrance } from '../../../types';
import {
  entranceFormField,
  entrancePayload,
  entranceToForm,
  validateEntranceForm,
  type EntranceField,
  type EntranceForm,
} from '../../../validation/entranceValidation';

export type EntranceMessages = Partial<Record<EntranceField, string>>;

interface Options {
  developmentId: string;
  buildingId: string;
  /** The entrance being edited; absent when adding one. */
  entrance?: DevelopmentEntrance;
  /** The building's other entrances, for the "name already used" check. */
  siblings: DevelopmentEntrance[];
  onDone: (entrance: DevelopmentEntrance) => void;
}

/**
 * The entrance form: checks it like the server does, saves it, and puts a
 * server refusal next to the field it names (else above the buttons).
 */
export function useEntranceForm({ developmentId, buildingId, entrance, siblings, onDone }: Options) {
  const apiText = useApiErrorText();
  const actions = useEntranceActions(developmentId);
  const [form, setForm] = useState<EntranceForm>(() => entranceToForm(entrance));
  const [errors, setErrors] = useState<EntranceMessages>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof EntranceForm>(key: K, value: EntranceForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async () => {
    setFormError(null);
    const problems = validateEntranceForm(form, siblings, entrance?.id);
    const shown: EntranceMessages = Object.fromEntries(
      Object.entries(problems).map(([field, p]) => [field, apiText.forCode(p!.code, p!.params)])
    );
    setErrors(shown);
    if (Object.keys(shown).length > 0) return;
    try {
      const { entrance: saved } = entrance
        ? await actions.update({ entranceId: entrance.id, payload: entrancePayload(form, 'update') })
        : await actions.create({ buildingId, payload: entrancePayload(form, 'create') });
      onDone(saved);
    } catch (err) {
      const d = apiText.describe(err);
      const field = entranceFormField(d.field);
      if (field) setErrors((e) => ({ ...e, [field]: d.text }));
      else setFormError(d.text);
    }
  };

  return { form, set, errors, formError, submit, isSaving: actions.isBusy };
}
