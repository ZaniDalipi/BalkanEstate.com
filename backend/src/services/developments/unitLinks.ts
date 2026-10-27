/**
 * Units sold together: an apartment "comes with" a parking spot or a storage
 * room, each of which is a unit of its own (own picture region, price, area,
 * details). The link lives on the apartment (`linkedUnitIds`); the other
 * direction ("sold with Apt A12") is derived.
 *
 * Rules: only parking and storage units can be added; they belong to the same
 * residence; a spot comes with one apartment at most; a parking spot can't
 * come with anything itself; at most MAX_LINKED_UNITS per apartment.
 */
import mongoose from 'mongoose';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import { ValidationError } from './developmentService';
import { applyErrorMeta, type ErrorDetails, type ErrorParams } from './errorMeta';
import { toObjectId } from './developmentRefs';

export const LINKABLE_UNIT_TYPES = ['parking', 'storage'] as const;
export const MAX_LINKED_UNITS = 10;

const LIVE = { $exists: false } as const;
const isLinkable = (type: unknown) => (LINKABLE_UNIT_TYPES as readonly string[]).includes(String(type));

type LinkField = 'linkedUnitIds' | 'unitType' | 'alsoLinkedUnitIds';

/** A rule broken by the "comes with" list (400), with a code the client translates, shown next to `field`. */
export class UnitLinkError extends ValidationError {
  constructor(message: string, code: string, field: LinkField = 'linkedUnitIds', params?: ErrorParams) {
    super(message, { code, field, params });
  }
}

/** A "this spot already comes with another apartment" clash (409). */
export class UnitLinkConflictError extends Error {
  readonly statusCode = 409;
  code?: string;
  details?: ErrorDetails;
  constructor(message: string, code: string, params?: ErrorParams) {
    super(message);
    this.name = 'UnitLinkConflictError';
    applyErrorMeta(this, { code, field: 'linkedUnitIds', params });
  }
}

/**
 * Validate the units `unit` should come with and return their ids. `null` or
 * an empty list clears them. Ids arrive encoded (or raw) from the client.
 */
export async function resolveLinkedUnits(
  developmentId: mongoose.Types.ObjectId,
  unit: { _id: unknown; unitType: string },
  raw: unknown,
  unitType = unit.unitType
): Promise<mongoose.Types.ObjectId[]> {
  if (raw === null) return [];
  if (!Array.isArray(raw)) throw new UnitLinkError('linkedUnitIds must be a list of unit ids', 'LINKS_NOT_LIST');
  const ids = raw.map((x) => toObjectId(x));
  if (ids.some((id) => !id)) throw new UnitLinkError('linkedUnitIds contains an invalid id', 'LINKS_INVALID_ID');
  const unique = [...new Map(ids.map((id) => [String(id), id as mongoose.Types.ObjectId])).values()];
  if (unique.length === 0) return [];
  if (unique.length > MAX_LINKED_UNITS) {
    throw new UnitLinkError(`A unit can come with at most ${MAX_LINKED_UNITS} parking spots or storage rooms`, 'LINKS_TOO_MANY', 'linkedUnitIds', { max: MAX_LINKED_UNITS });
  }
  if (isLinkable(unitType)) {
    throw new UnitLinkError('A parking spot or storage room cannot come with other units', 'LINKS_EXTRA_CANNOT_HAVE');
  }
  if (unique.some((id) => String(id) === String(unit._id))) {
    throw new UnitLinkError('A unit cannot come with itself', 'LINKS_SELF');
  }

  const found = await DevelopmentUnit.find({ _id: { $in: unique }, developmentId, deletedAt: LIVE })
    .select('unitNumber unitType')
    .lean();
  if (found.length !== unique.length) throw new UnitLinkError('linkedUnitIds: a unit was not found in this residence', 'LINKS_NOT_FOUND');
  const wrong = found.find((u) => !isLinkable(u.unitType));
  if (wrong) {
    throw new UnitLinkError(
      `Only parking spots and storage rooms can be added (${wrong.unitNumber} is a ${wrong.unitType})`,
      'LINKS_NOT_EXTRA',
      'linkedUnitIds',
      { unit: wrong.unitNumber, type: wrong.unitType }
    );
  }

  const taken = await DevelopmentUnit.findOne({
    developmentId,
    deletedAt: LIVE,
    _id: { $ne: unit._id },
    linkedUnitIds: { $in: unique },
  })
    .select('unitNumber linkedUnitIds')
    .lean();
  if (taken) {
    const clash = found.find((u) => (taken.linkedUnitIds ?? []).some((id) => String(id) === String(u._id)));
    throw new UnitLinkConflictError(`${clash?.unitNumber ?? 'This spot'} already comes with ${taken.unitNumber}`, 'LINKS_TAKEN', {
      unit: clash?.unitNumber ?? '',
      owner: taken.unitNumber,
    });
  }
  return unique;
}

/**
 * A unit's type may only change to parking/storage when it comes with nothing,
 * and away from parking/storage when no apartment comes with it.
 */
export async function assertTypeChangeKeepsLinks(
  developmentId: mongoose.Types.ObjectId,
  unit: { _id: unknown; linkedUnitIds?: unknown[] },
  nextType: string,
  nextLinked: unknown[] | undefined
): Promise<void> {
  const links = nextLinked ?? unit.linkedUnitIds ?? [];
  if (isLinkable(nextType) && links.length > 0) {
    throw new UnitLinkError('A parking spot or storage room cannot come with other units', 'TYPE_EXTRA_HAS_LINKS', 'unitType');
  }
  if (!isLinkable(nextType)) {
    const owner = await DevelopmentUnit.findOne({ developmentId, deletedAt: LIVE, linkedUnitIds: unit._id })
      .select('unitNumber')
      .lean();
    if (owner) {
      throw new UnitLinkError(
        `This unit is sold with ${owner.unitNumber}; remove it there before changing its type`,
        'TYPE_SOLD_WITH',
        'unitType',
        { owner: owner.unitNumber }
      );
    }
  }
}

/** After a unit is deleted, no apartment keeps pointing at it. */
export async function unlinkEverywhere(developmentId: mongoose.Types.ObjectId, unitId: unknown): Promise<void> {
  await DevelopmentUnit.updateMany({ developmentId, linkedUnitIds: unitId }, { $pull: { linkedUnitIds: unitId } });
}

/**
 * Both directions for a set of visible units: what each comes with (only
 * visible companions) and which units each is sold with.
 */
export function linkMaps(units: Array<{ _id: unknown; linkedUnitIds?: unknown[] }>) {
  const visible = new Set(units.map((u) => String(u._id)));
  const comesWith = new Map<string, string[]>();
  const soldWith = new Map<string, string[]>();
  for (const u of units) {
    const ids = (u.linkedUnitIds ?? []).map(String).filter((id) => visible.has(id));
    if (!ids.length) continue;
    comesWith.set(String(u._id), ids);
    for (const id of ids) soldWith.set(id, [...(soldWith.get(id) ?? []), String(u._id)]);
  }
  return { comesWith, soldWith };
}
