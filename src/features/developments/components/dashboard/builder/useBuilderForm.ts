import { useMemo, useState } from 'react';
import { useUpdateDevelopment } from '../../../hooks/useDevelopmentMutations';
import { useApiErrorText } from '../../../hooks/useApiErrorText';
import type { Development } from '../../../types';
import { builderPayload, builderToForm, formFieldOf, validateBuilderForm, type BuilderField, type BuilderForm } from '../../../validation/builderValidation';

export type BuilderMessages = Partial<Record<BuilderField, string>>;

const sameForm = (a: BuilderForm, b: BuilderForm) => JSON.stringify(a) === JSON.stringify(b);

/**
 * State and saving of the builder form. Checks every field before sending; a
 * server refusal goes next to the field it names (`builder.<field>`), anything
 * else above the buttons. All texts come translated from the error codes.
 */
export function useBuilderForm(development: Development) {
  const apiText = useApiErrorText();
  const { update, isLoading } = useUpdateDevelopment(development.id);
  const [baseline, setBaseline] = useState(() => builderToForm(development.builder));
  const [form, setForm] = useState<BuilderForm>(baseline);
  const [errors, setErrors] = useState<BuilderMessages>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = useMemo(() => !sameForm(form, baseline), [form, baseline]);

  const set = (field: BuilderField, value: string) => {
    setSaved(false);
    setFormError(null);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setForm((prev) => {
      if (!field.startsWith('socials.')) return { ...prev, [field]: value };
      const network = field.slice('socials.'.length) as keyof BuilderForm['socials'];
      return { ...prev, socials: { ...prev.socials, [network]: value } };
    });
  };

  const save = async (): Promise<boolean> => {
    setFormError(null);
    const found = validateBuilderForm(form);
    const messages = Object.fromEntries(Object.entries(found).map(([k, e]) => [k, apiText.forCode(e!.code, e!.params)])) as BuilderMessages;
    setErrors(messages);
    if (Object.keys(messages).length > 0) return false;
    try {
      const { development: next } = await update({ builder: builderPayload(form) });
      const fresh = builderToForm(next.builder);
      setBaseline(fresh);
      setForm(fresh);
      setSaved(true);
      return true;
    } catch (err) {
      const { text, field } = apiText.describe(err);
      const own = formFieldOf(field);
      if (own) setErrors({ [own]: text });
      setFormError(text);
      return false;
    }
  };

  const discard = () => {
    setForm(baseline);
    setErrors({});
    setFormError(null);
  };

  return { form, set, errors, formError, saved, dirty, saving: isLoading, save, discard };
}
