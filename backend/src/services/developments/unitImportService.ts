/**
 * Import a residence's inventory from a spreadsheet in one go.
 *
 * The browser reads the CSV and maps its columns (see the frontend
 * `utils/csvImport`); this service receives clean rows and:
 *  - validates every row, collecting per-row errors instead of failing all;
 *  - finds buildings by name and floors by level, creating missing ones;
 *  - creates new units and (optionally) updates existing ones — only the
 *    fields the file actually contains, so blank cells never wipe data;
 *  - enforces the same permissions as manual edits (building/floor/unit
 *    management, price and availability changes);
 *  - with `dryRun`, reports exactly what would happen without writing.
 */
import mongoose from 'mongoose';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import DevelopmentUnit, { IDevelopmentUnit } from '../../models/DevelopmentUnit';
import {
  UNIT_AVAILABILITY_STATES,
  UNIT_CURRENCY,
  roleHasPermission,
  type DevelopmentPermission,
  type DevelopmentRole,
  type UnitAvailability,
} from '../../config/developments';
import { ValidationError } from './developmentService';
import { AuthorizationError } from './developmentListingService';
import { recordDevelopmentAudit } from './developmentAudit';
import { applyAvailabilityTransition, createBuilding, sanitizeFeatures } from './developmentInventoryService';
import { assertBuildingCapacity, buildingCapacity } from './billing/residenceBillingService';
import { permissionForUnitField } from './unitAdminService';
import { choiceProblem, currencyProblem } from './unitRules';

type Oid = mongoose.Types.ObjectId;

export const MAX_IMPORT_ROWS = 2000;

const NUMBER_FIELDS = ['beds', 'baths', 'livingRooms', 'totalArea', 'netArea', 'terraceArea', 'balconies', 'price', 'pricePerSqm'] as const;
const TEXT_FIELDS = ['unitType', 'orientation', 'viewType', 'description', 'currency', 'availability'] as const;
type NumberField = (typeof NUMBER_FIELDS)[number];
type TextField = (typeof TEXT_FIELDS)[number];

export interface ImportRow {
  /** 1-based row in the file, for messages. */
  row: number;
  building: string;
  level: number;
  floorLabel?: string;
  unitNumber: string;
  features?: string[];
  fields: Partial<Record<NumberField, number> & Record<TextField, string>>;
}

export interface UnitImportSummary {
  rows: number;
  buildingsCreated: string[];
  /** Set when the file adds more buildings than the residence's plan allows. */
  buildingLimit?: { limit: number; current: number; allowed: number };
  floorsCreated: number;
  unitsCreated: number;
  unitsUpdated: number;
  unchanged: number;
  skippedExisting: number;
  errors: ImportRowError[];
  dryRun: boolean;
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : '');
const key = (...parts: (string | number)[]) => parts.map((p) => String(p).toLowerCase()).join('\u0000');

/** A row that can't be imported: the English message (logs) and the code, field and values the client translates. */
export interface ImportRowError {
  row: number;
  message: string;
  code: string;
  field?: string;
  params?: Record<string, string | number>;
}

/** Validate one raw row from the request into an ImportRow, or a row error. */
export const normalizeImportRow = (raw: unknown, index: number): ImportRow | ImportRowError => {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const row = Number.isInteger(r.row) ? (r.row as number) : index + 1;
  const building = str(r.building, 120);
  const unitNumber = str(r.unitNumber, 60);
  const level = Number(r.level);
  if (!building) return { row, message: 'Building is missing', code: 'IMPORT_NO_BUILDING', field: 'building' };
  if (!unitNumber) return { row, message: 'Unit number is missing', code: 'IMPORT_NO_UNIT_NUMBER', field: 'unitNumber' };
  if (!Number.isInteger(level) || level < -10 || level > 200) return { row, message: 'Floor must be a whole number between -10 and 200', code: 'IMPORT_BAD_FLOOR', field: 'level', params: { min: -10, max: 200 } };

  const src = (r.fields && typeof r.fields === 'object' ? r.fields : {}) as Record<string, unknown>;
  const fields: ImportRow['fields'] = {};
  for (const f of NUMBER_FIELDS) {
    if (src[f] === undefined || src[f] === null || src[f] === '') continue;
    const n = Number(src[f]);
    if (!Number.isFinite(n) || n < 0) return { row, message: `${f} must be a positive number`, code: 'IMPORT_BAD_NUMBER', field: f, params: { value: String(src[f]) } };
    fields[f] = n;
  }
  for (const f of TEXT_FIELDS) {
    const v = str(src[f], f === 'description' ? 4000 : 60);
    if (v) fields[f] = v;
  }
  if (fields.availability && !(UNIT_AVAILABILITY_STATES as readonly string[]).includes(fields.availability)) {
    return { row, message: `Unknown availability "${fields.availability}"`, code: 'IMPORT_BAD_AVAILABILITY', field: 'availability', params: { value: fields.availability } };
  }
  if (fields.currency) {
    const problem = currencyProblem(fields.currency);
    if (problem) return { row, message: problem, code: 'CURRENCY_EUR_ONLY', field: 'currency', params: { value: fields.currency } };
    fields.currency = UNIT_CURRENCY;
  }
  for (const f of ['orientation', 'viewType'] as const) {
    const problem = fields[f] ? choiceProblem(f, fields[f] as string) : null;
    if (problem) return { row, message: problem, code: 'IMPORT_BAD_CHOICE', field: f, params: { value: fields[f] as string } };
  }
  const floorLabel = str(r.floorLabel, 60) || undefined;
  const features = Array.isArray(r.features) ? sanitizeFeatures(r.features) : undefined;
  return { row, building, level, unitNumber, floorLabel, features, fields };
};

const defaultFloorLabel = (level: number) => (level === 0 ? 'Ground floor' : level < 0 ? `Basement ${-level}` : `Floor ${level}`);
const floorKind = (level: number) => (level === 0 ? 'ground' : level < 0 ? 'basement' : 'standard');

/** Fields of `row` that differ from `unit` (only those the file provides). */
const changesFor = (row: ImportRow, unit: IDevelopmentUnit): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const current = unit as unknown as Record<string, unknown>;
  for (const [f, v] of Object.entries(row.fields)) if (current[f] !== v) out[f] = v;
  if (row.features && row.features.slice().sort().join() !== (unit.features ?? []).slice().sort().join()) out.features = row.features;
  return out;
};

export const importUnits = async (params: {
  developmentId: Oid;
  actorId: Oid;
  role: DevelopmentRole | undefined;
  rows: unknown;
  updateExisting: boolean;
  dryRun: boolean;
}): Promise<UnitImportSummary> => {
  const { developmentId, role, updateExisting, dryRun } = params;
  if (!Array.isArray(params.rows) || params.rows.length === 0) throw new ValidationError('The file has no rows to import', { code: 'IMPORT_EMPTY' });
  if (params.rows.length > MAX_IMPORT_ROWS) throw new ValidationError(`At most ${MAX_IMPORT_ROWS} rows per import`, { code: 'IMPORT_TOO_MANY', params: { max: MAX_IMPORT_ROWS } });

  const summary: UnitImportSummary = { rows: params.rows.length, buildingsCreated: [], floorsCreated: 0, unitsCreated: 0, unitsUpdated: 0, unchanged: 0, skippedExisting: 0, errors: [], dryRun };
  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  params.rows.forEach((raw, i) => {
    const r = normalizeImportRow(raw, i);
    if ('code' in r) return void summary.errors.push(r);
    const k = key(r.building, r.unitNumber);
    if (seen.has(k)) return void summary.errors.push({
        row: r.row,
        message: `Unit ${r.unitNumber} appears twice in ${r.building}`,
        code: 'IMPORT_DUPLICATE_ROW',
        field: 'unitNumber',
        params: { unit: r.unitNumber, building: r.building },
      });
    seen.add(k);
    rows.push(r);
  });

  const live = { developmentId, deletedAt: null };
  const [buildings, floors, units] = await Promise.all([
    DevelopmentBuilding.find(live).select('_id name order'),
    DevelopmentFloor.find(live).select('_id buildingId level'),
    DevelopmentUnit.find(live),
  ]);
  const buildingByName = new Map(buildings.map((b) => [key(b.name), b._id as Oid]));
  const floorByLevel = new Map(floors.map((f) => [key(String(f.buildingId), f.level), f._id as Oid]));
  const unitByNumber = new Map(units.map((u) => [key(String(u.buildingId), u.unitNumber), u]));

  // Plan, so a dry run and a real run agree exactly.
  const newBuildings = [...new Set(rows.filter((r) => !buildingByName.has(key(r.building))).map((r) => r.building))];
  const newFloors = new Map<string, { building: string; level: number; label: string }>();
  const creates: ImportRow[] = [];
  const updates: { row: ImportRow; unit: IDevelopmentUnit; changes: Record<string, unknown> }[] = [];
  for (const r of rows) {
    const bId = buildingByName.get(key(r.building));
    if (!bId || !floorByLevel.has(key(String(bId), r.level))) {
      const fk = key(r.building, r.level);
      if (!newFloors.has(fk)) newFloors.set(fk, { building: r.building, level: r.level, label: r.floorLabel || defaultFloorLabel(r.level) });
    }
    const existing = bId ? unitByNumber.get(key(String(bId), r.unitNumber)) : undefined;
    if (!existing) creates.push(r);
    else if (!updateExisting) summary.skippedExisting += 1;
    else {
      const changes = changesFor(r, existing);
      if (Object.keys(changes).length === 0) summary.unchanged += 1;
      else updates.push({ row: r, unit: existing, changes });
    }
  }

  // Same rules as editing by hand.
  const needed = new Set<DevelopmentPermission>();
  if (newBuildings.length) needed.add('building.manage');
  if (newFloors.size) needed.add('floor.manage');
  if (creates.length) needed.add('unit.manage');
  for (const r of creates) Object.keys(r.fields).forEach((f) => needed.add(permissionForUnitField(f)));
  for (const u of updates) Object.keys(u.changes).forEach((f) => needed.add(permissionForUnitField(f)));
  const denied = [...needed].filter((p) => !role || !roleHasPermission(role, p));
  if (denied.length) throw new AuthorizationError(`Your role cannot import this file (requires ${denied.join(', ')})`, { code: 'FORBIDDEN_FIELDS', params: { permissions: denied.join(', ') } });

  summary.buildingsCreated = newBuildings;
  summary.floorsCreated = newFloors.size;
  summary.unitsCreated = creates.length;
  summary.unitsUpdated = updates.length;
  // Residence Pass: check the building limit before anything is written, so a
  // file never stops half-way; the preview shows the limit instead of failing.
  if (newBuildings.length) {
    const capacity = await buildingCapacity(developmentId, newBuildings.length);
    if (capacity.ok === false) {
      if (dryRun) summary.buildingLimit = { limit: capacity.limit, current: capacity.current, allowed: capacity.allowed };
      else await assertBuildingCapacity(developmentId, newBuildings.length);
    }
  }
  if (dryRun) return summary;

  let order = buildings.reduce((m, b) => Math.max(m, b.order ?? 0), -1);
  for (const name of newBuildings) {
    const b = await createBuilding(developmentId, { name, order: (order += 1) });
    buildingByName.set(key(name), b._id as Oid);
  }
  const floorDocs = [...newFloors.values()].map((f) => ({
    developmentId,
    buildingId: buildingByName.get(key(f.building)),
    label: f.label,
    level: f.level,
    kind: floorKind(f.level),
    order: f.level,
  }));
  if (floorDocs.length) {
    const inserted = await DevelopmentFloor.insertMany(floorDocs);
    inserted.forEach((f) => floorByLevel.set(key(String(f.buildingId), f.level), f._id as Oid));
  }

  const unitDocs = creates.map((r) => {
    const buildingId = buildingByName.get(key(r.building)) as Oid;
    return {
      developmentId,
      buildingId,
      floorId: floorByLevel.get(key(String(buildingId), r.level)),
      unitNumber: r.unitNumber,
      unitType: r.fields.unitType || 'apartment',
      ...r.fields,
      features: r.features ?? [],
      currency: UNIT_CURRENCY,
      availability: (r.fields.availability as UnitAvailability) || 'not_released',
      visibility: 'public',
      priceVisibility: 'public',
    };
  });
  if (unitDocs.length) {
    try {
      await DevelopmentUnit.insertMany(unitDocs, { ordered: false });
    } catch (error) {
      // A unit created meanwhile by someone else: report those rows, keep the rest.
      const writeErrors = (error as { writeErrors?: { index: number }[] }).writeErrors ?? [];
      if (!writeErrors.length) throw error;
      for (const e of writeErrors) {
        const { row, unitNumber } = creates[e.index];
        summary.errors.push({ row, message: `Unit ${unitNumber} already exists`, code: 'UNIT_NUMBER_TAKEN', field: 'unitNumber', params: { number: unitNumber } });
      }
      summary.unitsCreated -= writeErrors.length;
    }
  }

  if (updates.length) {
    await DevelopmentUnit.bulkWrite(updates.map((u) => ({ updateOne: { filter: { _id: u.unit._id, developmentId }, update: { $set: u.changes } } })));
  }
  const availabilityChanged = updates.filter((u) => 'availability' in u.changes);
  const fresh = availabilityChanged.length ? await DevelopmentUnit.find({ _id: { $in: availabilityChanged.map((u) => u.unit._id) } }) : [];
  const prior = new Map(availabilityChanged.map((u) => [String(u.unit._id), u.unit.availability]));
  // Recomputes the stats and alerts followers of apartments that became available.
  await applyAvailabilityTransition(developmentId, fresh.map((unit) => ({ prior: prior.get(String(unit._id)), unit })));

  await recordDevelopmentAudit({
    developmentId,
    action: 'unit.import',
    actorId: params.actorId,
    targetType: 'development',
    targetId: developmentId,
    metadata: {
      rows: summary.rows,
      buildingsCreated: summary.buildingsCreated.length,
      floorsCreated: summary.floorsCreated,
      unitsCreated: summary.unitsCreated,
      unitsUpdated: summary.unitsUpdated,
      errors: summary.errors.length,
    },
  });
  return summary;
};
