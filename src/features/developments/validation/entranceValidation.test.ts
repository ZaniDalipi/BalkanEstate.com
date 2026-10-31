import { describe, expect, it } from 'vitest';
import { EMPTY_ENTRANCE, entranceFormField, entrancePayload, validateEntranceForm } from './entranceValidation';

const siblings = [{ id: 'e1', name: 'Entrance A' }];

describe('validateEntranceForm', () => {
  it('needs a name the building does not already use, and keeps text within the limits', () => {
    expect(validateEntranceForm(EMPTY_ENTRANCE)).toEqual({ name: { code: 'FIELD_REQUIRED' } });
    expect(validateEntranceForm({ ...EMPTY_ENTRANCE, name: ' entrance a ' }, siblings)).toEqual({ name: { code: 'ENTRANCE_NAME_TAKEN', params: { name: 'entrance a' } } });
    // Its own name is fine when editing it.
    expect(validateEntranceForm({ ...EMPTY_ENTRANCE, name: 'Entrance A' }, siblings, 'e1')).toEqual({});
    expect(validateEntranceForm({ ...EMPTY_ENTRANCE, name: 'B', note: 'n'.repeat(201), code: 'c'.repeat(51) })).toEqual({
      note: { code: 'FIELD_TOO_LONG', params: { max: 200 } },
      code: { code: 'FIELD_TOO_LONG', params: { max: 50 } },
    });
  });

  it('sends trimmed text, clearing blanks only when editing', () => {
    const f = { ...EMPTY_ENTRANCE, name: ' Garage ', kind: 'garage' as const, note: ' ' };
    expect(entrancePayload(f, 'create')).toEqual({ name: 'Garage', code: undefined, kind: 'garage', accessible: false, note: undefined });
    expect(entrancePayload(f, 'update')).toMatchObject({ code: null, note: null });
    expect(entranceFormField('note')).toBe('note');
    expect(entranceFormField('buildingId')).toBeUndefined();
  });
});
