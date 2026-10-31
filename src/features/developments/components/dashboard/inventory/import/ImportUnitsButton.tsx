import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { useDevelopmentStructure } from '../../../../hooks';
import { ImportUnitsDialog } from './ImportUnitsDialog';
import { clearImportFile, peekImportFile } from './pendingImport';

interface ImportUnitsButtonProps {
  developmentId: string;
  /** Import into this one building only (the button then says so). */
  building?: { name: string };
  className?: string;
}

/**
 * "Import from spreadsheet" — opens the Excel/CSV import for this residence,
 * or for one building. A spreadsheet chosen on the create page opens here
 * straight away.
 */
export const ImportUnitsButton: React.FC<ImportUnitsButtonProps> = ({ developmentId, building, className }) => {
  const { t } = useTranslation('developments');
  const { buildings } = useDevelopmentStructure(developmentId);
  const [handedOver] = useState(() => (building ? undefined : peekImportFile(developmentId)));
  const [open, setOpen] = useState(!!handedOver);
  const close = () => {
    clearImportFile(developmentId);
    setOpen(false);
  };
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={className ?? 'gap-1.5'}
        aria-label={building ? t('import.openFor', { building: building.name, defaultValue: 'Import units into {{building}}' }) : undefined}
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        {building ? t('import.openShort', 'Import') : t('import.open', 'Import from spreadsheet')}
      </Button>
      {open && (
        <ImportUnitsDialog
          developmentId={developmentId}
          defaultBuildingName={building?.name ?? (buildings.length === 1 ? buildings[0].name : buildings.length === 0 ? t('import.firstBuilding', 'Building A') : '')}
          buildingNames={buildings.map((b) => b.name)}
          forBuilding={building?.name}
          initialFile={handedOver}
          onClose={close}
        />
      )}
    </>
  );
};
