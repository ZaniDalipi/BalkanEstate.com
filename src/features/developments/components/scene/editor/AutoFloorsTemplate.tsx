import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeImageUrl } from '@/config/mediaConfig';
import type { Scene } from '../../../types';
import { TransferFields } from './TransferFields';
import type { AutoFloorsState } from './useAutoFloors';

const selectCls =
  'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]';

/** Another building's view as the starting point: which one (same side first), and fitting it onto this picture. */
export const AutoFloorsTemplate: React.FC<{ a: AutoFloorsState; scene: Scene }> = ({ a, scene }) => {
  const { t } = useTranslation('developments');
  const id = useId();
  const sideOf = (s: Scene) => s.viewName || t(`editor.directions.${s.viewDirection}`, s.viewDirection || s.viewKey);
  if (!a.template) return null;
  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={`${id}-src`} className="mb-1 block text-xs font-medium text-slate-600">{t('editor.autoFloors.source', 'Building view')}</label>
        <select id={`${id}-src`} value={a.template.scene.id} onChange={(e) => a.pickTemplate(e.target.value)} className={selectCls}>
          {a.templates.map((tpl) => {
            const vars = { building: a.buildingName(tpl.scene.targetId), view: sideOf(tpl.scene), n: tpl.levels };
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
            {t('editor.autoFloors.otherSide', { side: sideOf(scene), defaultValue: 'No other building has a "{{side}}" view drawn yet, so the closest picture is used. Check the result.' })}
          </p>
        )}
      </div>
      <label className="flex min-h-[44px] items-center gap-2 text-sm text-slate-800 sm:min-h-[32px]">
        <input type="checkbox" checked={a.fit.mirror} onChange={(e) => a.fit.setMirror(e.target.checked)} className="h-4 w-4" />
        {t('editor.copyFrom.mirror', 'Mirror left ↔ right')}
      </label>
      <TransferFields values={a.fit.values} onChange={a.fit.set} problem={a.fit.problem} />
    </div>
  );
};
