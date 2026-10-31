import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { UnitImportSummary } from '../../../../types';

/** What the import did, with a button to close. */
export const ImportDone: React.FC<{ result: UnitImportSummary; onClose: () => void }> = ({ result, onClose }) => {
  const { t } = useTranslation('developments');
  const entrances = result.entrancesCreated?.length ?? 0;
  return (
    <div className="space-y-4 py-2 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
      <p className="text-lg font-semibold text-slate-900">{t('import.done', 'Import finished')}</p>
      <p className="text-sm text-slate-700">
        {t('import.doneSummary', { created: result.unitsCreated, updated: result.unitsUpdated, floors: result.floorsCreated, buildings: result.buildingsCreated.length, defaultValue: 'New units: {{created}} · Updated: {{updated}} · New floors: {{floors}} · New buildings: {{buildings}}' })}
      </p>
      {entrances > 0 && <p className="text-sm text-slate-700">{t('import.doneEntrances', { n: entrances, defaultValue: 'New entrances: {{n}}' })}</p>}
      {result.errors.length > 0 && <p className="text-sm text-amber-800">{t('import.doneSkipped', { n: result.errors.length, defaultValue: 'Rows skipped: {{n}}' })}</p>}
      <Button onClick={onClose}>{t('import.close', 'Done')}</Button>
    </div>
  );
};
