import { useMemo, useState } from 'react';
import { MAX_HOTSPOTS_PER_SCENE, type Scene } from '../../../types';
import { useScenes } from '../../../hooks/useScenes';
import { useDevelopmentStructure } from '../../../hooks/useDevelopment';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import { validateTransferFields, type TransferFieldProblem } from '../../../utils/regionTransfer';
import { buildFloorRegions, floorTemplates } from '../../../utils/floorTemplate';
import type { TransferValues } from './TransferFields';

export type AutoFloorsOutcome =
  | { kind: 'error'; reason: 'noTemplate' | 'outside' | 'tooMany' | 'allThere' }
  | { kind: 'done'; floors: number; units: number; estimated: number; alreadyThere: number; outside: number };

/**
 * State and the one action of "Add floors automatically": the building's floors
 * (from the structure), the views that can serve as a template (same side
 * first), the fitting fields, and what the last attempt did.
 */
export function useAutoFloors(developmentId: string, scene: Scene, editor: PolygonEditor) {
  const { scenes } = useScenes(developmentId);
  const structure = useDevelopmentStructure(developmentId);
  const floors = useMemo(
    () => structure.floors.filter((f) => f.buildingId === scene.targetId).sort((a, b) => a.level - b.level),
    [structure.floors, scene.targetId]
  );
  const buildingNames = useMemo(() => new Map(structure.buildings.map((b) => [b.id, b.name])), [structure.buildings]);
  const templates = useMemo(() => floorTemplates(scenes, scene, structure.floors), [scenes, scene, structure.floors]);
  const [sourceId, setSourceId] = useState('');
  const template = templates.find((t) => t.scene.id === sourceId) ?? templates[0];
  const [withUnits, setWithUnits] = useState(true);
  const [mirror, setMirror] = useState(false);
  const [values, setValues] = useState<TransferValues>({ size: '100', moveX: '0', moveY: '0' });
  const [problem, setProblem] = useState<TransferFieldProblem | null>(null);
  const [outcome, setOutcome] = useState<AutoFloorsOutcome | null>(null);

  const reset = () => setOutcome(null);
  const apply = () => {
    reset();
    const v = validateTransferFields(values.size, values.moveX, values.moveY);
    setProblem(v.ok === false ? v.problem : null);
    if (v.ok === false) return;
    if (!template) return setOutcome({ kind: 'error', reason: 'noTemplate' });
    const result = buildFloorRegions({
      template: template.scene,
      floors: structure.floors,
      buildingId: scene.targetId,
      existing: editor.state.hotspots,
      withUnits,
      adjust: { mirror, sizePct: v.sizePct, moveXPct: v.moveXPct, moveYPct: v.moveYPct },
      nextId: editor.nextId,
    });
    if (result.ok === false) return setOutcome({ kind: 'error', reason: result.problem === 'outside' ? 'outside' : 'noTemplate' });
    if (result.hotspots.length === 0) {
      return setOutcome(result.alreadyThere > 0 && result.outside === 0 ? { kind: 'error', reason: 'allThere' } : { kind: 'error', reason: 'outside' });
    }
    if (editor.state.hotspots.length + result.hotspots.length > MAX_HOTSPOTS_PER_SCENE) return setOutcome({ kind: 'error', reason: 'tooMany' });
    editor.dispatch({ type: 'ADD_MANY', hotspots: result.hotspots });
    const { floors: made, units, estimated, alreadyThere, outside } = result;
    setOutcome({ kind: 'done', floors: made, units, estimated, alreadyThere, outside });
  };

  return {
    floors,
    loading: structure.isLoading,
    failed: !!structure.error,
    templates,
    template,
    buildingName: (id: string) => buildingNames.get(id) ?? '',
    choose: (id: string) => { setSourceId(id); reset(); },
    withUnits,
    setWithUnits,
    mirror,
    setMirror: (on: boolean) => { setMirror(on); reset(); },
    values,
    setValues: (next: TransferValues) => { setValues(next); setProblem(null); reset(); },
    problem,
    outcome,
    apply,
  };
}

export type AutoFloorsState = ReturnType<typeof useAutoFloors>;
