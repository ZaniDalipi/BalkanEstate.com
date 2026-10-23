import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { cn } from '@/src/lib/utils';
import type { StructureDeleteImpact, StructureKind } from '../../../api/developmentsApi';
import { useStructureActions } from '../../../hooks/useStructureActions';

interface TargetActionsProps {
  developmentId: string;
  kind: StructureKind;
  id: string;
  name: string;
  /** Called after a successful delete (e.g. to move the selection away). */
  onDeleted?: () => void;
}

/** "Delete Floor 15? It also removes 2 apartments and 1 picture…" */
export const useImpactMessage = () => {
  const { t } = useTranslation('developments');
  return (kind: StructureKind, impact: StructureDeleteImpact): string => {
    const parts: string[] = [];
    if (impact.floors) parts.push(t('editor.structure.floors', { count: impact.floors, defaultValue: '{{count}} floors' }));
    if (impact.units) parts.push(t('editor.structure.units', { count: impact.units, defaultValue: '{{count}} apartments' }));
    if (impact.views) parts.push(t('editor.structure.views', { count: impact.views, defaultValue: '{{count}} pictures' }));
    const lines = [
      parts.length
        ? t('editor.structure.alsoRemoves', { items: parts.join(', '), defaultValue: 'This also removes {{items}}, and the regions that point to them.' })
        : kind === 'building'
          ? t('editor.structure.emptyBuilding', 'The building is empty; nothing else is removed.')
          : t('editor.structure.emptyFloor', 'The floor is empty; nothing else is removed.'),
    ];
    if (impact.listings) {
      lines.push(
        t('editor.structure.listingsKept', {
          count: impact.listings,
          defaultValue: '{{count}} attached listings stay on the marketplace; they are only detached.',
        })
      );
    }
    return lines.join(' ');
  };
};

/**
 * "⋯" menu on a building or floor in the "What to map" list: rename it, or
 * delete it (after a confirmation that says exactly what goes with it) — for
 * things created by mistake. The server re-checks permissions.
 */
export const TargetActions: React.FC<TargetActionsProps> = ({ developmentId, kind, id, name, onDeleted }) => {
  const { t } = useTranslation('developments');
  const { confirm } = useConfirmation();
  const notify = useNotification();
  const actions = useStructureActions(developmentId);
  const impactMessage = useImpactMessage();
  const [mode, setMode] = useState<'closed' | 'menu' | 'rename'>('closed');
  const [draft, setDraft] = useState(name);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (mode === 'closed') return undefined;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMode('closed');
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMode('closed');
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [mode]);

  const fail = (err: unknown) =>
    void notify.error(t('errors.updateFailed', 'Could not save your changes.'), (err as { message?: string })?.message || t('errors.generic', 'Something went wrong.'));

  const onRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = draft.trim();
    if (!next || next === name) return setMode('closed');
    try {
      await actions.rename({ kind, id, name: next });
      setMode('closed');
    } catch (err) {
      fail(err);
    }
  };

  const onDelete = async () => {
    setMode('closed');
    try {
      const impact = await actions.impact(kind, id);
      const ok = await confirm({
        title: t('editor.structure.deleteTitle', { name, defaultValue: 'Delete “{{name}}”?' }),
        message: impactMessage(kind, impact),
        confirmLabel: kind === 'building' ? t('editor.structure.deleteBuilding', 'Delete building') : t('editor.structure.deleteFloor', 'Delete floor'),
        cancelLabel: t('wizard.cancel', 'Cancel'),
        type: 'danger',
      });
      if (!ok) return;
      await actions.remove({ kind, id });
      onDeleted?.();
      void notify.success(t('editor.structure.deletedTitle', 'Deleted'), t('editor.structure.deleted', { name, defaultValue: '“{{name}}” was deleted.' }));
    } catch (err) {
      fail(err);
    }
  };

  const item = 'flex min-h-[40px] w-full items-center gap-2 rounded-md px-2.5 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none';
  return (
    <div ref={rootRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={t('editor.structure.actionsFor', { name, defaultValue: 'Actions for {{name}}' })}
        aria-haspopup="menu"
        aria-expanded={mode !== 'closed'}
        aria-controls={menuId}
        onClick={() => {
          setDraft(name);
          setMode(mode === 'closed' ? 'menu' : 'closed');
        }}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          mode === 'closed' && 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100'
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {mode !== 'closed' && (
        <div id={menuId} className="absolute right-0 top-9 z-20 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
          {mode === 'menu' ? (
            <div role="menu">
              <button type="button" role="menuitem" className={item} onClick={() => setMode('rename')}>
                <Pencil className="h-4 w-4 text-slate-500" aria-hidden="true" />
                {t('editor.structure.rename', 'Rename')}
              </button>
              <button type="button" role="menuitem" className={cn(item, 'text-red-700')} onClick={onDelete} disabled={actions.isBusy}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {kind === 'building' ? t('editor.structure.deleteBuilding', 'Delete building') : t('editor.structure.deleteFloor', 'Delete floor')}
              </button>
            </div>
          ) : (
            <form onSubmit={onRename} className="space-y-2 p-1.5">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={120}
                aria-label={t('editor.structure.newName', 'New name')}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="submit" disabled={actions.isBusy} className="w-full rounded-md bg-primary px-2.5 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                {t('editor.structure.saveName', 'Save name')}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
