import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Hotspot } from '../../../types';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import { issueText, type AnyIssueCode } from './issueText';

interface RegionListProps {
  editor: PolygonEditor;
  /** Local + server issues per region id. */
  issues: Record<string, AnyIssueCode[]>;
  labelOf: (h: Hotspot) => string;
}

const iconBtn =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-30 sm:h-8 sm:w-8';

/** Regions top-most first, with issue badges, visibility and stacking controls. */
export const RegionList: React.FC<RegionListProps> = ({ editor, issues, labelOf }) => {
  const { t } = useTranslation('developments');
  const { state, dispatch } = editor;
  const ordered = [...state.hotspots].sort((a, b) => (b.z ?? 0) - (a.z ?? 0));

  if (ordered.length === 0) {
    return <p className="text-sm text-slate-500">{t('scene.empty', 'No regions yet. Pick a shape tool and draw over the image.')}</p>;
  }

  return (
    <ul className="max-h-72 space-y-0.5 overflow-y-auto pr-1" aria-label={t('scene.regions', 'Regions')}>
      {ordered.map((h, i) => {
        const list = issues[h.id] ?? [];
        const isSelected = h.id === state.selectedId;
        const isHidden = state.hidden.includes(h.id);
        const name = labelOf(h) || t('editor.regions.unnamed', 'Unlinked region');
        return (
          <li key={h.id} className={cn('flex items-center gap-0.5 rounded-lg', isSelected && 'bg-primary/10')}>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SELECT', id: h.id })}
              aria-current={isSelected ? 'true' : undefined}
              className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]"
            >
              <span className={cn('min-w-0 flex-1 truncate', isHidden ? 'text-slate-400' : 'text-slate-800')}>{name}</span>
              {list.length > 0 && (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700"
                  title={list.map((c) => issueText(t, c)).join(' · ')}
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  <span className="sr-only">{t('editor.regions.issues', 'Issues')}:</span>
                  {list.length}
                </span>
              )}
            </button>
            <button
              type="button"
              className={iconBtn}
              onClick={() => dispatch({ type: 'TOGGLE_HIDDEN', id: h.id })}
              aria-pressed={isHidden}
              aria-label={isHidden ? t('editor.regions.show', 'Show in editor') : t('editor.regions.hide', 'Hide in editor')}
            >
              {isHidden ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              className={iconBtn}
              disabled={i === 0}
              onClick={() => dispatch({ type: 'REORDER', id: h.id, direction: 'forward' })}
              aria-label={t('editor.regions.forward', 'Bring forward')}
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={iconBtn}
              disabled={i === ordered.length - 1}
              onClick={() => dispatch({ type: 'REORDER', id: h.id, direction: 'backward' })}
              aria-label={t('editor.regions.backward', 'Send backward')}
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
};
