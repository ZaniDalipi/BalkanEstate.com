import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CopyPlus } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { Hotspot } from '../../../types';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import type { Point } from '../../../utils/polygonGeometry';
import { MAX_REPEAT_COPIES, MAX_REPEAT_STEP_PCT, MIN_REPEAT_STEP_PCT, defaultStepPct, isVertical, repeatPoints, validateRepeat, type RepeatDirection } from '../../../utils/regionRepeat';

const DIRECTIONS: RepeatDirection[] = ['down', 'up', 'right', 'left'];
const fieldCls =
  'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-[invalid=true]:border-red-400 sm:min-h-[36px]';

type Outcome = { kind: 'error'; field: 'count' | 'step' | 'room' } | { kind: 'done'; made: number; wanted: number; ids: string[] };

/**
 * "Repeat on other floors": copies the selected region down (or up, or along a
 * row) at an even spacing, so one drawn apartment outline becomes a whole column
 * of them. The copies have no apartment yet; each is linked afterwards.
 * The editor selects the first copy afterwards; the panel stays as it is for the
 * copies (same size, same spacing) and starts over when another region is picked.
 */
export const RepeatRegion: React.FC<{ editor: PolygonEditor; hotspot: Hotspot }> = ({ editor, hotspot }) => {
  const { t } = useTranslation('developments');
  const id = useId();
  const [direction, setDirection] = useState<RepeatDirection>('down');
  const [count, setCount] = useState('4');
  const [step, setStep] = useState(() => String(defaultStepPct(hotspot.points as Point[], 'down')));
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [seenId, setSeenId] = useState(hotspot.id);

  // Another region selected: suggest its spacing again, unless it is one of the copies just made.
  if (seenId !== hotspot.id) {
    setSeenId(hotspot.id);
    if (!(outcome?.kind === 'done' && outcome.ids.includes(hotspot.id))) {
      setOutcome(null);
      setStep(String(defaultStepPct(hotspot.points as Point[], direction)));
    }
  }

  const changeDirection = (d: RepeatDirection) => {
    setDirection(d);
    setStep(String(defaultStepPct(hotspot.points as Point[], d)));
    setOutcome(null);
  };

  const create = () => {
    const v = validateRepeat(count, step);
    if (v.ok === false) return setOutcome({ kind: 'error', field: v.problem });
    const made = repeatPoints(hotspot.points as Point[], direction, v.stepPct, v.count).length;
    if (made === 0) return setOutcome({ kind: 'error', field: 'room' });
    const ids = Array.from({ length: made }, () => editor.nextId());
    editor.dispatch({ type: 'REPEAT', id: hotspot.id, ids, direction, stepPct: v.stepPct });
    setOutcome({ kind: 'done', made, wanted: v.count, ids });
  };

  const err = outcome?.kind === 'error' ? outcome.field : null;
  const stepLabel = isVertical(direction)
    ? t('editor.repeat.stepHeight', 'Distance between copies (% of picture height)')
    : t('editor.repeat.stepWidth', 'Distance between copies (% of picture width)');

  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <summary className="flex min-h-[44px] cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-800 sm:min-h-[32px]">
        <CopyPlus className="h-4 w-4" aria-hidden="true" />
        {t('editor.repeat.title', 'Repeat on other floors')}
      </summary>
      <div className="mt-2 space-y-2">
        <p className="text-xs leading-relaxed text-slate-500">
          {t('editor.repeat.hint', 'Copies this region again and again at an even distance, for example one apartment on every floor. The copies have no apartment yet: link each one afterwards.')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${id}-dir`} className="mb-1 block text-xs font-medium text-slate-600">{t('editor.repeat.direction', 'Direction')}</label>
            <select id={`${id}-dir`} value={direction} onChange={(e) => changeDirection(e.target.value as RepeatDirection)} className={fieldCls}>
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>{t(`editor.repeat.${d}`, d)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-count`} className="mb-1 block text-xs font-medium text-slate-600">{t('editor.repeat.count', 'Number of copies')}</label>
            <input
              id={`${id}-count`}
              inputMode="numeric"
              value={count}
              onChange={(e) => { setCount(e.target.value); setOutcome(null); }}
              aria-invalid={err === 'count'}
              aria-describedby={err === 'count' ? `${id}-count-err` : undefined}
              className={fieldCls}
            />
          </div>
        </div>
        {err === 'count' && (
          <p id={`${id}-count-err`} role="alert" className="text-xs text-red-700">
            {t('editor.repeat.countInvalid', { max: MAX_REPEAT_COPIES, defaultValue: 'Enter a whole number from 1 to {{max}}.' })}
          </p>
        )}
        <div>
          <label htmlFor={`${id}-step`} className="mb-1 block text-xs font-medium text-slate-600">{stepLabel}</label>
          <input
            id={`${id}-step`}
            inputMode="decimal"
            value={step}
            onChange={(e) => { setStep(e.target.value); setOutcome(null); }}
            aria-invalid={err === 'step'}
            aria-describedby={err === 'step' ? `${id}-step-err` : undefined}
            className={fieldCls}
          />
          {err === 'step' ? (
            <p id={`${id}-step-err`} role="alert" className="mt-1 text-xs text-red-700">
              {t('editor.repeat.stepInvalid', { min: MIN_REPEAT_STEP_PCT, max: MAX_REPEAT_STEP_PCT, defaultValue: 'Enter a distance from {{min}} to {{max}}.' })}
            </p>
          ) : (
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {t('editor.repeat.stepHelp', 'Start with the suggested distance and check the result. Undo (Ctrl+Z) removes all the copies at once.')}
            </p>
          )}
        </div>
        {err === 'room' && (
          <p role="alert" className="text-xs text-red-700">
            {t('editor.repeat.noRoom', 'No copy fits inside the picture. Use a smaller distance or another direction.')}
          </p>
        )}
        {outcome?.kind === 'done' && (
          <p role="status" className="text-xs text-emerald-700">
            {outcome.made < outcome.wanted
              ? t('editor.repeat.donePartial', { made: outcome.made, wanted: outcome.wanted, defaultValue: 'Copies created: {{made}} of {{wanted}}; the rest would leave the picture. Now link each one to its apartment.' })
              : t('editor.repeat.done', { made: outcome.made, defaultValue: 'Copies created: {{made}}. Now link each one to its apartment.' })}
          </p>
        )}
        <Button variant="outline" size="sm" className="min-h-[44px] w-full sm:min-h-0" onClick={create}>
          {t('editor.repeat.create', 'Create copies')}
        </Button>
      </div>
    </details>
  );
};
