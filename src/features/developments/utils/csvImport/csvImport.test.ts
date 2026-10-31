import { describe, it, expect } from 'vitest';
import { buildImportRows, buildTemplateCsv, guessColumns, parseCsv } from './index';
import { levelFromUnitNumber, parseAvailability, parseFeatures, parseLevel, parseNumber, parseUnitType } from './values';

const names = { ground: 'Ground floor', floor: (l: number) => `Floor ${l}`, basement: (n: number) => `Basement ${n}` };

describe('parseCsv', () => {
  it('detects the separator, handles quotes, BOM and our export apostrophes', () => {
    expect(parseCsv('﻿a;b;c\r\n1;"x;y";3\r\n\r\n')).toEqual([['a', 'b', 'c'], ['1', 'x;y', '3']]);
    expect(parseCsv('"Unit","Note"\n"A1","He said ""hi"""\n"A2","\'=SUM(1)"')).toEqual([['Unit', 'Note'], ['A1', 'He said "hi"'], ['A2', '=SUM(1)']]);
    expect(parseCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('guessColumns', () => {
  it('recognises English, Albanian and BCMS headers', () => {
    expect(guessColumns(['Objekti', 'Kati', 'Nr. i banesës', 'Sipërfaqja (m²)', 'Çmimi €', 'Statusi', 'Dhoma gjumi'])).toEqual([
      'building', 'floor', 'unitNumber', 'totalArea', 'price', 'availability', 'beds',
    ]);
    expect(guessColumns(['Zgrada', 'Sprat', 'Stan', 'Kvadratura', 'Cijena po m2', 'Cijena', 'Dostupnost'])).toEqual([
      'building', 'floor', 'unitNumber', 'totalArea', 'pricePerSqm', 'price', 'availability',
    ]);
  });

  it('reads our own export back, ignoring computed columns', () => {
    const header = ['Unit number', 'Building', 'Floor', 'Type', 'Beds', 'Baths', 'Area (m2)', 'Price', 'Currency', 'Availability', 'Effective availability', 'Visibility', 'Linked listings'];
    expect(guessColumns(header)).toEqual(['unitNumber', 'building', 'floor', 'unitType', 'beds', 'baths', 'totalArea', 'price', 'currency', 'availability', 'ignore', 'ignore', 'ignore']);
  });
});

describe('value readers', () => {
  it('reads numbers written in any local style', () => {
    expect([parseNumber('45.000 €'), parseNumber('45,5'), parseNumber('1.234,56'), parseNumber('1,234.56'), parseNumber('45 000'), parseNumber('64.5')]).toEqual([45000, 45.5, 1234.56, 1234.56, 45000, 64.5]);
    expect(parseNumber('')).toBeUndefined();
    expect(parseNumber('n/a')).toBeNull();
  });

  it('reads floors', () => {
    expect(['Prizemlje', 'P', 'Përdhese', 'Kati 3', '3. sprat', 'Floor 12', 'B1', 'Podrum', '-2', 'Suteren 2'].map(parseLevel)).toEqual([0, 0, 0, 3, 3, 12, -1, -1, -2, -2]);
    expect(parseLevel('Penthouse')).toBeNull();
    expect([levelFromUnitNumber('401'), levelFromUnitNumber('T1205'), levelFromUnitNumber('A-302'), levelFromUnitNumber('12')]).toEqual([4, 12, 3, null]);
  });

  it('reads availability, type and features in local words', () => {
    expect(['e lirë', 'Slobodno', 'Prodato', 'shitur', 'Rezervisano', 'Not released'].map(parseAvailability)).toEqual(['available', 'available', 'sold', 'sold', 'reserved', 'not_released']);
    expect(parseAvailability('maybe')).toBeNull();
    expect(['Garsonjera', 'Garsonjerë', 'Lokal', 'Banesë', 'Penthouse', 'Loft'].map(parseUnitType)).toEqual(['studio', 'studio', 'retail', 'apartment', 'penthouse', 'loft']);
    expect(parseFeatures('Terasa, Parking; Ugaoni | xyz')).toEqual(['big_terrace', 'parking', 'corner']);
  });
});

describe('buildImportRows', () => {
  it('turns the template into rows the API accepts', () => {
    const table = parseCsv(buildTemplateCsv());
    const result = buildImportRows(table, guessColumns(table[0]), { defaultBuilding: '', floorNames: names });
    expect(result.problems).toEqual([]);
    expect(result.buildings).toEqual(['Object A', 'Object B']);
    expect(result.floors).toBe(4);
    expect(result.rows[1]).toEqual({
      row: 3,
      building: 'Object A',
      entrance: 'Entrance 1',
      level: 1,
      floorLabel: 'Floor 1',
      unitNumber: 'A-101',
      features: ['corner', 'parking'],
      fields: { beds: 2, baths: 1, totalArea: 64.5, price: 96000, unitType: 'apartment', availability: 'available', currency: 'EUR', orientation: 'southEast' },
    });
    expect(result.rows[0]).toMatchObject({ level: 0, floorLabel: 'Ground floor', fields: { unitType: 'retail' } });
    // Object B has one door: no entrance on its rows.
    expect(result.rows[4]).not.toHaveProperty('entrance');
    expect(result.entrances).toEqual(['Object A · Entrance 1', 'Object A · Entrance 2']);
  });

  it('recognises entrance columns in several languages, and puts every row in the building it is imported for', () => {
    expect(guessColumns(['Objekat', 'Ulaz', 'Sprat', 'Stan'])).toEqual(['building', 'entrance', 'floor', 'unitNumber']);
    expect(guessColumns(['Ndertesa', 'Hyrja', 'Kati', 'Banesa'])).toEqual(['building', 'entrance', 'floor', 'unitNumber']);
    const table = parseCsv('Building;Entrance;Floor;Unit\nTower X;B;1;101\n;;2;201');
    const result = buildImportRows(table, guessColumns(table[0]), { defaultBuilding: '', floorNames: names, forceBuilding: 'Plaza Tower' });
    expect(result.rows.map((r) => [r.building, r.entrance])).toEqual([['Plaza Tower', 'B'], ['Plaza Tower', undefined]]);
    expect(result.buildings).toEqual(['Plaza Tower']);
  });

  it('uses the chosen building and reads floors from unit numbers when columns are missing', () => {
    const table = parseCsv('Stan;Cijena\n101;80.000 €\n102;\n1201;150.000\n;5\nX;abc');
    const result = buildImportRows(table, guessColumns(table[0]), { defaultBuilding: 'Object A', floorNames: names });
    expect(result.floorsFromUnitNumbers).toBe(true);
    expect(result.rows.map((r) => [r.unitNumber, r.building, r.level, r.fields.price])).toEqual([
      ['101', 'Object A', 1, 80000],
      ['102', 'Object A', 1, undefined],
      ['1201', 'Object A', 12, 150000],
    ]);
    expect(result.rows[0].fields.currency).toBe('EUR');
    expect(result.problems).toEqual([
      { row: 5, code: 'noUnitNumber' },
      { row: 6, code: 'noFloor', value: 'X' },
    ]);
  });
});

describe('fixed choices and euros', () => {
  it('maps orientation and view words to the app values', async () => {
    const { parseOrientation, parseView } = await import('./values');
    expect(['South-east', 'SE', 'Jugoistok', 'Juglindje', 'Sjever', 'Perëndim', 'up'].map(parseOrientation)).toEqual(['southEast', 'southEast', 'southEast', 'southEast', 'north', 'west', null]);
    expect(['Pogled na more', 'Pamje deti', 'Mal', 'Grad', 'volcano'].map(parseView)).toEqual(['sea', 'sea', 'mountain', 'city', null]);
  });

  it('reports unknown choices and non-euro prices instead of guessing', () => {
    const table = parseCsv('Unit;Orientation;Price\nA1;up;100\nA2;South;80.000 lek\nA3;Jug;90.000 €');
    const result = buildImportRows(table, guessColumns(table[0]), { defaultBuilding: 'B', floorNames: names });
    expect(result.problems).toEqual([
      { row: 2, code: 'noFloor', value: 'A1' },
      { row: 3, code: 'noFloor', value: 'A2' },
      { row: 4, code: 'noFloor', value: 'A3' },
    ]);
    const withFloors = parseCsv('Unit;Floor;Orientation;Price\nA1;1;up;100\nA2;1;South;80.000 lek\nA3;1;Jug;90.000 €');
    const r2 = buildImportRows(withFloors, guessColumns(withFloors[0]), { defaultBuilding: 'B', floorNames: names });
    expect(r2.problems).toEqual([
      { row: 2, code: 'badChoice', field: 'orientation', value: 'up' },
      { row: 3, code: 'notEuro', value: 'ALL' },
    ]);
    expect(r2.rows[0].fields).toMatchObject({ orientation: 'south', price: 90000, currency: 'EUR' });
  });
});
