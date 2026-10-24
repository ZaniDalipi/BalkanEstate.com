import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { useDevelopmentStructure } from '../../../../hooks';
import { ImportUnitsDialog } from './ImportUnitsDialog';

/** "Import from spreadsheet" — opens the CSV import for this residence. */
export const ImportUnitsButton: React.FC<{ developmentId: string }> = ({ developmentId }) => {
  const { t } = useTranslation('developments');
  const { buildings } = useDevelopmentStructure(developmentId);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Upload className="h-4 w-4" aria-hidden="true" />
        {t('import.open', 'Import from spreadsheet')}
      </Button>
      {open && (
        <ImportUnitsDialog
          developmentId={developmentId}
          defaultBuildingName={buildings.length === 1 ? buildings[0].name : buildings.length === 0 ? t('import.firstBuilding', 'Building A') : ''}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
