import { describe, it, expect } from 'vitest';
import { pickHint, hintsFor, HINT_COOLDOWN_MS, MAX_AUTO_HINTS_PER_VISIT } from './pickHint';
import { HINTS } from './hintCatalog';
import { hintFitsDevice } from './hintDevice';
import { hintPageFor } from './hintPage';
import { groupHints } from './hintGroups';

const phone = { touch: true, installed: false };
const laptop = { touch: false, installed: false };
const base = { page: 'property' as const, device: phone, enabled: true, seen: [], lastShownAt: null, shownThisVisit: 0, now: 1_000_000 };

describe('pickHint', () => {
  it('offers the agent long-press tip first on a listing on a phone', () => {
    expect(pickHint(base)?.id).toBe('agentHold');
  });

  it('never offers a touch-only tip on a laptop', () => {
    expect(pickHint({ ...base, device: laptop })?.id).toBe('photoOpenPointer');
  });

  it('skips tips already seen', () => {
    expect(pickHint({ ...base, seen: ['agentHold'] })?.id).toBe('photoOpenTouch');
  });

  it('falls back to a global tip once the page has none left, starting with where tips live', () => {
    const seen = HINTS.filter((h) => h.page === 'property').map((h) => h.id);
    expect(pickHint({ ...base, seen })?.id).toBe('findTips');
  });

  it('returns null when every tip was seen', () => {
    expect(pickHint({ ...base, seen: HINTS.map((h) => h.id) })).toBeNull();
  });

  it('stays quiet when tips are off', () => {
    expect(pickHint({ ...base, enabled: false })).toBeNull();
  });

  it('waits for the cooldown after the last tip', () => {
    expect(pickHint({ ...base, lastShownAt: base.now - HINT_COOLDOWN_MS + 1 })).toBeNull();
    expect(pickHint({ ...base, lastShownAt: base.now - HINT_COOLDOWN_MS })?.id).toBe('agentHold');
  });

  it('shows only a few tips per visit', () => {
    expect(pickHint({ ...base, shownThisVisit: MAX_AUTO_HINTS_PER_VISIT })).toBeNull();
  });
});

describe('hintsFor', () => {
  it('lists only global tips on a page without its own', () => {
    expect(hintsFor('global', phone).every((h) => h.page === 'global')).toBe(true);
  });
});

describe('hintFitsDevice', () => {
  const swipeBack = HINTS.find((h) => h.id === 'swipeBack')!;
  it('offers the installed-app tip only in the installed app on touch', () => {
    expect(hintFitsDevice(swipeBack, phone)).toBe(false);
    expect(hintFitsDevice(swipeBack, { touch: true, installed: true })).toBe(true);
    expect(hintFitsDevice(swipeBack, { touch: false, installed: true })).toBe(false);
  });
});

describe('hintPageFor', () => {
  it('maps routes to tip pages', () => {
    expect(hintPageFor('search', 'property')).toBe('property');
    expect(hintPageFor('search')).toBe('search');
    expect(hintPageFor('agents', 'agent')).toBe('global');
    expect(hintPageFor('home')).toBe('global');
  });
});

describe('groupHints', () => {
  it('puts the page on screen first and drops empty groups', () => {
    const groups = groupHints('search', laptop);
    expect(groups.map((g) => g.page)).toEqual(['search', 'property', 'global']);
    expect(groups[0].current).toBe(true);
    expect(groups.flatMap((g) => g.hints).some((h) => h.device === 'touch')).toBe(false);
  });
});

describe('catalog', () => {
  it('has unique ids and keys under hints.items', () => {
    expect(new Set(HINTS.map((h) => h.id)).size).toBe(HINTS.length);
    expect(HINTS.every((h) => h.key === `hints.items.${h.id}`)).toBe(true);
  });
});
