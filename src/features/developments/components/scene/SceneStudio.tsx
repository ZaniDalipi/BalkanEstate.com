import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Map, Building2, CheckCircle2 } from 'lucide-react';
import { useDevelopmentStructure, useScenes } from '../../hooks';
import type { SceneTargetType } from '../../types';
import { SceneEditor } from './SceneEditor';

interface SceneStudioProps {
  developmentId: string;
}

interface TargetOption {
  key: string;
  type: SceneTargetType;
  id: string;
  label: string;
  depth: number;
}

const encode = (type: SceneTargetType, id: string) => `${type}:${id}`;

/**
 * Owner-side map/floor-plan studio. Lets the owner choose what to map — the
 * development site plan, a building facade, or an individual floor plan — then
 * draws clickable regions for that target with {@link SceneEditor}. Each target
 * has its own independent scene, mirroring East Gate's site-map → building →
 * floor drill-down.
 */
export const SceneStudio: React.FC<SceneStudioProps> = ({ developmentId }) => {
  const { t } = useTranslation('developments');
  const { buildings, floors } = useDevelopmentStructure(developmentId);
  const { scenes } = useScenes(developmentId);

  // Build the ordered list of mappable targets: site plan, then each building
  // with its floors nested directly beneath it.
  const targets = useMemo<TargetOption[]>(() => {
    const list: TargetOption[] = [
      { key: encode('development', developmentId), type: 'development', id: developmentId, label: t('scene.sitePlan'), depth: 0 },
    ];
    for (const b of buildings) {
      list.push({ key: encode('building', b.id), type: 'building', id: b.id, label: b.name, depth: 0 });
      for (const f of floors.filter((fl) => fl.buildingId === b.id)) {
        list.push({ key: encode('floor', f.id), type: 'floor', id: f.id, label: f.label, depth: 1 });
      }
    }
    return list;
  }, [buildings, floors, developmentId, t]);

  const [activeKey, setActiveKey] = useState(() => encode('development', developmentId));
  const active = targets.find((x) => x.key === activeKey) ?? targets[0];

  // Which targets already have a published scene (for the ✓ marker).
  const publishedTargets = useMemo(() => {
    const s = new Set<string>();
    for (const sc of scenes) {
      if (sc.published && sc.published.hotspots.length > 0) s.add(encode(sc.targetType, sc.targetId));
    }
    return s;
  }, [scenes]);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      {/* Target rail */}
      <aside className="rounded-2xl border border-border bg-white p-2">
        <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('scene.targetPicker')}
        </p>
        <ul className="space-y-0.5">
          {targets.map((tg) => {
            const isActive = tg.key === activeKey;
            const isPublished = publishedTargets.has(tg.key);
            const Icon = tg.type === 'development' ? Map : tg.type === 'building' ? Building2 : null;
            return (
              <li key={tg.key}>
                <button
                  type="button"
                  onClick={() => setActiveKey(tg.key)}
                  aria-current={isActive ? 'true' : undefined}
                  className={[
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                    tg.depth > 0 ? 'pl-7' : '',
                    isActive ? 'bg-primary/10 font-medium text-foreground' : 'text-muted-foreground hover:bg-muted',
                  ].join(' ')}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : <span className="w-4 shrink-0" />}
                  <span className="min-w-0 flex-1 truncate">{tg.label}</span>
                  {isPublished && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" aria-label={t('detail.published')} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {buildings.length === 0 && (
          <p className="px-2 py-2 text-xs text-muted-foreground">{t('scene.addBuildingsHint')}</p>
        )}
      </aside>

      {/* Editor for the selected target */}
      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          {t('scene.editingTarget', { target: active.label })}
        </p>
        <SceneEditor
          key={active.key}
          developmentId={developmentId}
          targetType={active.type}
          targetId={active.id}
        />
      </div>
    </div>
  );
};
