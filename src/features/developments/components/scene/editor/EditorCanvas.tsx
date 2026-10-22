import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize, Minus, Plus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Hotspot, HotspotLinkType } from '../../../types';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import { useEditorViewport } from '../../../hooks/useEditorViewport';
import { ShapesLayer } from './ShapesLayer';
import { VertexHandles } from './VertexHandles';
import { DrawingLayer } from './DrawingLayer';
import { useCanvasPointer } from './useCanvasPointer';
import type { RegionPaint } from './canvasUtils';

interface EditorCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  editor: PolygonEditor;
  linkType: HotspotLinkType;
  paintOf: (h: Hotspot) => RegionPaint;
  labelOf: (h: Hotspot) => string;
  showLabels: boolean;
  preview: boolean;
}

const zoomBtn =
  'inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/95 text-slate-700 shadow hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 sm:h-9 sm:w-9';

/**
 * The editing surface: the scene image with an SVG overlay in image space
 * (viewBox 0..aspect × 0..1), zoomable and pannable. In preview mode it shows
 * the public look and takes no edits.
 */
export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  imageUrl,
  imageWidth,
  imageHeight,
  editor,
  linkType,
  paintOf,
  labelOf,
  showLabels,
  preview,
}) => {
  const { t } = useTranslation('developments');
  const aspect = imageWidth > 0 && imageHeight > 0 ? imageWidth / imageHeight : 16 / 10;
  const cancelRef = useRef<() => void>(() => {});
  const vp = useEditorViewport({ aspect, onPanStart: () => cancelRef.current() });
  const pointer = useCanvasPointer({ editor, renderedWidth: vp.renderedWidth, linkType, disabled: preview });
  cancelRef.current = pointer.cancel;

  const { state, dispatch, issues } = editor;
  const pxUnit = aspect / Math.max(1, vp.renderedWidth);
  const hidden = useMemo(() => new Set(state.hidden), [state.hidden]);
  const issueIds = useMemo(() => new Set(Object.keys(issues)), [issues]);
  const selected = !preview && state.tool === 'select' ? state.hotspots.find((h) => h.id === state.selectedId) : undefined;
  const coarse = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  const grid = !preview && state.snap.grid ? state.snap.gridStep : 0;

  return (
    <div
      ref={vp.frameRef}
      {...vp.frameHandlers}
      className={cn(
        'relative w-full touch-none select-none overflow-hidden rounded-xl bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        vp.spaceHeld || vp.isPanning ? 'cursor-grab' : ''
      )}
      style={{ aspectRatio: `${aspect}`, maxHeight: '72vh' }}
      role="application"
      tabIndex={0}
      aria-label={t('editor.canvas.label', 'Region editor canvas')}
    >
      <div style={vp.contentStyle}>
        <img src={imageUrl} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
        <svg
          ref={pointer.svgRef}
          viewBox={`0 0 ${aspect} 1`}
          preserveAspectRatio="none"
          className={cn('absolute inset-0 h-full w-full', !preview && state.tool !== 'select' && 'cursor-crosshair')}
          {...pointer.svgHandlers}
        >
          {grid > 0 && (
            <>
              <defs>
                <pattern id="be-editor-grid" width={grid * aspect} height={grid} patternUnits="userSpaceOnUse">
                  <path
                    d={`M ${grid * aspect} 0 L 0 0 0 ${grid}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                </pattern>
              </defs>
              <rect width={aspect} height={1} fill="url(#be-editor-grid)" pointerEvents="none" />
            </>
          )}
          <ShapesLayer
            hotspots={state.hotspots}
            aspect={aspect}
            pxUnit={pxUnit}
            hidden={hidden}
            selectedId={state.selectedId}
            issueIds={issueIds}
            paintOf={paintOf}
            labelOf={labelOf}
            showLabels={showLabels}
            preview={preview}
            interactive={!preview && state.tool === 'select'}
            onShapePointerDown={pointer.onShapePointerDown}
          />
          {selected && !hidden.has(selected.id) && (
            <VertexHandles
              hotspot={selected}
              aspect={aspect}
              pxUnit={pxUnit}
              selectedVertex={state.selectedVertex}
              coarse={coarse}
              onVertexPointerDown={(e, i) => pointer.onVertexPointerDown(e, selected.id, i)}
              onInsertVertex={(edge) => dispatch({ type: 'INSERT_VERTEX', id: selected.id, edge })}
            />
          )}
          {!preview && (
            <DrawingLayer
              aspect={aspect}
              pxUnit={pxUnit}
              drawing={state.drawing}
              cursor={pointer.cursor}
              rect={pointer.rect}
              canClose={pointer.canClose}
            />
          )}
        </svg>
      </div>

      <div className="absolute bottom-2 right-2 flex flex-col gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" className={zoomBtn} onClick={vp.zoomIn} disabled={!vp.canZoomIn} aria-label={t('editor.zoom.in', 'Zoom in')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" className={zoomBtn} onClick={vp.zoomOut} disabled={!vp.canZoomOut} aria-label={t('editor.zoom.out', 'Zoom out')}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" className={zoomBtn} onClick={vp.fit} aria-label={t('editor.zoom.fit', 'Fit to screen')}>
          <Maximize className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white">
        {Math.round(vp.zoom * 100)}%
      </span>
    </div>
  );
};
