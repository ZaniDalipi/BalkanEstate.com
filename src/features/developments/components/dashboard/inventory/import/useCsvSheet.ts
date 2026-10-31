import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildImportRows,
  guessColumns,
  readSpreadsheet,
  SpreadsheetError,
  type ColumnTarget,
  type SheetRows,
} from '../../../../utils/csvImport';
import { useFloorNames } from '../useFloorNames';
import { MAX_SHEET_BYTES } from './checkSheetFile';


/** The worksheet to open first: one whose header names a unit number, else the one with most rows. */
export const bestSheet = (sheets: SheetRows[]): number => {
  const withUnits = sheets.findIndex((s) => guessColumns(s.rows[0] ?? []).includes('unitNumber'));
  if (withUnits >= 0) return withUnits;
  return sheets.reduce((best, s, i) => (s.rows.length > sheets[best].rows.length ? i : best), 0);
};

export type SheetError = 'tooBig' | 'empty' | 'unreadable' | 'oldExcel';

/**
 * The chosen spreadsheet (CSV or Excel) and the owner's choices about it:
 * which worksheet, which column is which (guessed, then adjustable), the
 * building for sheets without a building column (the worksheet's name when it
 * matches a building), and whether existing units
 * are updated. Rows are rebuilt from these.
 */
export const useCsvSheet = (defaultBuildingName: string, buildingNames: string[] = [], forBuilding?: string, initialFile?: File) => {
  const floorNames = useFloorNames();
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetRows[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [columns, setColumns] = useState<ColumnTarget[]>([]);
  const [building, setBuilding] = useState(defaultBuildingName);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [error, setError] = useState<SheetError | null>(null);
  const table = sheets[sheetIndex]?.rows ?? [];

  // A worksheet named like a building ("Plaza Tower") imports into that building.
  const buildingFor = (sheetName: string) =>
    buildingNames.find((b) => b.trim().toLowerCase() === sheetName.trim().toLowerCase()) ?? defaultBuildingName;

  const load = async (file: File) => {
    setError(null);
    if (file.size > MAX_SHEET_BYTES) return setError('tooBig');
    try {
      const read = (await readSpreadsheet(file)).filter((s) => s.rows.length >= 2);
      if (read.length === 0) return setError('empty');
      const best = bestSheet(read);
      setFileName(file.name);
      setSheets(read);
      setSheetIndex(best);
      setColumns(guessColumns(read[best].rows[0]));
      setBuilding(buildingFor(read[best].name));
    } catch (err) {
      setError(err instanceof SpreadsheetError && err.code === 'oldExcel' ? 'oldExcel' : 'unreadable');
    }
  };

  const chooseSheet = (index: number) => {
    setSheetIndex(index);
    setColumns(guessColumns(sheets[index]?.rows[0] ?? []));
    setBuilding(buildingFor(sheets[index]?.name ?? ''));
  };

  const setColumn = (index: number, target: ColumnTarget) =>
    setColumns((prev) => prev.map((c, i) => (i === index ? target : c !== 'ignore' && c === target ? 'ignore' : c)));

  const prepared = useMemo(
    () => (table.length ? buildImportRows(table, columns, { defaultBuilding: building, floorNames, forceBuilding: forBuilding }) : null),
    [table, columns, building, floorNames, forBuilding]
  );

  // A file handed over (from the create page) is read once, as if just chosen.
  const loadRef = useRef(load);
  loadRef.current = load;
  const handedOver = useRef<File | null>(null);
  useEffect(() => {
    if (initialFile && handedOver.current !== initialFile) {
      handedOver.current = initialFile;
      void loadRef.current(initialFile);
    }
  }, [initialFile]);

  const reset = () => {
    setFileName(null);
    setSheets([]);
    setColumns([]);
    setError(null);
  };

  return {
    fileName,
    sheetNames: sheets.map((s) => s.name),
    sheetIndex,
    chooseSheet,
    headers: table[0] ?? [],
    sample: table.slice(1, 6),
    columns,
    setColumn,
    building,
    setBuilding,
    updateExisting,
    setUpdateExisting,
    prepared,
    error,
    load,
    reset,
  };
};
