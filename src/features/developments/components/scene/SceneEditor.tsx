import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Hotspot, HotspotLinkType, Scene, SceneTargetType } from '../../types';
import { usePolygonEditor } from '../../hooks/usePolygonEditor';
import { EditorCanvas } from './editor/EditorCanvas';
import { EditorToolbar } from './editor/EditorToolbar';
import { RegionList } from './editor/RegionList';
import { RegionInspector } from './editor/RegionInspector';
import { SceneStatusBar } from './editor/SceneStatusBar';
import { useSceneSync } from './editor/useSceneSync';
import { useLinkOptions } from './editor/useLinkOptions';
import { useEditorShortcuts } from './editor/useEditorShortcuts';
import { RouterLeaveGuard, useBeforeUnloadGuard } from './editor/useUnsavedGuard';
import { regionPaint } from './editor/canvasUtils';

interface SceneEditorProps {
  developmentId: string;
  /** The view (one camera perspective) being edited. */
  scene: Scene;
  /** Reports unsaved local edits so the parent can guard view/target switches. */
  onDirtyChange?: (dirty: boolean) => void;
}

/** What a freshly drawn region links to — its TYPE only; the target is left for the owner. */
const DEFAULT_LINK_TYPE: Record<SceneTargetType, HotspotLinkType> = {
  development: 'building',
  building: 'unit',
  floor: 'unit',
};

/**
 * Owner-side visual region editor for one scene view: draw rectangles and
 * polygons over the image, reshape them, link each to a unit/floor/building/
 * entrance/listing, then save a draft and publish. New regions are never
 * auto-linked; they are flagged "missing link" until the owner picks a target.
 */
export const SceneEditor: React.FC<SceneEditorProps> = ({ developmentId, scene, onDirtyChange }) => {
  const { t } = useTranslation('developments');
  const rootRef = useRef<HTMLDivElement>(null);
  const editor = usePolygonEditor(scene.draft?.hotspots ?? []);
  const sync = useSceneSync(developmentId, scene, editor);
  const { options, availabilityOf, labelOf } = useLinkOptions(developmentId, scene);
  const [showLabels, setShowLabels] = useState(true);
  const [preview, setPreview] = useState(false);
  const linkType = DEFAULT_LINK_TYPE[scene.targetType];

  useEditorShortcuts({ editor, rootRef, linkType, enabled: !preview });
  useBeforeUnloadGuard(sync.dirty);
  useEffect(() => onDirtyChange?.(sync.dirty), [sync.dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const paintOf = useCallback((h: Hotspot) => regionPaint(h, availabilityOf), [availabilityOf]);
  const { state } = editor;
  const selected = state.hotspots.find((h) => h.id === state.selectedId) ?? null;
  const issueCount = Object.keys(editor.issues).length;

  return (
    <div ref={rootRef} className="space-y-3">
      <RouterLeaveGuard dirty={sync.dirty} />
      <SceneStatusBar scene={scene} sync={sync} issueCount={issueCount} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-2">
          <EditorToolbar
            editor={editor}
            linkType={linkType}
            showLabels={showLabels}
            onToggleLabels={() => setShowLabels((v) => !v)}
            preview={preview}
            onTogglePreview={() => {
              setPreview((v) => !v);
              editor.dispatch({ type: 'DRAW_CANCEL' });
            }}
          />
          <EditorCanvas
            imageUrl={scene.imageUrl}
            imageWidth={scene.imageWidth}
            imageHeight={scene.imageHeight}
            editor={editor}
            linkType={linkType}
            paintOf={paintOf}
            labelOf={labelOf}
            showLabels={showLabels}
            preview={preview}
          />
          <p className="text-xs text-slate-500">
            {preview
              ? t('editor.hint.preview', 'Preview: this is how visitors see the published view. Turn preview off to edit.')
              : state.tool === 'polygon'
                ? t('editor.hint.polygon', 'Click to add points. Close by clicking the first point, pressing Enter or tapping Finish. Esc cancels.')
                : state.tool === 'rect'
                  ? t('editor.hint.rect', 'Drag to draw a rectangle.')
                  : t('editor.hint.select', 'Click a region to select it. Scroll to zoom; hold Space and drag (or use two fingers) to pan.')}
          </p>
        </div>

        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4" aria-label={t('scene.regions', 'Regions')}>
          <h3 className="text-sm font-semibold text-slate-900">
            {t('scene.regions', 'Regions')} ({state.hotspots.length})
          </h3>
          <RegionList editor={editor} issues={sync.issues} labelOf={labelOf} />
          <div className="border-t border-slate-200 pt-3">
            {selected && !preview ? (
              <RegionInspector
                key={selected.id}
                developmentId={developmentId}
                editor={editor}
                hotspot={selected}
                linkOptions={options}
                issues={sync.issues[selected.id] ?? []}
              />
            ) : (
              <p className="text-xs text-slate-500">{t('scene.selectHint', 'Select a region to edit its link.')}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
