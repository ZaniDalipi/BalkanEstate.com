import React from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_HOTSPOTS_PER_SCENE } from '../../../types';
import type { AutoFloorsOutcome as Outcome } from './useAutoFloors';

/** What the last Add did: the reason it refused, or what it made, what it linked and what it left out. */
export const AutoFloorsOutcome: React.FC<{ outcome: Outcome | null }> = ({ outcome }) => {
  const { t } = useTranslation('developments');
  if (!outcome) return null;
  if (outcome.kind === 'error') {
    if (outcome.reason === 'step') return null; // shown next to the field
    const text =
      outcome.reason === 'tooMany'
        ? t('editor.autoFloors.tooMany', { max: MAX_HOTSPOTS_PER_SCENE, defaultValue: 'This view would have more than {{max}} regions.' })
        : outcome.reason === 'outside'
          ? t('editor.autoFloors.willNotFit', 'The floors would leave the picture. Lower the floor height or make the layout smaller.')
          : t('editor.autoFloors.allDrawn', 'Every floor of this building already has regions on this view.');
    return <p role="alert" className="text-xs text-red-700">{text}</p>;
  }
  const r = outcome.result;
  return (
    <div role="status" className="space-y-1 rounded-lg bg-emerald-50 p-2 text-xs">
      <p className="font-medium text-emerald-800">
        {t('editor.autoFloors.done', { count: r.added.length, first: r.added[0], last: r.added[r.added.length - 1], defaultValue: 'Added {{count}} floors ({{first}} – {{last}}).' })}
      </p>
      {r.linked > 0 && <p className="text-emerald-800">{t('editor.autoFloors.linked', { count: r.linked, defaultValue: '{{count}} copies were linked to the apartment with the same number.' })}</p>}
      {r.toLink > 0 && <p className="text-amber-700">{t('editor.autoFloors.toLink', { count: r.toLink, defaultValue: '{{count}} copies have no matching apartment and are marked Missing link. Select each to link it.' })}</p>}
      {outcome.source === 'template' && r.estimated > 0 && (
        <p className="text-amber-700">{t('editor.autoFloors.estimated', { count: r.estimated, defaultValue: '{{count}} floors are not drawn in the chosen view and were placed by the floor height. Check them first.' })}</p>
      )}
      {r.outside.length > 0 && (
        <p className="text-amber-700">{t('editor.autoFloors.skippedOutside', { floors: r.outside.join(', '), defaultValue: 'Not added, they would leave the picture: {{floors}}.' })}</p>
      )}
      <p className="text-slate-600">{t('editor.autoFloors.undoHint', 'Not right? Press Undo (it removes them all at once), change the floor height and add again.')}</p>
    </div>
  );
};
