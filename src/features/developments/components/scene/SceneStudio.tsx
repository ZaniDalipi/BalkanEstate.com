import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Map as MapIcon, Building2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useDevelopmentStructure } from '../../hooks/useDevelopment';
import { useScenes } from '../../hooks/useScenes';
import type { Scene, SceneTargetType } from '../../types';
import { SceneEditor } from './SceneEditor';
import { BuildingViewManager } from './editor/BuildingViewManager';
import { useConfirmDiscard } from './editor/useUnsavedGuard';

interface SceneStudioProps {
  developmentId: string;
  /** Reports unsaved region edits so a parent can guard its own navigation (e.g. tabs). */
  onDirtyChange?: (dirty: boolean) => void;
}

interface TargetOption {
  key: string;
  type: SceneTargetType;
  id: string;
  label: string;
  depth: number;
}

const encode = (type: SceneTargetType, id: string) => `${type}:${id}`;
const byOrder = (a: Scene, b: Scene) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.viewKey.localeCompare(b.viewKey);

/**
 * Owner-side map studio: pick a target (site plan, a building, a floor), pick
 * or add one of its camera views, then draw regions with {@link SceneEditor}.
 * Switching target or view with unsaved edits asks first.
 */
export const SceneStudio: React.FC<SceneStudioProps> = ({ developmentId, onDirtyChange: reportDirty }) => {
  const { t } = useTranslation('developments');
  const { buildings, floors } = useDevelopmentStructure(developmentId);
  const { scenes } = useScenes(developmentId);
  const confirmDiscard = useConfirmDiscard();
  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [activeKey, setActiveKey] = useState(() => encode('development', developmentId));
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  const targets = useMemo<TargetOption[]>(() => {
    const list: TargetOption[] = [
      { key: encode('development', developmentId), type: 'development', id: developmentId, label: t('scene.sitePlan', 'Site plan (aerial)'), depth: 0 },
    ];
    for (const b of buildings) {
      list.push({ key: encode('building', b.id), type: 'building', id: b.id, label: b.name, depth: 0 });
      for (const f of floors.filter((fl) => fl.buildingId === b.id)) {
        list.push({ key: encode('floor', f.id), type: 'floor', id: f.id, label: f.label, depth: 1 });
      }
    }
    return list;
  }, [buildings, floors, developmentId, t]);

  const active = targets.find((x) => x.key === activeKey) ?? targets[0];
  const viewsByTarget = useMemo(() => {
    const m = new Map<string, Scene[]>();
    for (const s of scenes) {
      const k = encode(s.targetType, s.targetType === 'development' ? developmentId : s.targetId);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    for (const list of m.values()) list.sort(byOrder);
    return m;
  }, [scenes, developmentId]);

  const views = viewsByTarget.get(active.key) ?? [];
  const scene = views.find((v) => v.id === activeSceneId) ?? views[0] ?? null;

  const onDirtyChange = useCallback(
    (d: boolean) => {
      dirtyRef.current = d;
      setDirty(d);
      reportDirty?.(d);
    },
    [reportDirty]
  );

  /** Run a switch only after the owner agreed to drop unsaved edits (if any). */
  const guarded = async (fn: () => void) => {
    if (dirtyRef.current && !(await confirmDiscard())) return;
    onDirtyChange(false);
    fn();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-2">
        <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-500">{t('scene.targetPicker', 'What to map')}</p>
        <ul className="space-y-0.5">
          {targets.map((tg) => {
            const isActive = tg.key === active.key;
            const isPublished = (viewsByTarget.get(tg.key) ?? []).some((v) => !!v.published);
            const Icon = tg.type === 'development' ? MapIcon : tg.type === 'building' ? Building2 : null;
            return (
              <li key={tg.key}>
                <button
                  type="button"
                  onClick={() => !isActive && guarded(() => { setActiveKey(tg.key); setActiveSceneId(null); })}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:min-h-[36px]',
                    tg.depth > 0 && 'pl-7',
                    isActive ? 'bg-primary/10 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : <span className="w-4 shrink-0" />}
                  <span className="min-w-0 flex-1 truncate">{tg.label}</span>
                  {isPublished && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label={t('editor.status.published', 'Published')} />}
                </button>
              </li>
            );
          })}
        </ul>
        {buildings.length === 0 && <p className="px-2 py-2 text-xs text-slate-500">{t('scene.addBuildingsHint', 'Add buildings and floors to map individual facades and floor plans.')}</p>}
      </aside>

      <div className="min-w-0 space-y-3">
        <p className="text-sm text-slate-600">{t('scene.editingTarget', 'Editing: {{target}}', { target: active.label })}</p>
        <BuildingViewManager
          developmentId={developmentId}
          targetType={active.type}
          targetId={active.id}
          views={views}
          activeId={scene?.id ?? null}
          onSelect={(id) => guarded(() => setActiveSceneId(id))}
          dirty={dirty}
          onRegionsReset={() => {
            onDirtyChange(false);
            setResetToken((n) => n + 1);
          }}
        />
        {scene && (
          <SceneEditor key={`${scene.id}:${resetToken}`} developmentId={developmentId} scene={scene} onDirtyChange={onDirtyChange} />
        )}
      </div>
    </div>
  );
};
