import type { CreateResidenceCodes, ResidenceCodeKind } from '../../../api/residenceCodeAdminApi';

/** Same limits as the server (services/developments/billing/residenceCodes). */
export const CODE_FORM_LIMITS = { maxCount: 50, maxUses: 100, minDays: 1, maxDays: 730, note: 200 } as const;

export interface CodeFormValues {
  kind: ResidenceCodeKind;
  count: string;
  usageLimit: string;
  days: string;
  note: string;
}

export type CodeFormField = 'count' | 'usageLimit' | 'days' | 'note';
export type CodeFormError = { key: 'range'; min: number; max: number } | { key: 'tooLong'; max: number };
export type CodeFormErrors = Partial<Record<CodeFormField, CodeFormError>>;

export const CODE_FORM_DEFAULTS: CodeFormValues = { kind: 'pass', count: '1', usageLimit: '1', days: '90', note: '' };

const whole = (raw: string): number | null => (/^\d+$/.test(raw.trim()) ? Number(raw.trim()) : null);

/** Every problem at once, per field; empty when the form can be sent. */
export function validateCodeForm(v: CodeFormValues): CodeFormErrors {
  const L = CODE_FORM_LIMITS;
  const errors: CodeFormErrors = {};
  const range = (field: Exclude<CodeFormField, 'note'>, min: number, max: number) => {
    const n = whole(v[field]);
    if (n === null || n < min || n > max) errors[field] = { key: 'range', min, max };
  };
  range('count', 1, L.maxCount);
  range('usageLimit', 1, L.maxUses);
  range('days', L.minDays, L.maxDays);
  if (v.note.trim().length > L.note) errors.note = { key: 'tooLong', max: L.note };
  return errors;
}

/** What to send once the form is valid. */
export const codeFormPayload = (v: CodeFormValues): CreateResidenceCodes => ({
  kind: v.kind,
  count: Number(v.count.trim()),
  usageLimit: Number(v.usageLimit.trim()),
  days: Number(v.days.trim()),
  ...(v.note.trim() ? { note: v.note.trim() } : {}),
});
