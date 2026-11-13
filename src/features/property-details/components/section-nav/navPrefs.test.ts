import { describe, expect, it } from 'vitest';
import { DEFAULT_NAV_PREFS, readNavPrefs } from './navPrefs';

describe('readNavPrefs', () => {
  it('keeps valid stored preferences', () => {
    expect(readNavPrefs({ side: 'left', visibility: 'hidden' })).toEqual({ side: 'left', visibility: 'hidden' });
  });

  it('falls back to the defaults when nothing usable was stored', () => {
    for (const stored of [undefined, null, 'left', 42, []]) {
      expect(readNavPrefs(stored)).toEqual(DEFAULT_NAV_PREFS);
    }
  });

  it('replaces only the bad field, keeping the good one', () => {
    expect(readNavPrefs({ side: 'top', visibility: 'scroll' })).toEqual({ side: 'right', visibility: 'scroll' });
    expect(readNavPrefs({ side: 'left', visibility: 'sometimes' })).toEqual({ side: 'left', visibility: 'always' });
  });

  it('ignores unknown extra fields', () => {
    expect(readNavPrefs({ side: 'left', visibility: 'always', colour: 'red' })).toEqual({ side: 'left', visibility: 'always' });
  });
});
