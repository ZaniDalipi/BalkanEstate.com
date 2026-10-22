import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Eye,
  EyeOff,
  Grid3x3,
  Hexagon,
  Magnet,
  MousePointer2,
  Redo2,
  Square,
  Tag,
  Undo2,
  X,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { EditorTool, PolygonEditor } from '../../../hooks/usePolygonEditor';
import type { HotspotLinkType } from '../../../types';

interface EditorToolbarProps {
  editor: PolygonEditor;
  linkType: HotspotLinkType;
  showLabels: boolean;
  onToggleLabels: () => void;
  preview: boolean;
  onTogglePreview: () => void;
}

const btn =
  'inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 sm:h-9 sm:min-w-[36px]';
const on = 'border-primary bg-primary text-white';
const off = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';

/** Tools, history, snapping and display toggles above the canvas. */
export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  linkType,
  showLabels,
  onToggleLabels,
  preview,
  onTogglePreview,
}) => {
  const { t } = useTranslation('developments');
  const { state, dispatch, canUndo, canRedo, nextId } = editor;
  const allHidden = state.hotspots.length > 0 && state.hidden.length === state.hotspots.length;

  const tool = (value: EditorTool, Icon: typeof Square, label: string, shortcut: string) => (
    <button
      type="button"
      onClick={() => dispatch({ type: 'SET_TOOL', tool: value })}
      aria-pressed={state.tool === value}
      aria-label={label}
      title={`${label} (${shortcut})`}
      disabled={preview}
      className={cn(btn, state.tool === value ? on : off)}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  const toggle = (pressed: boolean, onClick: () => void, Icon: typeof Square, label: string, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(btn, pressed ? 'border-primary/40 bg-primary/10 text-primary' : off)}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label={t('editor.toolbar.label', 'Editor tools')}>
      <div className="flex gap-1.5" role="group" aria-label={t('editor.toolbar.tools', 'Drawing tools')}>
        {tool('select', MousePointer2, t('scene.tools.select', 'Select'), 'V')}
        {tool('rect', Square, t('scene.tools.rect', 'Rectangle'), 'R')}
        {tool('polygon', Hexagon, t('scene.tools.polygon', 'Polygon'), 'P')}
      </div>

      {state.drawing && (
        <div className="flex gap-1.5">
          <button
            type="button"
            className={cn(btn, on)}
            disabled={state.drawing.length < 3}
            onClick={() => dispatch({ type: 'DRAW_FINISH', id: nextId(), linkType })}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {t('editor.toolbar.finish', 'Finish')}
          </button>
          <button type="button" className={cn(btn, off)} onClick={() => dispatch({ type: 'DRAW_CANCEL' })}>
            <X className="h-4 w-4" aria-hidden="true" />
            {t('editor.toolbar.cancel', 'Cancel')}
          </button>
        </div>
      )}

      <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
      <button type="button" className={cn(btn, off)} onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo || preview} aria-label={t('editor.toolbar.undo', 'Undo')} title={`${t('editor.toolbar.undo', 'Undo')} (Ctrl+Z)`}>
        <Undo2 className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" className={cn(btn, off)} onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo || preview} aria-label={t('editor.toolbar.redo', 'Redo')} title={`${t('editor.toolbar.redo', 'Redo')} (Ctrl+Shift+Z)`}>
        <Redo2 className="h-4 w-4" aria-hidden="true" />
      </button>

      <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
      {toggle(state.snap.vertices, () => dispatch({ type: 'SET_SNAP', snap: { vertices: !state.snap.vertices } }), Magnet, t('editor.toolbar.snapVertices', 'Snap to vertices'), preview)}
      {toggle(state.snap.grid, () => dispatch({ type: 'SET_SNAP', snap: { grid: !state.snap.grid } }), Grid3x3, t('editor.toolbar.snapGrid', 'Snap to grid'), preview)}
      {toggle(showLabels, onToggleLabels, Tag, t('editor.toolbar.labels', 'Show labels'))}
      {toggle(allHidden, () => dispatch({ type: 'SET_ALL_HIDDEN', hidden: !allHidden }), EyeOff, t('editor.toolbar.hideAll', 'Hide all regions'), preview || state.hotspots.length === 0)}

      <button
        type="button"
        onClick={onTogglePreview}
        aria-pressed={preview}
        className={cn(btn, 'ml-auto', preview ? on : off)}
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
        {t('editor.toolbar.preview', 'Preview')}
      </button>
    </div>
  );
};
