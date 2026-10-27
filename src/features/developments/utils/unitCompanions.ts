/**
 * Units sold together (an apartment and its parking spot / storage room):
 * who comes with whom, and which picture regions light up together.
 */
import type { Hotspot, PublicUnit } from '../types';

export const EXTRA_UNIT_TYPES = ['parking', 'storage'] as const;
export const isExtraUnit = (unitType?: string): boolean => (EXTRA_UNIT_TYPES as readonly string[]).includes(String(unitType));

type Units = Map<string, Pick<PublicUnit, 'id' | 'linkedUnitIds' | 'soldWithUnitIds'>>;

/** What `unit` comes with and what it is sold with, as loaded units. */
export function companionsOf<T extends Pick<PublicUnit, 'linkedUnitIds' | 'soldWithUnitIds'>>(unit: T, unitsById: Map<string, PublicUnit>) {
  const pick = (ids?: string[]) => (ids ?? []).map((id) => unitsById.get(id)).filter((u): u is PublicUnit => !!u);
  return { comesWith: pick(unit.linkedUnitIds), soldWith: pick(unit.soldWithUnitIds) };
}

/**
 * Every other unit in the same bundle: an apartment's spots, or a spot's
 * apartment together with that apartment's other spots.
 */
export function bundleIds(unitId: string, unitsById: Units): Set<string> {
  const unit = unitsById.get(unitId);
  if (!unit) return new Set();
  const owners = unit.soldWithUnitIds?.length ? unit.soldWithUnitIds : [unitId];
  const out = new Set<string>();
  for (const ownerId of owners) {
    out.add(ownerId);
    for (const id of unitsById.get(ownerId)?.linkedUnitIds ?? []) out.add(id);
  }
  out.delete(unitId);
  return out;
}

/** Regions to light up alongside the hovered one: the units sold together with it. */
export function linkedHotspotIds(hovered: Hotspot | undefined, hotspots: Hotspot[], unitsById: Units): Set<string> {
  if (!hovered || hovered.linkType !== 'unit') return new Set();
  const bundle = bundleIds(hovered.linkId, unitsById);
  if (bundle.size === 0) return new Set();
  return new Set(hotspots.filter((h) => h.id !== hovered.id && h.linkType === 'unit' && bundle.has(h.linkId)).map((h) => h.id));
}
