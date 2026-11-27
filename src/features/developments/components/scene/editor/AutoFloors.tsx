import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { Button } from '@/src/components/ui/button';
import type { Scene } from '../../../types';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import { TransferFields } from './TransferFields';
import { AutoFloorsOutcome } from './AutoFloorsOutcome';
import { useAutoFloors } from './useAutoFloors';

const selectCls =
  'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]';
const checkCls = 'flex min-h-[44px] items-center gap-2 text-sm text-slate-800 sm:min-h-[32px]';

/**
 * "Add floors automatically" (building views): finds the floors of this building
 * and places one linked region per floor, laid out like a view the owner already
 * drew — the same side of another building first. Apartment outlines can come
 * along, unlinked. Not inside the keyed inspector, so it keeps its result.
 */
export const AutoFloors: React.FC<{ developmentId: string; scene: Scene; editor: PolygonEditor }> = ({ developmentId, scene, editor }) => {
  const { t } = useTranslation('developments');
  const id = useId();
  const a = useAutoFloors(developmentId, scene, editor);
  const sideOf = (s: Scene) => s.viewName || t(`editor.directions.${s.viewDirection}`, s.viewDirection || s.viewKey);
  const first = a.floors[0];
  const last = a.floors[a.floors.length - 1];

  const body = () => {
    if (a.loading) return <p role="status" className="text-xs text-slate-600">{t('editor.autoFloors.loading', 'Looking up the floors of this building…')}</p>;
    if (a.failed) return <p role="alert" className="text-xs text-red-700">{t('editor.autoFloors.loadFailed', 'Could not load the floors of this building. Check your connection and open this panel again.')}</p>;
    if (a.floors.length === 0) return <p role="status" className="text-xs text-slate-600">{t('editor.autoFloors.noFloors', 'This building has no floors yet. Add its floors in the structure first, then come back here.')}</p>;
    if (!a.template) return <p role="status" className="text-xs text-slate-600">{t('editor.autoFloors.empty', 'No view has floor regions yet. Draw the floors of one building and link each to its floor; every other building can then reuse that layout here. Until then, use Repeat on other floors.')}</p>;
    return (
      <>
        <p className="text-xs text-slate-700">
          {t('editor.autoFloors.found', { count: a.floors.length, first: first.label, last: last.label, defaultValue: 'Floors found on this building: {{count}} ({{first}} – {{last}}).' })}
        </p>
        <div>
          <label htmlFor={`${id}-src`} className="mb-1 block text-xs font-medium text-slate-600">{t('editor.autoFloors.source', 'Follow the layout of')}</label>
          <select id={`${id}-src`} value={a.template.scene.id} onChange={(e) => a.choose(e.target.value)} className={selectCls}>
            {a.templates.map((tpl) => {
              const vars = { building: a.buildingName(tpl.scene.targetId), view: sideOf(tpl.scene), n: tpl.floors };
              return (
                <option key={tpl.scene.id} value={tpl.scene.id}>
                  {tpl.sameSide
                    ? t('editor.autoFloors.optionSameSide', { ...vars, defaultValue: '{{building}} · {{view}} ({{n}} floors) · same side' })
                    : t('editor.autoFloors.option', { ...vars, defaultValue: '{{building}} · {{view}} ({{n}} floors)' })}
                </option>
              );
            })}
          </select>
          <img src={optimizeImageUrl(a.template.scene.imageUrl, { width: 320 })} alt="" className="mt-1.5 h-24 w-full rounded-lg bg-slate-100 object-contain" />
          {!a.template.sameSide && (
            <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
              {t('editor.autoFloors.otherSide', { side: sideOf(scene), defaultValue: 'No other view of the side "{{side}}" has floors yet, so the closest picture is used. Check the result.' })}
            </p>
          )}
        </div>
        <label className={checkCls}>
          <input type="checkbox" checked={a.withUnits} onChange={(e) => a.setWithUnits(e.target.checked)} className="h-4 w-4" />
          {t('editor.autoFloors.withUnits', 'Also add the apartment outlines (link them afterwards)')}
        </label>
        <label className={checkCls}>
          <input type="checkbox" checked={a.mirror} onChange={(e) => a.setMirror(e.target.checked)} className="h-4 w-4" />
          {t('editor.copyFrom.mirror', 'Mirror left ↔ right')}
        </label>
        <TransferFields values={a.values} onChange={a.setValues} problem={a.problem} />
        <AutoFloorsOutcome outcome={a.outcome} />
        <Button variant="outline" size="sm" className="min-h-[44px] w-full sm:min-h-0" onClick={a.apply}>
          {t('editor.autoFloors.create', 'Add floors')}
        </Button>
      </>
    );
  };

  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <summary className="flex min-h-[44px] cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-800 sm:min-h-[32px]">
        <Wand2 className="h-4 w-4" aria-hidden="true" />
        {t('editor.autoFloors.title', 'Add floors automatically')}
      </summary>
      <div className="mt-2 space-y-2">
        <p className="text-xs leading-relaxed text-slate-500">
          {t('editor.autoFloors.hint', 'Places one region per floor of this building, linked to its floor, laid out like a building you have already drawn (the same side first). Floors already on this view are left alone. Undo removes them all at once.')}
        </p>
        {body()}
      </div>
    </details>
  );
};
