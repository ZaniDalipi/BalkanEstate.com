/**
 * Turn a parsed sheet plus the column choices into the rows the import API
 * takes, and the problems to show before importing. Values are read with the
 * forgiving parsers in `values.ts`; the floor falls back to the unit number
 * ("401" → floor 4) when the sheet has no floor column.
 */
import { floorLabelFor, type FloorNames } from '../inventoryNaming';
import { IGNORE, type ColumnTarget, type ImportField } from './fields';
import { levelFromUnitNumber, parseAvailability, parseCurrency, parseFeatures, parseLevel, parseNumber, parseOrientation, parseUnitType, parseView } from './values';

export interface ImportRowPayload {
  row: number;
  building: string;
  /** The entrance within the building, when the sheet has an Entrance column. */
  entrance?: string;
  level: number;
  floorLabel?: string;
  unitNumber: string;
  features?: string[];
  fields: Record<string, number | string>;
}

export type ProblemCode = 'noUnitNumber' | 'noFloor' | 'badNumber' | 'badAvailability' | 'noBuilding' | 'badChoice' | 'notEuro';
export interface ImportProblem {
  row: number;
  code: ProblemCode;
  field?: ImportField;
  value?: string;
}

export interface PreparedImport {
  rows: ImportRowPayload[];
  problems: ImportProblem[];
  buildings: string[];
  /** "Building · Entrance" for every entrance the rows name. */
  entrances: string[];
  floors: number;
  /** True when floors were read from unit numbers. */
  floorsFromUnitNumbers: boolean;
}

const NUMERIC: ImportField[] = ['beds', 'baths', 'livingRooms', 'totalArea', 'netArea', 'terraceArea', 'balconies', 'price', 'pricePerSqm'];
const TEXT: ImportField[] = ['description'];

export const buildImportRows = (
  table: string[][],
  columns: ColumnTarget[],
  options: {
    defaultBuilding: string;
    floorNames: FloorNames;
    /** Importing for one building: every row goes there, whatever a building column says. */
    forceBuilding?: string;
  }
): PreparedImport => {
  const at = (cells: string[], field: ImportField) => {
    const i = columns.indexOf(field);
    return i >= 0 ? (cells[i] ?? '').trim() : '';
  };
  const hasFloor = columns.includes('floor');
  const rows: ImportRowPayload[] = [];
  const problems: ImportProblem[] = [];

  table.slice(1).forEach((cells, i) => {
    const row = i + 2; // the header is row 1
    const unitNumber = at(cells, 'unitNumber');
    if (!unitNumber) return void problems.push({ row, code: 'noUnitNumber' });
    const building = options.forceBuilding?.trim() || at(cells, 'building') || options.defaultBuilding.trim();
    const entrance = at(cells, 'entrance');
    if (!building) return void problems.push({ row, code: 'noBuilding' });

    const floorCell = at(cells, 'floor');
    const level = hasFloor ? parseLevel(floorCell) : levelFromUnitNumber(unitNumber);
    if (level === null || level === undefined) return void problems.push({ row, code: 'noFloor', value: floorCell || unitNumber });
    const floorLabel = floorCell && !/^-?\d+$/.test(floorCell) ? floorCell : floorLabelFor(level, options.floorNames);

    const fields: Record<string, number | string> = {};
    for (const f of NUMERIC) {
      const v = parseNumber(at(cells, f));
      if (v === null) return void problems.push({ row, code: 'badNumber', field: f, value: at(cells, f) });
      if (v !== undefined) fields[f] = v;
    }
    for (const f of TEXT) if (at(cells, f)) fields[f] = at(cells, f);
    const type = parseUnitType(at(cells, 'unitType'));
    if (type) fields.unitType = type;
    const availability = parseAvailability(at(cells, 'availability'));
    if (availability === null) return void problems.push({ row, code: 'badAvailability', value: at(cells, 'availability') });
    if (availability) fields.availability = availability;
    for (const [field, parse] of [['orientation', parseOrientation], ['viewType', parseView]] as const) {
      const v = parse(at(cells, field));
      if (v === null) return void problems.push({ row, code: 'badChoice', field, value: at(cells, field) });
      if (v) fields[field] = v;
    }
    // Residence prices are in euros; a price written in another currency is not guessed at.
    const currency = parseCurrency(at(cells, 'currency')) ?? (at(cells, 'price') ? parseCurrency(at(cells, 'price')) : undefined);
    if (currency && currency !== 'EUR') return void problems.push({ row, code: 'notEuro', value: currency });
    if (currency) fields.currency = currency;
    const features = parseFeatures(at(cells, 'features'));

    rows.push({ row, building, ...(entrance ? { entrance } : {}), level, floorLabel, unitNumber, fields, ...(features ? { features } : {}) });
  });

  const buildings = [...new Set(rows.map((r) => r.building))];
  const floors = new Set(rows.map((r) => `${r.building.toLowerCase()}|${r.level}`)).size;
  const entrances = [...new Set(rows.filter((r) => r.entrance).map((r) => `${r.building} · ${r.entrance}`))];
  return { rows, problems, buildings, entrances, floors, floorsFromUnitNumbers: !hasFloor };
};

/** Columns the sheet must provide (or that can be inferred). */
export const missingRequired = (columns: ColumnTarget[]): ImportField[] =>
  columns.includes('unitNumber') ? [] : ['unitNumber'];

export { IGNORE };
