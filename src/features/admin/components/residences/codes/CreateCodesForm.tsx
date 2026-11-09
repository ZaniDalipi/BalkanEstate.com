import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/src/shared/components/ui/Input';
import { SoftIcon } from '@/src/shared/illustrations';
import { useApiErrorText } from '@/src/features/developments/hooks/useApiErrorText';
import type { CreateResidenceCodes, CreatedResidenceCodes, ResidenceCodeKind } from '../../../api/residenceCodeAdminApi';
import { CODE_FORM_DEFAULTS, CODE_FORM_LIMITS, codeFormPayload, validateCodeForm, type CodeFormError, type CodeFormErrors, type CodeFormField, type CodeFormValues } from './residenceCodeForm';
import { useResidenceCodeText } from './useResidenceCodeText';

interface CreateCodesFormProps {
  onCreate: (body: CreateResidenceCodes) => Promise<CreatedResidenceCodes>;
  onCreated: (result: CreatedResidenceCodes) => void;
  onCancel: () => void;
  busy: boolean;
}

const KINDS: { kind: ResidenceCodeKind; icon: 'key' | 'building' }[] = [
  { kind: 'pass', icon: 'key' },
  { kind: 'extra_building', icon: 'building' },
];

/** New unlock codes: what they unlock, how many, how often each works, for how long, and who they are for. */
export const CreateCodesForm: React.FC<CreateCodesFormProps> = ({ onCreate, onCreated, onCancel, busy }) => {
  const { t } = useTranslation(['admin']);
  const apiText = useApiErrorText();
  const { kindLabel } = useResidenceCodeText();
  const [values, setValues] = useState<CodeFormValues>(CODE_FORM_DEFAULTS);
  const [errors, setErrors] = useState<CodeFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (patch: Partial<CodeFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))));
  };
  const text = (e?: CodeFormError) =>
    !e ? undefined : e.key === 'range' ? t('admin:residenceCodes.form.range', { min: e.min, max: e.max, defaultValue: 'Enter a whole number from {{min}} to {{max}}.' }) : t('admin:residenceCodes.form.tooLong', { max: e.max, defaultValue: '{{max}} characters at most.' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = validateCodeForm(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      onCreated(await onCreate(codeFormPayload(values)));
      setValues(CODE_FORM_DEFAULTS);
    } catch (err) {
      // The form checks the same rules first, so a refusal here is rare (a lost session, the server down): say it above the buttons.
      setFormError(apiText.describe(err).text);
    }
  };
  const field = (key: Exclude<CodeFormField, 'note'>, label: string, hint: string) => (
    <Input label={label} value={values[key]} onChange={(e) => set({ [key]: e.target.value })} inputMode="numeric" error={text(errors[key])} helperText={hint} disabled={busy} />
  );

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5" aria-labelledby="new-codes-heading">
      <h2 id="new-codes-heading" className="text-base font-semibold text-gray-900">{t('admin:residenceCodes.form.title', 'New unlock codes')}</h2>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-700">{t('admin:residenceCodes.form.kind', 'What they unlock')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {KINDS.map(({ kind, icon }) => (
            <label key={kind} className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 ${values.kind === kind ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-gray-300 hover:border-gray-400'}`}>
              <input type="radio" name="code-kind" value={kind} checked={values.kind === kind} onChange={() => set({ kind })} className="sr-only" disabled={busy} />
              <SoftIcon name={icon} className="h-8 w-8 shrink-0" />
              <span className="text-sm font-semibold text-gray-900">{kindLabel(kind)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        {field('count', t('admin:residenceCodes.form.count', 'How many codes'), t('admin:residenceCodes.form.countHint', { max: CODE_FORM_LIMITS.maxCount, defaultValue: 'Up to {{max}} at once' }))}
        {field('usageLimit', t('admin:residenceCodes.form.uses', 'Uses per code'), t('admin:residenceCodes.form.usesHint', 'Each account can use a code once'))}
        {field('days', t('admin:residenceCodes.form.days', 'Valid for (days)'), t('admin:residenceCodes.form.daysHint', { max: CODE_FORM_LIMITS.maxDays, defaultValue: 'Up to {{max}} days' }))}
      </div>
      <Input
        label={t('admin:residenceCodes.form.note', 'Note (who it is for)')}
        value={values.note}
        onChange={(e) => set({ note: e.target.value })}
        maxLength={CODE_FORM_LIMITS.note + 50}
        error={text(errors.note)}
        placeholder={t('admin:residenceCodes.form.notePlaceholder', 'e.g. Vardar Homes, agreed by phone')}
        disabled={busy}
      />
      {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {t('admin:residenceCodes.form.cancel', 'Cancel')}
        </button>
        <button type="submit" disabled={busy} className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {busy ? t('admin:residenceCodes.form.creating', 'Creating…') : t('admin:residenceCodes.form.create', 'Create codes')}
        </button>
      </div>
    </form>
  );
};
