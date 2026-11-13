import { describe, expect, it, vi } from 'vitest';
import { useSectionNavPrefs } from './sectionNavStore';
import type { RailSide } from './navPrefs';

const stored = (state: unknown) => vi.mocked(localStorage.getItem).mockReturnValueOnce(JSON.stringify({ state, version: 0 }));

describe('useSectionNavPrefs', () => {
  it('reads back valid preferences saved on the device', async () => {
    stored({ side: 'left', visibility: 'scroll' });
    await useSectionNavPrefs.persist.rehydrate();
    expect(useSectionNavPrefs.getState()).toMatchObject({ side: 'left', visibility: 'scroll' });
  });

  it('replaces a damaged saved value with its default', async () => {
    stored({ side: 'top', visibility: 'hidden' });
    await useSectionNavPrefs.persist.rehydrate();
    expect(useSectionNavPrefs.getState()).toMatchObject({ side: 'right', visibility: 'hidden' });
  });

  it('ignores a value from outside the allowed choices', () => {
    useSectionNavPrefs.getState().setSide('left');
    useSectionNavPrefs.getState().setSide('middle' as RailSide);
    expect(useSectionNavPrefs.getState().side).toBe('left');
  });
});
