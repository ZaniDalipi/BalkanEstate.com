import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import { importUnits } from '../api/developmentsApi';
import type { ImportRowPayload } from '../utils/csvImport';

/** A short, stable fingerprint of the rows so the preview is cached per file + choices. */
const fingerprint = (rows: ImportRowPayload[], updateExisting: boolean): string => {
  const text = JSON.stringify(rows) + String(updateExisting);
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return `${rows.length}:${h}`;
};

/**
 * The server's dry run of an import (what would be created/updated, and which
 * rows it rejects), and the real import. Importing refreshes the inventory,
 * structure and public pages.
 */
export const useUnitImport = (developmentId: string, rows: ImportRowPayload[], updateExisting: boolean) => {
  const qc = useQueryClient();
  const preview = useQuery({
    queryKey: [...developmentKeys.detail(developmentId), 'importPreview', fingerprint(rows, updateExisting)],
    queryFn: () => importUnits(developmentId, { rows, updateExisting, dryRun: true }),
    enabled: rows.length > 0,
    retry: false,
    staleTime: 30_000,
  });
  const run = useMutation({
    mutationFn: () => importUnits(developmentId, { rows, updateExisting, dryRun: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: developmentKeys.detail(developmentId) });
      qc.invalidateQueries({ queryKey: developmentKeys.public() });
    },
  });
  return { preview, run };
};
