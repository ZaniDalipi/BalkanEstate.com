import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { Button } from '@/src/components/ui/button';
import { MAX_HOTSPOTS_PER_SCENE, type Scene } from '../../../types';
import { useScenes } from '../../../hooks/useScenes';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import { transferHotspots, validateTransferFields, type TransferFieldProblem } from '../../../utils/regionTransfer';
import { TransferFields, type TransferValues } from './TransferFields';

type Outcome = { kind: 'error'; field: 'outside' | 'tooMany' | 'empty' } | { kind: 'done'; made: number };

const sameBuilding = (a: Scene, b: Scene) => a.id !== b.id && a.targetType === b.targetType && a.targetId === b.targetId;
const selectCls =
  'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]';

/**
 * "Copy from another view": brings the saved regions of another picture of the
 * same building (front, left, right, back…) into this one, optionally mirrored,
 * resized and moved, so the structure is not drawn again. Each copy can keep what
 * it links to. Not inside the keyed inspector, so it keeps its result.
 */
export const CopyFromView: React.FC<{ developmentId: string; scene: Scene; editor: PolygonEditor }> = ({ developmentId, scene, editor }) => {
  const { t } = useTranslation('developments');
  const id = useId();
  const { scenes } = useScenes(developmentId);
  const others = scenes.filter((s) => sameBuilding(s, scene));
  const withRegions = others.filter((s) => (s.draft?.hotspots.length ?? 0) > 0);
  const [sourceId, setSourceId] = useState('');
  const source = withRegions.find((s) => s.id === sourceId) ?? withRegions[0];
  const [keepLinks, setKeepLinks] = useState(true);
  const [mirror, setMirror] = useState(false);
  const [values, setValues] = useState<TransferValues>({ size: '100', moveX: '0', moveY: '0' });
  const [problem, setProblem] = useState<TransferFieldProblem | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const nameOf = (s: Scene) => s.viewName || t(`editor.directions.${s.viewDirection}`, s.viewDirection || s.viewKey);

  const copy = () => {
    setOutcome(null);
    const v = validateTransferFields(values.size, values.moveX, values.moveY);
    setProblem(v.ok === false ? v.problem : null);
    if (v.ok === false) return;
    const regions = source?.draft?.hotspots ?? [];
    if (regions.length === 0) return setOutcome({ kind: 'error', field: 'empty' });
    if (editor.state.hotspots.length + regions.length > MAX_HOTSPOTS_PER_SCENE) return setOutcome({ kind: 'error', field: 'tooMany' });
    const placed = transferHotspots(regions, { mirror, sizePct: v.sizePct, moveXPct: v.moveXPct, moveYPct: v.moveYPct }, keepLinks, regions.map(() => editor.nextId()));
    if (placed.ok === false) return setOutcome({ kind: 'error', field: 'outside' });
    editor.dispatch({ type: 'ADD_MANY', hotspots: placed.hotspots });
    setOutcome({ kind: 'done', made: placed.hotspots.length });
  };

  const message = outcome?.kind === 'error' ? outcome.field : null;
  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <summary className="flex min-h-[44px] cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-800 sm:min-h-[32px]">
        <Layers className="h-4 w-4" aria-hidden="true" />
        {t('editor.copyFrom.title', 'Copy from another view')}
      </summary>
      <div className="mt-2 space-y-2">
        <p className="text-xs leading-relaxed text-slate-500">
          {t('editor.copyFrom.hint', 'Brings the regions of another picture of this building into this one, so you do not draw them again. The pictures show different sides, so move and resize the copies afterwards. Undo removes them all at once.')}
        </p>
        {withRegions.length === 0 ? (
          <p role="status" className="text-xs text-slate-600">
            {t('editor.copyFrom.empty', 'No other view of this building has saved regions yet. Draw and save regions on one view first, then come back here from another.')}
          </p>
        ) : (
          <>
            <div>
              <label htmlFor={`${id}-src`} className="mb-1 block text-xs font-medium text-slate-600">{t('editor.copyFrom.source', 'Copy the regions of')}</label>
              <select id={`${id}-src`} value={source?.id} onChange={(e) => { setSourceId(e.target.value); setOutcome(null); }} className={selectCls}>
                {withRegions.map((s) => (
                  <option key={s.id} value={s.id}>{t('editor.copyFrom.sourceOption', { name: nameOf(s), n: s.draft.hotspots.length, defaultValue: '{{name}} ({{n}} regions)' })}</option>
                ))}
              </select>
              {source && <img src={optimizeImageUrl(source.imageUrl, { width: 320 })} alt="" className="mt-1.5 h-24 w-full rounded-lg bg-slate-100 object-contain" />}
            </div>
            <label className="flex min-h-[44px] items-center gap-2 text-sm text-slate-800 sm:min-h-[32px]">
              <input type="checkbox" checked={keepLinks} onChange={(e) => setKeepLinks(e.target.checked)} className="h-4 w-4" />
              {t('editor.copyFrom.keepLinks', 'Keep what the regions link to')}
            </label>
            <label className="flex min-h-[44px] items-center gap-2 text-sm text-slate-800 sm:min-h-[32px]">
              <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} className="h-4 w-4" />
              {t('editor.copyFrom.mirror', 'Mirror left ↔ right')}
            </label>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {t('editor.copyFrom.options', 'Both views show the same building, so the links still fit. Mirror is for the opposite side of a symmetrical building. Switch links off to link every copy again.')}
            </p>
            <TransferFields values={values} onChange={(next) => { setValues(next); setProblem(null); setOutcome(null); }} problem={problem} />
            {message && (
              <p role="alert" className="text-xs text-red-700">
                {message === 'outside'
                  ? t('editor.copyFrom.outside', 'The copied regions would leave the picture. Make them smaller or move them back.')
                  : message === 'tooMany'
                    ? t('editor.copyFrom.tooMany', { max: MAX_HOTSPOTS_PER_SCENE, defaultValue: 'This view would have more than {{max}} regions.' })
                    : t('editor.copyFrom.nothing', 'The chosen view has no regions to copy.')}
              </p>
            )}
            {outcome?.kind === 'done' && (
              <p role="status" className="text-xs text-emerald-700">
                {t('editor.copyFrom.done', { made: outcome.made, defaultValue: 'Regions copied: {{made}}. Move and resize them where needed.' })}
              </p>
            )}
            <Button variant="outline" size="sm" className="min-h-[44px] w-full sm:min-h-0" onClick={copy}>
              {t('editor.copyFrom.create', 'Copy regions')}
            </Button>
          </>
        )}
      </div>
    </details>
  );
};
