import React from 'react';
import { useTranslation } from 'react-i18next';
import { Accessibility, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { ENTRANCE_KIND_STYLE, useEntranceKindLabel } from '../../shared/entranceKind';
import type { DevelopmentEntrance } from '../../../types';

interface EntranceRowProps {
  entrance: DevelopmentEntrance;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/** One entrance in a building's card: its kind, name, code, access and note, with edit / delete. */
export const EntranceRow: React.FC<EntranceRowProps> = ({ entrance, canEdit, onEdit, onDelete }) => {
  const { t } = useTranslation('developments');
  const kindLabel = useEntranceKindLabel();
  const style = ENTRANCE_KIND_STYLE[entrance.kind ?? 'main'];
  const Icon = style.icon;
  const btn = 'inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1', style.tone)} title={kindLabel(entrance.kind)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-slate-900">
          <span className="truncate">{entrance.name}</span>
          {entrance.code && <span className="rounded bg-slate-100 px-1.5 text-xs font-bold text-slate-600">{entrance.code}</span>}
          {entrance.accessible && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <Accessibility className="h-3.5 w-3.5" aria-hidden="true" />
              {t('entrance.stepFree', 'Step-free')}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-slate-500">
          {kindLabel(entrance.kind)}
          {entrance.note ? ` · ${entrance.note}` : ''}
        </p>
      </div>
      {canEdit && (
        <div className="flex shrink-0">
          <button type="button" onClick={onEdit} className={btn} aria-label={t('entrance.edit', { name: entrance.name, defaultValue: 'Edit {{name}}' })}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onDelete} className={cn(btn, 'hover:text-red-700')} aria-label={t('entrance.delete', { name: entrance.name, defaultValue: 'Delete {{name}}' })}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  );
};
