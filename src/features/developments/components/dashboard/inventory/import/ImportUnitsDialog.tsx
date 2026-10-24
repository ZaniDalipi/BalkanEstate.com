import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import Modal from '@/src/shared/components/ui/Modal';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
import { useUnitImport } from '../../../../hooks/useUnitImport';
import { missingRequired } from '../../../../utils/csvImport';
import { ColumnMapping } from './ColumnMapping';
import { ImportFilePicker } from './ImportFilePicker';
import { ImportReview } from './ImportReview';
import { RowsPreview } from './RowsPreview';
import { useCsvSheet } from './useCsvSheet';

interface ImportUnitsDialogProps {
  developmentId: string;
  /** Used for sheets without a building column (e.g. the only building). */
  defaultBuildingName: string;
  onClose: () => void;
}

const errorText = (e: unknown) => (e as { message?: string } | null)?.message ?? null;

/**
 * Import apartments from a spreadsheet: choose a file → check what we
 * recognised (columns, a preview, the server's dry run and any problems) →
 * import. Nothing is written until "Import".
 */
export const ImportUnitsDialog: React.FC<ImportUnitsDialogProps> = ({ developmentId, defaultBuildingName, onClose }) => {
  const { t } = useTranslation('developments');
  const sheet = useCsvSheet(defaultBuildingName);
  const rows = sheet.prepared?.rows ?? [];
  const { preview, run } = useUnitImport(developmentId, rows, sheet.updateExisting);
  const missing = missingRequired(sheet.columns);
  const result = run.data;

  return (
    <Modal isOpen onClose={onClose} title={t('import.title', 'Import units from a spreadsheet')} size="4xl">
      {result ? (
        <div className="space-y-4 py-2 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
          <p className="text-lg font-semibold text-slate-900">{t('import.done', 'Import finished')}</p>
          <p className="text-sm text-slate-700">
            {t('import.doneSummary', { created: result.unitsCreated, updated: result.unitsUpdated, floors: result.floorsCreated, buildings: result.buildingsCreated.length, defaultValue: 'New units: {{created}} · Updated: {{updated}} · New floors: {{floors}} · New buildings: {{buildings}}' })}
          </p>
          {result.errors.length > 0 && <p className="text-sm text-amber-800">{t('import.doneSkipped', { n: result.errors.length, defaultValue: 'Rows skipped: {{n}}' })}</p>}
          <Button onClick={onClose}>{t('import.close', 'Done')}</Button>
        </div>
      ) : !sheet.prepared ? (
        <ImportFilePicker onFile={sheet.load} error={sheet.error} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-700">
              {t('import.fileSummary', { name: sheet.fileName, n: rows.length + sheet.prepared.problems.length, defaultValue: '{{name}} · {{n}} rows' })}
            </p>
            <button type="button" onClick={sheet.reset} className="text-sm font-medium text-primary hover:underline">{t('import.otherFile', 'Choose another file')}</button>
          </div>
          <section aria-label={t('import.columns', 'Columns')} className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">{t('import.recognised', 'We recognised these columns — change any that are wrong')}</h3>
            <ColumnMapping headers={sheet.headers} sample={sheet.sample} columns={sheet.columns} onChange={sheet.setColumn} />
            {missing.length > 0 && <p role="alert" className="text-sm text-red-700">{t('import.needUnitNumber', 'Tell us which column holds the unit number.')}</p>}
          </section>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
            {!sheet.columns.includes('building') && (
              <Input label={t('import.buildingForAll', 'Building for all rows')} value={sheet.building} onChange={(e) => sheet.setBuilding(e.target.value)} helperText={t('import.buildingHint', 'An existing building name, or a new one to create.')} />
            )}
            <label className="flex min-h-[44px] items-center gap-2 text-sm text-slate-800">
              <input type="checkbox" className="h-4 w-4 accent-[#0252CD]" checked={sheet.updateExisting} onChange={(e) => sheet.setUpdateExisting(e.target.checked)} />
              {t('import.updateExisting', 'Update units that already exist (only the columns in this file)')}
            </label>
          </div>
          <RowsPreview rows={rows} />
          <ImportReview prepared={sheet.prepared} preview={preview.data} previewError={errorText(preview.error)} isChecking={preview.isFetching} />
          {run.error && <p role="alert" className="text-sm text-red-700">{errorText(run.error)}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>{t('wizard.cancel', 'Cancel')}</Button>
            <Button type="button" onClick={() => run.mutate()} disabled={rows.length === 0 || missing.length > 0 || !preview.data || preview.isFetching || run.isPending}>
              {run.isPending ? t('import.importing', 'Importing…') : t('import.confirm', { n: (preview.data?.unitsCreated ?? 0) + (preview.data?.unitsUpdated ?? 0), defaultValue: 'Import ({{n}})' })}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
