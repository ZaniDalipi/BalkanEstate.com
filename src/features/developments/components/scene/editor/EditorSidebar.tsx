import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Hotspot, Scene } from '../../../types';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import { RegionList } from './RegionList';
import { RegionInspector, type LinkOptions } from './RegionInspector';
import { RepeatRegion } from './RepeatRegion';
import { CopyFromView } from './CopyFromView';
import { AutoFloors } from './AutoFloors';
import { FloorReviewPanel } from './FloorReviewPanel';
import type { FloorReview } from './useFloorReview';
import type { SceneSync } from './useSceneSync';
import type { UnitPickerSource } from './useLinkOptions';

interface EditorSidebarProps {
  developmentId: string;
  scene: Scene;
  editor: PolygonEditor;
  sync: SceneSync;
  review: FloorReview;
  preview: boolean;
  options: LinkOptions;
  unitPicker: UnitPickerSource;
  labelOf: (h: Hotspot) => string;
}

/** The editor's side panel: regions still to check, the region list, the selected region, and the tools that add regions. */
export const EditorSidebar: React.FC<EditorSidebarProps> = ({ developmentId, scene, editor, sync, review, preview, options, unitPicker, labelOf }) => {
  const { t } = useTranslation('developments');
  const { state } = editor;
  const selected = state.hotspots.find((h) => h.id === state.selectedId) ?? null;
  return (
    <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4" aria-label={t('scene.regions', 'Regions')}>
      {!preview && <FloorReviewPanel review={review} />}
      <h3 className="text-sm font-semibold text-slate-900">
        {t('scene.regions', 'Regions')} ({state.hotspots.length})
      </h3>
      <RegionList editor={editor} issues={sync.issues} labelOf={labelOf} />
      <div className="border-t border-slate-200 pt-3">
        {selected && !preview ? (
          <div className="space-y-3">
            <RegionInspector
              key={selected.id}
              developmentId={developmentId}
              editor={editor}
              hotspot={selected}
              linkOptions={options}
              unitPicker={unitPicker}
              targetLabel={labelOf({ ...selected, label: '' })}
              issues={sync.issues[selected.id] ?? []}
              buildingId={scene.targetType === 'building' ? scene.targetId : undefined}
            />
            {/* Outside the keyed inspector: creating copies selects the first one, and the panel must keep its result. */}
            <RepeatRegion editor={editor} hotspot={selected} />
          </div>
        ) : (
          <p className="text-xs text-slate-500">{t('scene.selectHint', 'Select a region to edit its link.')}</p>
        )}
      </div>
      {!preview && scene.targetType === 'building' && <AutoFloors developmentId={developmentId} scene={scene} editor={editor} onPlaced={review.start} />}
      {!preview && <CopyFromView developmentId={developmentId} scene={scene} editor={editor} />}
    </aside>
  );
};
