import { useMemo, useState } from 'react';
import { MAX_HOTSPOTS_PER_SCENE, type Scene } from '../../../types';
import { useScenes } from '../../../hooks/useScenes';
import { useDevelopmentStructure, useDevelopmentUnits } from '../../../hooks/useDevelopment';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import { transferHotspots, validateTransferFields, type TransferFieldProblem } from '../../../utils/regionTransfer';
import { drawnLevels, parseStepPct, suggestStepPct, type LevelContext, type UnitRef } from '../../../utils/floorLevels';
import { fillFloors, floorTemplates, type FillResult } from '../../../utils/floorTemplate';
import type { TransferValues } from './TransferFields';
import { FIRST_PAGE, unitScopeFor } from './useLinkOptions';

export type AutoFloorsSource = 'here' | 'template';
export type AutoFloorsOutcome =
  | { kind: 'error'; reason: 'step' | 'outside' | 'tooMany' | 'nothing' }
  | { kind: 'done'; result: FillResult; source: AutoFloorsSource };

const toRefs = (list: { id: string; unitNumber: string; floorId: string }[]): UnitRef[] =>
  list.map((u) => ({ id: u.id, unitNumber: u.unitNumber, floorId: u.floorId }));
const noIds = () => '';

/**
 * State of "Add floors automatically": the building's floors, what this view
 * already has per floor, the other buildings' views that can serve as a
 * template, the floor height, and a dry run of what pressing Add would do.
 */
export function useAutoFloors(developmentId: string, scene: Scene, editor: PolygonEditor) {
  const { scenes } = useScenes(developmentId);
  const structure = useDevelopmentStructure(developmentId);
  // Same query as the region links (cached): this building's apartments and their floors.
  const own = useDevelopmentUnits(developmentId, { ...unitScopeFor(scene), limit: FIRST_PAGE });
  const otherIds = useMemo(() => {
    const ids = scenes.filter((s) => s.targetType === 'building' && s.targetId !== scene.targetId)
      .flatMap((s) => (s.draft?.hotspots ?? []).filter((h) => h.linkType === 'unit' && h.linkId).map((h) => h.linkId));
    return [...new Set(ids)].sort().slice(0, FIRST_PAGE);
  }, [scenes, scene.targetId]);
  const others = useDevelopmentUnits(otherIds.length > 0 ? developmentId : undefined, { ids: otherIds, limit: FIRST_PAGE });

  const ctx = useMemo<LevelContext>(
    () => ({ floors: structure.floors, units: [...toRefs(own.units), ...toRefs(others.units)] }),
    [structure.floors, own.units, others.units]
  );
  const floors = useMemo(() => structure.floors.filter((f) => f.buildingId === scene.targetId).sort((a, b) => a.level - b.level), [structure.floors, scene.targetId]);
  const here = useMemo(() => drawnLevels(editor.state.hotspots, scene.targetId, ctx), [editor.state.hotspots, scene.targetId, ctx]);
  const templates = useMemo(() => floorTemplates(scenes, scene, ctx), [scenes, scene, ctx]);
  const buildingNames = useMemo(() => new Map(structure.buildings.map((b) => [b.id, b.name])), [structure.buildings]);

  const [picked, setPicked] = useState<AutoFloorsSource | null>(null);
  const source: AutoFloorsSource = picked ?? (here.length > 0 || templates.length === 0 ? 'here' : 'template');
  const [templateId, setTemplateId] = useState('');
  const template = templates.find((t) => t.scene.id === templateId) ?? templates[0];
  const [fit, setFit] = useState<TransferValues>({ size: '100', moveX: '0', moveY: '0' });
  const [mirror, setMirror] = useState(false);
  const [fitProblem, setFitProblem] = useState<TransferFieldProblem | null>(null);
  const [stepText, setStepText] = useState<string | null>(null);
  const [floorOutline, setFloorOutline] = useState(true);
  const [outcome, setOutcome] = useState<AutoFloorsOutcome | null>(null);

  // The levels to copy from: this view's, or the template's after fitting it onto this picture.
  const groups = useMemo(() => {
    if (source === 'here' || !template) return here;
    const v = validateTransferFields(fit.size, fit.moveX, fit.moveY);
    if (v.ok === false) return [];
    const regions = template.scene.draft?.hotspots ?? [];
    const placed = transferHotspots(regions, { mirror, sizePct: v.sizePct, moveXPct: v.moveXPct, moveYPct: v.moveYPct }, true, regions.map((h) => h.id));
    return placed.ok ? drawnLevels(placed.hotspots, template.scene.targetId, ctx) : [];
  }, [source, template, here, fit, mirror, ctx]);

  const stepValue = stepText ?? String(suggestStepPct(groups));
  const step = parseStepPct(stepValue);
  const drawn = useMemo(() => new Set(here.map((g) => g.level)), [here]);
  const run = (nextId: () => string) => (step.ok ? fillFloors({ groups, floors, drawn, stepPct: step.value, units: ctx.units, floorOutline, nextId }) : null);
  const plan = run(noIds);

  const reset = () => setOutcome(null);
  const apply = () => {
    reset();
    if (source === 'template') {
      const v = validateTransferFields(fit.size, fit.moveX, fit.moveY);
      setFitProblem(v.ok === false ? v.problem : null);
      if (v.ok === false) return;
    }
    if (!step.ok) return setOutcome({ kind: 'error', reason: 'step' });
    const result = run(editor.nextId) as FillResult;
    if (result.hotspots.length === 0) return setOutcome({ kind: 'error', reason: result.outside.length > 0 || groups.length === 0 ? 'outside' : 'nothing' });
    if (editor.state.hotspots.length + result.hotspots.length > MAX_HOTSPOTS_PER_SCENE) return setOutcome({ kind: 'error', reason: 'tooMany' });
    editor.dispatch({ type: 'ADD_MANY', hotspots: result.hotspots });
    setOutcome({ kind: 'done', result, source });
  };

  return {
    loading: structure.isLoading || own.isLoading,
    failed: !!structure.error,
    floors, here, templates, template, source, plan, outcome, apply,
    floorOutline,
    setFloorOutline: (on: boolean) => { setFloorOutline(on); reset(); },
    unlinkedCount: editor.state.hotspots.filter((h) => !h.linkId).length,
    buildingName: (id: string) => buildingNames.get(id) ?? '',
    pickSource: (s: AutoFloorsSource) => { setPicked(s); setStepText(null); reset(); },
    pickTemplate: (id: string) => { setTemplateId(id); setStepText(null); reset(); },
    step: { value: stepValue, invalid: outcome?.kind === 'error' && outcome.reason === 'step', set: (v: string) => { setStepText(v); reset(); } },
    fit: { values: fit, problem: fitProblem, mirror, set: (v: TransferValues) => { setFit(v); setFitProblem(null); reset(); }, setMirror: (on: boolean) => { setMirror(on); reset(); } },
  };
}

export type AutoFloorsState = ReturnType<typeof useAutoFloors>;
