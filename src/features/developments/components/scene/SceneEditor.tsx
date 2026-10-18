import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MousePointer2, Square, Hexagon, Trash2, Save, Upload, Globe2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { cn } from '@/src/lib/utils';
import {
  useScenes,
  useSceneMutations,
  useDevelopmentStructure,
  useDevelopmentUnits,
} from '../../hooks';
import type { Hotspot, HotspotLinkType, HotspotShape, SceneTargetType } from '../../types';
import { HotspotCanvas, type Tool } from './HotspotCanvas';
import { ListingLinkPicker } from './ListingLinkPicker';

interface SceneEditorProps {
  developmentId: string;
  targetType: SceneTargetType;
  targetId: string;
}

const uid = () => `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * Owner-side visual map editor. Upload an image (aerial render, building facade
 * or floor plan), draw clickable regions, link each to a building/floor/unit/
 * listing, save as a draft, and publish. Coordinates are stored normalised
 * (0–1) so the regions stay aligned at any display size.
 */
export const SceneEditor: React.FC<SceneEditorProps> = ({ developmentId, targetType, targetId }) => {
  const { t } = useTranslation('developments');
  const { scenes } = useScenes(developmentId);
  const { uploadImage, isUploading, saveDraft, isSaving, publish, isPublishing } =
    useSceneMutations(developmentId);
  const { buildings, floors } = useDevelopmentStructure(developmentId);
  const { units } = useDevelopmentUnits(developmentId, { limit: 200 });

  const scene = useMemo(
    () => scenes.find((s) => s.targetType === targetType && s.targetId === targetId),
    [scenes, targetType, targetId]
  );

  const [tool, setTool] = useState<Tool>('select');
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Load the scene's draft when it (re)loads.
  useEffect(() => {
    setHotspots(scene?.draft?.hotspots ?? []);
    setDirty(false);
  }, [scene?.id, scene?.draft?.version]);

  // Link target options from the development's structure + units. The `listing`
  // target is handled separately by a searchable picker over the owner's
  // listings (see ListingLinkPicker).
  const linkOptions = useMemo(
    () => ({
      building: buildings.map((b) => ({ id: b.id, label: b.name })),
      floor: floors.map((f) => ({ id: f.id, label: f.label })),
      unit: units.map((u) => ({ id: u.id, label: u.unitNumber })),
    }),
    [buildings, floors, units]
  );

  const defaultLinkType: HotspotLinkType =
    targetType === 'development' ? 'building' : targetType === 'building' ? 'floor' : 'unit';

  const update = (next: Hotspot[]) => {
    setHotspots(next);
    setDirty(true);
  };

  const onCreate = (shape: HotspotShape, points: number[][]) => {
    const opts = linkOptions[defaultLinkType];
    const h: Hotspot = {
      id: uid(),
      shape,
      points,
      linkType: defaultLinkType,
      linkId: opts[0]?.id ?? '',
      z: hotspots.length,
    };
    update([...hotspots, h]);
    setSelectedId(h.id);
    setTool('select');
  };

  const patchSelected = (patch: Partial<Hotspot>) => {
    if (!selectedId) return;
    update(hotspots.map((h) => (h.id === selectedId ? { ...h, ...patch } : h)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    update(hotspots.filter((h) => h.id !== selectedId));
    setSelectedId(null);
  };

  const onSave = async () => {
    if (!scene) return;
    if (hotspots.some((h) => !h.linkId)) {
      setMsg(t('scene.needLink'));
      return;
    }
    setMsg(null);
    await saveDraft({ sceneId: scene.id, hotspots });
    setDirty(false);
    setMsg(t('scene.saved'));
  };

  const onPublish = async () => {
    if (!scene) return;
    if (dirty) await onSave();
    await publish(scene.id);
    setMsg(t('scene.published'));
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMsg(t('cover.invalidType'));
      return;
    }
    await uploadImage({ targetType, file, targetId });
  };

  // --- No image yet: upload prompt ----------------------------------------
  if (!scene) {
    return (
      <label className="flex h-56 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50">
        <Upload className="h-7 w-7" aria-hidden="true" />
        <span className="text-sm font-medium">{t('scene.uploadImage')}</span>
        <span className="text-xs">{t('scene.uploadHint')}</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onUpload(e.target.files?.[0])}
        />
        {isUploading && <span className="text-xs">{t('wizard.creating')}</span>}
        {msg && <span className="text-xs text-red-600">{msg}</span>}
      </label>
    );
  }

  const selected = hotspots.find((h) => h.id === selectedId) ?? null;
  const toolBtn = (value: Tool, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setTool(value)}
      aria-pressed={tool === value}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
        tool === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {toolBtn('select', <MousePointer2 className="h-4 w-4" />, t('scene.tools.select'))}
          {toolBtn('rect', <Square className="h-4 w-4" />, t('scene.tools.rect'))}
          {toolBtn('polygon', <Hexagon className="h-4 w-4" />, t('scene.tools.polygon'))}
          <span className="mx-1 hidden text-xs text-muted-foreground sm:inline">{t('scene.drawHint')}</span>

          <div className="ml-auto flex items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted">
              <Upload className="h-4 w-4" aria-hidden="true" />
              {t('scene.replace')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
            </label>
            <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving || !dirty}>
              <Save className="mr-1 h-4 w-4" aria-hidden="true" />
              {t('scene.saveDraft')}
            </Button>
            <Button size="sm" onClick={onPublish} disabled={isPublishing}>
              <Globe2 className="mr-1 h-4 w-4" aria-hidden="true" />
              {t('scene.publish')}
            </Button>
          </div>
        </div>

        <HotspotCanvas
          imageUrl={scene.imageUrl}
          imageWidth={scene.imageWidth}
          imageHeight={scene.imageHeight}
          hotspots={hotspots}
          mode="edit"
          tool={tool}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={onCreate}
        />

        {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
      </div>

      {/* Sidebar: hotspot list + link editor */}
      <aside className="rounded-2xl border border-border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          {t('scene.regions')} ({hotspots.length})
        </h3>

        {hotspots.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('scene.empty')}</p>
        )}

        <ul className="mb-4 max-h-48 space-y-1 overflow-y-auto">
          {hotspots.map((h, i) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(h.id);
                  setTool('select');
                }}
                className={cn(
                  'w-full truncate rounded-lg px-2 py-1 text-left text-sm',
                  h.id === selectedId ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {i + 1}. {h.label || `${t(`scene.linkTypes.${h.linkType}`)}`}
              </button>
            </li>
          ))}
        </ul>

        {selected ? (
          <div className="space-y-3 border-t border-border pt-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('scene.linkType')}</label>
              <select
                value={selected.linkType}
                onChange={(e) => patchSelected({ linkType: e.target.value as HotspotLinkType, linkId: '' })}
                className="min-h-[36px] w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                {(['building', 'floor', 'unit', 'listing'] as HotspotLinkType[]).map((lt) => (
                  <option key={lt} value={lt}>
                    {t(`scene.linkTypes.${lt}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('scene.linkTarget')}</label>
              {selected.linkType === 'listing' ? (
                <ListingLinkPicker
                  developmentId={developmentId}
                  value={selected.linkId}
                  onPick={(id, title) =>
                    patchSelected({ linkId: id, label: selected.label || title })
                  }
                  onClear={() => patchSelected({ linkId: '' })}
                />
              ) : selected.linkType === 'entrance' ? (
                <input
                  value={selected.linkId}
                  onChange={(e) => patchSelected({ linkId: e.target.value })}
                  placeholder={t('scene.linkIdPlaceholder')}
                  className="min-h-[36px] w-full rounded-lg border border-input bg-background px-2 text-sm"
                />
              ) : (
                <select
                  value={selected.linkId}
                  onChange={(e) => patchSelected({ linkId: e.target.value })}
                  className="min-h-[36px] w-full rounded-lg border border-input bg-background px-2 text-sm"
                >
                  <option value="">—</option>
                  {(linkOptions[selected.linkType as 'building' | 'floor' | 'unit'] ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('scene.label')}</label>
              <input
                value={selected.label ?? ''}
                onChange={(e) => patchSelected({ label: e.target.value })}
                placeholder={t('scene.labelPlaceholder')}
                className="min-h-[36px] w-full rounded-lg border border-input bg-background px-2 text-sm"
              />
            </div>

            <Button variant="outline" size="sm" onClick={deleteSelected} className="w-full text-red-600">
              <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
              {t('scene.deleteRegion')}
            </Button>
          </div>
        ) : (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">{t('scene.selectHint')}</p>
        )}
      </aside>
    </div>
  );
};
