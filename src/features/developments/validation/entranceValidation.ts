/**
 * The entrance form: the same rules and error codes as the server
 * (services/developments/entranceRules), so a refusal reads the same from
 * either side. Errors are `{ code, params }`, translated with `apiErrors.<code>`.
 */
import { ENTRANCE_KINDS, type DevelopmentEntrance, type EntranceKind, type EntrancePayload } from '../types';

export const ENTRANCE_LIMITS = { name: 120, code: 50, note: 200 } as const;

export interface EntranceForm {
  name: string;
  code: string;
  kind: EntranceKind;
  accessible: boolean;
  note: string;
}
export type EntranceField = 'name' | 'code' | 'kind' | 'note';
export type EntranceErrors = Partial<Record<EntranceField, { code: string; params?: Record<string, string | number> }>>;

export const EMPTY_ENTRANCE: EntranceForm = { name: '', code: '', kind: 'main', accessible: false, note: '' };

export const entranceToForm = (e?: DevelopmentEntrance): EntranceForm =>
  e ? { name: e.name, code: e.code ?? '', kind: e.kind ?? 'main', accessible: !!e.accessible, note: e.note ?? '' } : EMPTY_ENTRANCE;

/** A name the building's other entrances don't already use (compared without case or spaces). */
export const entranceNameTaken = (name: string, siblings: Pick<DevelopmentEntrance, 'id' | 'name'>[], selfId?: string): boolean =>
  siblings.some((s) => s.id !== selfId && s.name.trim().toLowerCase() === name.trim().toLowerCase());

export const validateEntranceForm = (f: EntranceForm, siblings: Pick<DevelopmentEntrance, 'id' | 'name'>[] = [], selfId?: string): EntranceErrors => {
  const errors: EntranceErrors = {};
  const name = f.name.trim();
  if (!name) errors.name = { code: 'FIELD_REQUIRED' };
  else if (name.length > ENTRANCE_LIMITS.name) errors.name = { code: 'FIELD_TOO_LONG', params: { max: ENTRANCE_LIMITS.name } };
  else if (entranceNameTaken(name, siblings, selfId)) errors.name = { code: 'ENTRANCE_NAME_TAKEN', params: { name } };
  if (f.code.trim().length > ENTRANCE_LIMITS.code) errors.code = { code: 'FIELD_TOO_LONG', params: { max: ENTRANCE_LIMITS.code } };
  if (f.note.trim().length > ENTRANCE_LIMITS.note) errors.note = { code: 'FIELD_TOO_LONG', params: { max: ENTRANCE_LIMITS.note } };
  if (!(ENTRANCE_KINDS as readonly string[]).includes(f.kind)) errors.kind = { code: 'FIELD_INVALID' };
  return errors;
};

/** What the server gets: trimmed text, blanks cleared (null) on edit and left out on create. */
export const entrancePayload = (f: EntranceForm, mode: 'create' | 'update'): EntrancePayload => {
  const blank = mode === 'update' ? null : undefined;
  return {
    name: f.name.trim(),
    code: f.code.trim() || blank,
    kind: f.kind,
    accessible: f.accessible,
    note: f.note.trim() || blank,
  };
};

/** A server field we show next to a form field. */
export const entranceFormField = (serverField?: string): EntranceField | undefined =>
  serverField === 'name' || serverField === 'code' || serverField === 'kind' || serverField === 'note' ? serverField : undefined;
