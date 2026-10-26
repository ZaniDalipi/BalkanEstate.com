import { describe, it, expect } from 'vitest';
import { splitAtToken } from './splitAtToken';

describe('splitAtToken', () => {
  it('splits around the marker wherever the language puts it', () => {
    expect(splitAtToken('Bargain spotted: @@ costs 1 €.', '@@')).toEqual({ before: 'Bargain spotted: ', after: ' costs 1 €.' });
    expect(splitAtToken('@@ kostet 1 €.', '@@')).toEqual({ before: '', after: ' kostet 1 €.' });
  });

  it('returns null when the marker is missing', () => {
    expect(splitAtToken('No marker here', '@@')).toBeNull();
  });
});
