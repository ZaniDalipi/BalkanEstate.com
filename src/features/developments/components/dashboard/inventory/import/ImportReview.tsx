import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Building2, Layers, Lock, Plus, RefreshCw } from 'lucide-react';
import type { ImportProblem, PreparedImport } from '../../../../utils/csvImport';
import type { UnitImportSummary } from '../../../../types';
import { fieldLabel } from './fieldLabels';

interface ImportReviewProps {
  prepared: PreparedImport;
  preview: UnitImportSummary | undefined;
  previewError: string | null;
  isChecking: boolean;
}

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
    <span className="text-primary">{icon}</span>
    <span className="text-sm text-slate-600">{label}</span>
    <span className="ml-auto text-sm font-semibold text-slate-900">{value}</span>
  </div>
);

/** What the import will do (from the server's dry run), a preview of the rows, and every problem found. */
export const ImportReview: React.FC<ImportReviewProps> = ({ prepared, preview, previewError, isChecking }) => {
  const { t } = useTranslation('developments');
  const problemText = (p: ImportProblem) =>
    t(`import.problem.${p.code}`, {
      field: p.field ? fieldLabel(t, p.field) : '',
      value: p.value ?? '',
      defaultValue: { noUnitNumber: 'No unit number', noBuilding: 'No building', noFloor: 'Can’t tell the floor from “{{value}}”', badNumber: '{{field}}: “{{value}}” is not a number', badAvailability: 'Unknown availability “{{value}}”', badChoice: '{{field}}: “{{value}}” is not one of the options', notEuro: 'Prices must be in euros (found {{value}})' }[p.code],
    });
  const problems = [...prepared.problems.map((p) => ({ row: p.row, text: problemText(p) })), ...(preview?.errors ?? []).map((e) => ({ row: e.row, text: e.message }))].sort((a, b) => a.row - b.row);
  const dash = isChecking ? '…' : '—';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Stat icon={<Plus className="h-4 w-4" aria-hidden="true" />} label={t('import.stat.new', 'New units')} value={preview ? preview.unitsCreated : dash} />
        <Stat icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />} label={t('import.stat.updated', 'Units updated')} value={preview ? preview.unitsUpdated : dash} />
        <Stat icon={<Building2 className="h-4 w-4" aria-hidden="true" />} label={t('import.stat.buildings', 'New buildings')} value={preview ? preview.buildingsCreated.join(', ') || '0' : dash} />
        <Stat icon={<Layers className="h-4 w-4" aria-hidden="true" />} label={t('import.stat.floors', 'New floors')} value={preview ? preview.floorsCreated : dash} />
      </div>
      {preview && (preview.unchanged > 0 || preview.skippedExisting > 0) && (
        <p className="text-sm text-slate-600">
          {t('import.unchanged', { unchanged: preview.unchanged, skipped: preview.skippedExisting, defaultValue: 'Already up to date: {{unchanged}} · Existing units left as they are: {{skipped}}' })}
        </p>
      )}
      {prepared.floorsFromUnitNumbers && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">{t('import.floorsFromNumbers', 'No floor column: floors are read from the unit numbers (401 → floor 4).')}</p>
      )}
      {preview?.buildingLimit && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('import.buildingLimit', {
            n: preview.buildingsCreated.length,
            limit: preview.buildingLimit.limit,
            allowed: preview.buildingLimit.allowed,
            defaultValue: 'This file adds {{n}} new buildings, but this residence can have {{limit}} ({{allowed}} more). Unlock more buildings on the Overview tab, or use existing building names.',
          })}
        </p>
      )}
      {previewError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{previewError}</p>}
      {problems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {t('import.problems', { n: problems.length, defaultValue: 'Rows that will be skipped ({{n}})' })}
          </p>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto text-sm text-amber-900">
            {problems.slice(0, 100).map((p, i) => (
              <li key={`${p.row}-${i}`}>{t('import.row', { row: p.row, defaultValue: 'Row {{row}}' })}: {p.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
