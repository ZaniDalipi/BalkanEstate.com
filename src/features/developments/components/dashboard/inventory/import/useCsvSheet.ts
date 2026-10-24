import { useMemo, useState } from 'react';
import { buildImportRows, guessColumns, parseCsv, type ColumnTarget } from '../../../../utils/csvImport';
import { useFloorNames } from '../useFloorNames';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type SheetError = 'tooBig' | 'empty' | 'unreadable';

/**
 * The chosen spreadsheet and the owner's choices about it: which column is
 * which (guessed, then adjustable), the building for sheets without a building
 * column, and whether existing units are updated. Rows are rebuilt from these.
 */
export const useCsvSheet = (defaultBuildingName: string) => {
  const floorNames = useFloorNames();
  const [fileName, setFileName] = useState<string | null>(null);
  const [table, setTable] = useState<string[][]>([]);
  const [columns, setColumns] = useState<ColumnTarget[]>([]);
  const [building, setBuilding] = useState(defaultBuildingName);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [error, setError] = useState<SheetError | null>(null);

  const load = async (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_BYTES) return setError('tooBig');
    try {
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) return setError('empty');
      setFileName(file.name);
      setTable(parsed);
      setColumns(guessColumns(parsed[0]));
    } catch {
      setError('unreadable');
    }
  };

  const setColumn = (index: number, target: ColumnTarget) =>
    setColumns((prev) => prev.map((c, i) => (i === index ? target : c !== 'ignore' && c === target ? 'ignore' : c)));

  const prepared = useMemo(
    () => (table.length ? buildImportRows(table, columns, { defaultBuilding: building, floorNames }) : null),
    [table, columns, building, floorNames]
  );

  const reset = () => {
    setFileName(null);
    setTable([]);
    setColumns([]);
    setError(null);
  };

  return { fileName, headers: table[0] ?? [], sample: table.slice(1, 6), columns, setColumn, building, setBuilding, updateExisting, setUpdateExisting, prepared, error, load, reset };
};
