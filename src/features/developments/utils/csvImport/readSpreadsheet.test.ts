import { describe, it, expect } from 'vitest';
import { buildImportRows, guessColumns } from './index';
import { cellText, readSpreadsheet, SpreadsheetError } from './readSpreadsheet';
import { makeXlsx } from './__fixtures__/makeXlsx';

const names = { ground: 'Ground floor', floor: (l: number) => `Floor ${l}`, basement: (n: number) => `Basement ${n}` };
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('readSpreadsheet', () => {
  it('reads every worksheet with data from an Excel file', async () => {
    const bytes = makeXlsx([
      { name: 'Notes', rows: [['Only a title']] },
      {
        name: 'Objekti A',
        rows: [
          ['Kati', 'Banesa', 'Sipërfaqja (m²)', 'Çmimi', 'Statusi'],
          ['Përdhese', 'A-001', 95, 210000, 'E lirë'],
          [1, 'A-101', 64.5, 96000, 'Shitur'],
          [2, 'A-201', 1.234, null, 'Rezervuar'],
        ],
      },
    ]);
    const sheets = await readSpreadsheet(new File([bytes], 'units.xlsx', { type: XLSX }));
    expect(sheets.map((s) => s.name)).toEqual(['Objekti A']);
    const table = sheets[0].rows;
    expect(table[2]).toEqual(['1', 'A-101', '64.5', '96000', 'Shitur']);

    const result = buildImportRows(table, guessColumns(table[0]), { defaultBuilding: 'Objekti A', floorNames: names });
    expect(result.problems).toEqual([]);
    expect(result.rows.map((r) => [r.unitNumber, r.level, r.fields.totalArea, r.fields.price, r.fields.availability])).toEqual([
      ['A-001', 0, 95, 210000, 'available'],
      ['A-101', 1, 64.5, 96000, 'sold'],
      ['A-201', 2, 1.234, undefined, 'reserved'],
    ]);
  });

  it('still reads CSV, and explains old .xls and broken files', async () => {
    expect(await readSpreadsheet(new File(['a;b\n1;2'], 'x.csv', { type: 'text/csv' }))).toEqual([{ name: 'x.csv', rows: [['a', 'b'], ['1', '2']] }]);
    await expect(readSpreadsheet(new File(['x'], 'old.xls', { type: 'application/vnd.ms-excel' }))).rejects.toEqual(new SpreadsheetError('oldExcel'));
    await expect(readSpreadsheet(new File(['not a zip'], 'bad.xlsx', { type: XLSX }))).rejects.toEqual(new SpreadsheetError('unreadable'));
  });

  it('writes numbers so they are never read as thousands', () => {
    expect([cellText(1.234), cellText(64.5), cellText(45000), cellText(new Date('2027-06-30T00:00:00Z')), cellText(null)]).toEqual(['1.2340', '64.5', '45000', '2027-06-30', '']);
  });
});
