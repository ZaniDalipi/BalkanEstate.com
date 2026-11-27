import React from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_HOTSPOTS_PER_SCENE } from '../../../types';
import type { AutoFloorsOutcome as Outcome } from './useAutoFloors';

/** What the last "Add floors" did: the reason it refused, or what it made and what it left out. */
export const AutoFloorsOutcome: React.FC<{ outcome: Outcome | null }> = ({ outcome }) => {
  const { t } = useTranslation('developments');
  if (!outcome) return null;
  if (outcome.kind === 'error') {
    const text =
      outcome.reason === 'outside'
        ? t('editor.autoFloors.outside', 'The floors would leave the picture. Make them smaller or move them back.')
        : outcome.reason === 'tooMany'
          ? t('editor.autoFloors.tooMany', { max: MAX_HOTSPOTS_PER_SCENE, defaultValue: 'This view would have more than {{max}} regions.' })
          : outcome.reason === 'allThere'
            ? t('editor.autoFloors.allThere', 'Every floor of this building already has a region on this view. Delete one to place it again.')
            : t('editor.autoFloors.noTemplate', 'The chosen view has no floor regions to follow. Pick another one.');
    return <p role="alert" className="text-xs text-red-700">{text}</p>;
  }
  return (
    <div role="status" className="space-y-0.5 text-xs">
      <p className="text-emerald-700">
        {t('editor.autoFloors.done', { floors: outcome.floors, units: outcome.units, defaultValue: 'Added {{floors}} floors and {{units}} apartment outlines. Check the edges, then link the apartments.' })}
      </p>
      {outcome.estimated > 0 && (
        <p className="text-amber-700">
          {t('editor.autoFloors.estimated', { count: outcome.estimated, defaultValue: '{{count}} floors are not in the chosen view and were placed by its floor spacing. Check them first.' })}
        </p>
      )}
      {outcome.alreadyThere > 0 && (
        <p className="text-slate-600">
          {t('editor.autoFloors.skippedThere', { count: outcome.alreadyThere, defaultValue: '{{count}} floors already had a region here and were left as they are.' })}
        </p>
      )}
      {outcome.outside > 0 && (
        <p className="text-amber-700">
          {t('editor.autoFloors.skippedOutside', { count: outcome.outside, defaultValue: '{{count}} floors would fall outside the picture and were not added. Make the layout smaller to fit them.' })}
        </p>
      )}
    </div>
  );
};
