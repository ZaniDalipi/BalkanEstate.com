import { describe, it, expect } from 'vitest';
import { planPanels, type PanelHandoffInput } from './panelHandoff';

const base: PanelHandoffInput = {
  oneAtATime: true,
  listWanted: false,
  mapWanted: false,
  listReleased: false,
  listGone: false,
  mapReleased: false,
  mapGone: false,
  deferredList: true,
  deferredMap: true,
};
const plan = (o: Partial<PanelHandoffInput>) => planPanels({ ...base, ...o });

/** The phases of a switch towards the list (`toList`) or towards the map. */
const toList = {
  tapped: { listWanted: true, mapWanted: false },
  released: { listWanted: true, mapWanted: false, mapReleased: true },
  gone: { listWanted: true, mapWanted: false, mapReleased: true, mapGone: true },
};
const toMap = {
  tapped: { mapWanted: true, listWanted: false },
  released: { mapWanted: true, listWanted: false, listReleased: true },
  gone: { mapWanted: true, listWanted: false, listReleased: true, listGone: true },
};

describe('planPanels (one panel at a time)', () => {
  it('opens on the map with no list built behind it', () => {
    expect(plan(toMap.gone)).toMatchObject({ renderMap: true, renderList: false, mapPending: false });
  });

  it('opens on the list with no map built behind it', () => {
    expect(plan(toList.gone)).toMatchObject({ renderList: true, renderMap: false, listPending: false });
  });

  it('map → list: the map rides out the slide, is released, and only then is the list built', () => {
    expect(plan(toList.tapped)).toMatchObject({ renderMap: true, renderList: false, listPending: true });
    expect(plan(toList.released)).toMatchObject({ renderMap: false, renderList: false, listPending: true });
    expect(plan(toList.gone)).toMatchObject({ renderMap: false, renderList: true, listPending: false });
  });

  it('list → map: the list rides out the slide, is released, and only then is the map built', () => {
    expect(plan(toMap.tapped)).toMatchObject({ renderList: true, renderMap: false, mapPending: true });
    expect(plan(toMap.released)).toMatchObject({ renderList: false, renderMap: false, mapPending: true });
    expect(plan(toMap.gone)).toMatchObject({ renderList: false, renderMap: true, mapPending: false });
  });

  it('never renders both panels at the same moment', () => {
    const b = [true, false];
    for (const listWanted of b) for (const listReleased of b) for (const listGone of b)
      for (const mapReleased of b) for (const mapGone of b) {
        // `gone` always follows `released` (same timer, longer delay).
        if ((listGone && !listReleased) || (mapGone && !mapReleased)) continue;
        // The panel on screen is never released.
        if ((listWanted && (listReleased || listGone)) || (!listWanted && (mapReleased || mapGone))) continue;
        const p = planPanels({ ...base, listWanted, mapWanted: !listWanted, listReleased, listGone, mapReleased, mapGone });
        expect(p.renderList && p.renderMap).toBe(false);
      }
  });

  it('keeps the old deferred behaviour where both panels share the screen', () => {
    expect(plan({ oneAtATime: false, deferredList: true, deferredMap: false })).toEqual({
      renderList: true, renderMap: false, listPending: false, mapPending: false,
    });
  });
});
