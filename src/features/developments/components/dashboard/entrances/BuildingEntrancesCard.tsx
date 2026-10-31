import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Plus } from 'lucide-react';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useApiErrorText } from '../../../hooks/useApiErrorText';
import { useEntranceActions } from '../../../hooks/useEntranceActions';
import type { DevelopmentBuilding, DevelopmentEntrance } from '../../../types';
import { ImportUnitsButton } from '../inventory/import/ImportUnitsButton';
import { EntranceDialog } from './EntranceDialog';
import { EntranceRow } from './EntranceRow';

interface BuildingEntrancesCardProps {
  developmentId: string;
  building: DevelopmentBuilding;
  entrances: DevelopmentEntrance[];
  canManage: boolean;
  canImport: boolean;
}

type Editing = { mode: 'add' } | { mode: 'edit'; entrance: DevelopmentEntrance } | null;

/** A building with its entrances (add, edit, delete) and an import just for this building. */
export const BuildingEntrancesCard: React.FC<BuildingEntrancesCardProps> = ({ developmentId, building, entrances, canManage, canImport }) => {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const { confirm } = useConfirmation();
  const { remove } = useEntranceActions(developmentId);
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async (e: DevelopmentEntrance) => {
    setError(null);
    const ok = await confirm({
      title: t('entrance.deleteTitle', { name: e.name, defaultValue: 'Delete “{{name}}”?' }),
      message: t('entrance.deleteMessage', 'Regions marking this entrance on your pictures are removed too. Apartments must be moved to another entrance first.'),
      confirmLabel: t('entrance.deleteConfirm', 'Delete entrance'),
      cancelLabel: t('wizard.cancel', 'Cancel'),
      type: 'danger',
    });
    if (!ok) return;
    try {
      await remove(e.id);
    } catch (err) {
      setError(apiText.text(err));
    }
  };

  return (
    <article className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4" aria-labelledby={`b-${building.id}`}>
      <header className="flex flex-wrap items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 id={`b-${building.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{building.name}</h3>
        {canImport && <ImportUnitsButton developmentId={developmentId} building={building} className="min-h-[44px] gap-1.5" />}
      </header>
      {entrances.length > 0 ? (
        <ul className="space-y-2">
          {entrances.map((e) => (
            <EntranceRow key={e.id} entrance={e} canEdit={canManage} onEdit={() => setEditing({ mode: 'edit', entrance: e })} onDelete={() => void onDelete(e)} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">{t('entrance.none', 'One door for the whole building? Then you need no entrances. Add them when apartments are reached through different doors or staircases.')}</p>
      )}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {canManage && (
        <button
          type="button"
          onClick={() => setEditing({ mode: 'add' })}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/5"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('entrance.add', 'Add entrance')}
        </button>
      )}
      {editing && (
        <EntranceDialog
          developmentId={developmentId}
          buildingId={building.id}
          buildingName={building.name}
          entrance={editing.mode === 'edit' ? editing.entrance : undefined}
          siblings={entrances}
          onClose={() => setEditing(null)}
        />
      )}
    </article>
  );
};
