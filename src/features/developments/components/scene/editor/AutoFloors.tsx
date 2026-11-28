import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { Scene } from '../../../types';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import type { Hotspot } from '../../../types';
import { MAX_SPACING_PCT, MIN_SPACING_PCT } from '../../../utils/floorLevels';
import { AutoFloorsQuality } from './AutoFloorsQuality';
import { AutoFloorsHowTo } from './AutoFloorsHowTo';
import { AutoFloorsTemplate } from './AutoFloorsTemplate';
import { AutoFloorsOutcome } from './AutoFloorsOutcome';
import { useAutoFloors, type AutoFloorsSource } from './useAutoFloors';

const inputCls =
  'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-[invalid=true]:border-red-400 sm:min-h-[36px]';

/**
 * "Add floors automatically" (building views): draw and link one or two floors,
 * press Add, and every other floor gets the same outlines along each apartment
 * column's perspective, linked to the apartment with the same number. Another
 * building's view can be the starting point instead. The button says what it
 * will add; the new regions then go to the review (`onPlaced`).
 */
export const AutoFloors: React.FC<{ developmentId: string; scene: Scene; editor: PolygonEditor; onPlaced: (added: Hotspot[]) => void }> = ({ developmentId, scene, editor, onPlaced }) => {
  const { t } = useTranslation('developments');
  const id = useId();
  const a = useAutoFloors(developmentId, scene, editor, onPlaced);
  const label = (level: number) => a.floors.find((f) => f.level === level)?.label ?? String(level);
  const plan = a.plan;
  const showHowTo = a.source === 'here' && !a.canCopy;

  const body = () => {
    if (a.loading) return <p role="status" className="text-xs text-slate-600">{t('editor.autoFloors.loading', 'Looking up the floors of this building…')}</p>;
    if (a.failed) return <p role="alert" className="text-xs text-red-700">{t('editor.autoFloors.loadFailed', 'Could not load the floors of this building. Check your connection and open this panel again.')}</p>;
    if (a.floors.length === 0) return <p role="status" className="text-xs text-slate-600">{t('editor.autoFloors.noFloors', 'This building has no floors yet. Add its floors in the structure first, then come back here.')}</p>;
    return (
      <>
        <p className="text-xs text-slate-700">
          {t('editor.autoFloors.building', { count: a.floors.length, first: a.floors[0].label, last: a.floors[a.floors.length - 1].label, defaultValue: 'This building has {{count}} floors: {{first}} – {{last}}.' })}
        </p>
        {a.here.length > 0 && (
          <p className="text-xs text-slate-700">
            {t('editor.autoFloors.drawnHere', 'Already drawn on this view:')}{' '}
            {a.here.map((g) => t('editor.autoFloors.drawnLevel', { floor: label(g.level), n: g.regions.length, defaultValue: '{{floor}} ({{n}})' })).join(', ')}
          </p>
        )}
        {a.templates.length > 0 && (
          <fieldset className="space-y-1">
            <legend className="mb-1 text-xs font-medium text-slate-600">{t('editor.autoFloors.sourceLabel', 'Start from')}</legend>
            {(['here', 'template'] as AutoFloorsSource[]).map((s) => (
              <label key={s} className="flex min-h-[44px] items-center gap-2 text-sm text-slate-800 sm:min-h-[32px]">
                <input type="radio" name={`${id}-source`} checked={a.source === s} onChange={() => a.pickSource(s)} className="h-4 w-4" />
                {s === 'here' ? t('editor.autoFloors.sourceHere', 'What I drew on this view') : t('editor.autoFloors.sourceTemplate', "Another building's view")}
              </label>
            ))}
          </fieldset>
        )}
        {showHowTo ? <AutoFloorsHowTo unlinked={a.unlinkedCount} /> : (
          <>
            {a.source === 'template' && <AutoFloorsTemplate a={a} scene={scene} />}
            {plan && <AutoFloorsQuality quality={plan.quality} />}
            <div>
              <label htmlFor={`${id}-spacing`} className="mb-1 block text-xs font-medium text-slate-600">{t('editor.autoFloors.spacing', 'Spacing between floors (%)')}</label>
              <input id={`${id}-spacing`} inputMode="decimal" value={a.spacing.value} onChange={(e) => a.spacing.set(e.target.value)} aria-invalid={a.spacing.invalid} aria-describedby={`${id}-spacing-help`} className={inputCls} />
              {a.spacing.invalid ? (
                <p id={`${id}-spacing-help`} role="alert" className="mt-1 text-xs text-red-700">{t('editor.autoFloors.spacingInvalid', { min: MIN_SPACING_PCT, max: MAX_SPACING_PCT, defaultValue: 'Enter a spacing from {{min}} to {{max}} %.' })}</p>
              ) : (
                <p id={`${id}-spacing-help`} className="mt-1 text-[11px] leading-relaxed text-slate-500">{t('editor.autoFloors.spacingHelp', '100 = as measured from your drawing. Lower it if the new floors climb too fast, raise it if they stay too low; press Undo first.')}</p>
              )}
            </div>
            <label className="flex min-h-[44px] items-center gap-2 text-sm text-slate-800 sm:min-h-[32px]">
              <input type="checkbox" checked={a.floorOutline} onChange={(e) => a.setFloorOutline(e.target.checked)} className="h-4 w-4" />
              {t('editor.autoFloors.floorOutline', 'Also outline each whole floor, linked to the floor')}
            </label>
            <AutoFloorsOutcome outcome={a.outcome} />
            {plan && plan.added.length === 0 && !a.outcome && (
              <p role="status" className="text-xs text-slate-600">
                {plan.outside.length > 0 ? t('editor.autoFloors.willNotFit', 'The floors would leave the picture. Lower the spacing or make the layout smaller.') : t('editor.autoFloors.allDrawn', 'Every floor of this building already has regions on this view.')}
              </p>
            )}
            <Button size="sm" className="min-h-[44px] w-full sm:min-h-0" onClick={a.apply} disabled={!!plan && plan.added.length === 0}>
              {plan && plan.added.length > 0
                ? t('editor.autoFloors.create', { count: plan.added.length, first: plan.added[0], last: plan.added[plan.added.length - 1], defaultValue: 'Add {{count}} floors ({{first}} – {{last}})' })
                : t('editor.autoFloors.createNone', 'Add floors')}
            </Button>
          </>
        )}
      </>
    );
  };

  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50/60 p-2" open>
      <summary className="flex min-h-[44px] cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-800 sm:min-h-[32px]">
        <Wand2 className="h-4 w-4" aria-hidden="true" />
        {t('editor.autoFloors.title', 'Add floors automatically')}
      </summary>
      <div className="mt-2 space-y-2">
        <p className="text-xs leading-relaxed text-slate-500">{t('editor.autoFloors.intro', 'Draw and link one or two floors; this fills in the rest of the building. You then check every new region.')}</p>
        {body()}
      </div>
    </details>
  );
};
