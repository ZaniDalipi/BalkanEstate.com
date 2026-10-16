import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/src/lib/utils';
import type { Hotspot, HotspotShape } from '../../types';

export type Tool = 'select' | 'rect' | 'polygon';

interface HotspotCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  hotspots: Hotspot[];
  /** 'edit' enables drawing + selection; 'view' makes hotspots clickable links. */
  mode: 'edit' | 'view';
  tool?: Tool;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Called when the user finishes drawing a new shape (normalized points). */
  onCreate?: (shape: HotspotShape, points: number[][]) => void;
  /** view mode: clicking a hotspot. */
  onHotspotClick?: (h: Hotspot) => void;
  /** Fill colour for a hotspot (e.g. availability). Defaults applied otherwise. */
  colorOf?: (h: Hotspot) => string;
  className?: string;
}

/** Normalised [x,y] (0–1) of a pointer event within the element. */
const normFromEvent = (el: HTMLElement, clientX: number, clientY: number): [number, number] => {
  const r = el.getBoundingClientRect();
  const x = (clientX - r.left) / r.width;
  const y = (clientY - r.top) / r.height;
  return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
};

/** A rect's 2 stored corners expanded to its 4 polygon corners. */
const rectCorners = (p: number[][]): number[][] => {
  if (p.length < 2) return p;
  const [[x0, y0], [x1, y1]] = p;
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
};

const toPointsAttr = (pts: number[][], w: number, h: number): string =>
  pts.map(([x, y]) => `${x * w},${y * h}`).join(' ');

/**
 * Renders an image with an SVG hotspot overlay in pixel space (measured from
 * the element), so normalised 0–1 coordinates stay aligned at any size. In edit
 * mode it draws rectangles (drag) and polygons (click points, double-click or
 * Enter to close); in view mode hotspots are clickable links.
 */
export const HotspotCanvas: React.FC<HotspotCanvasProps> = ({
  imageUrl,
  imageWidth,
  imageHeight,
  hotspots,
  mode,
  tool = 'select',
  selectedId,
  onSelect,
  onCreate,
  onHotspotClick,
  colorOf,
  className,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // In-progress drawing state.
  const [rectStart, setRectStart] = useState<[number, number] | null>(null);
  const [rectEnd, setRectEnd] = useState<[number, number] | null>(null);
  const [polyPoints, setPolyPoints] = useState<number[][]>([]);
  const [cursor, setCursor] = useState<[number, number] | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const isEdit = mode === 'edit';

  const defaultFill = (hid: string) =>
    hid === selectedId ? 'rgba(59,130,246,0.45)' : 'rgba(59,130,246,0.22)';

  const pointer = (e: React.PointerEvent) =>
    boxRef.current ? normFromEvent(boxRef.current, e.clientX, e.clientY) : ([0, 0] as [number, number]);

  const finishRect = (start: [number, number], end: [number, number]) => {
    const dx = Math.abs(end[0] - start[0]);
    const dy = Math.abs(end[1] - start[1]);
    if (dx < 0.01 || dy < 0.01) return; // ignore tiny drags
    onCreate?.('rect', [
      [Math.min(start[0], end[0]), Math.min(start[1], end[1])],
      [Math.max(start[0], end[0]), Math.max(start[1], end[1])],
    ]);
  };

  const closePolygon = () => {
    if (polyPoints.length >= 3) onCreate?.('polygon', polyPoints);
    setPolyPoints([]);
    setCursor(null);
  };

  // --- Pointer handlers (edit) --------------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    if (!isEdit) return;
    if (tool === 'rect') {
      const p = pointer(e);
      setRectStart(p);
      setRectEnd(p);
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } else if (tool === 'polygon') {
      setPolyPoints((prev) => [...prev, pointer(e)]);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isEdit) return;
    if (tool === 'rect' && rectStart) setRectEnd(pointer(e));
    else if (tool === 'polygon' && polyPoints.length > 0) setCursor(pointer(e));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!isEdit || tool !== 'rect' || !rectStart) return;
    finishRect(rectStart, pointer(e));
    setRectStart(null);
    setRectEnd(null);
  };

  return (
    <div
      ref={boxRef}
      className={cn('relative w-full select-none overflow-hidden rounded-xl bg-muted', className)}
      style={{ aspectRatio: imageWidth && imageHeight ? `${imageWidth} / ${imageHeight}` : '16 / 10' }}
      tabIndex={isEdit ? 0 : undefined}
      onDoubleClick={() => isEdit && tool === 'polygon' && closePolygon()}
      onKeyDown={(e) => {
        if (!isEdit) return;
        if (e.key === 'Enter' && tool === 'polygon') closePolygon();
        if (e.key === 'Escape') {
          setPolyPoints([]);
          setCursor(null);
          setRectStart(null);
          setRectEnd(null);
        }
      }}
    >
      <img src={imageUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />

      <svg
        width={w}
        height={h}
        className={cn('absolute inset-0', isEdit && tool !== 'select' ? 'cursor-crosshair' : '')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {hotspots.map((hsp) => {
          const pts = hsp.shape === 'rect' ? rectCorners(hsp.points) : hsp.points;
          const fill = colorOf ? colorOf(hsp) : defaultFill(hsp.id);
          return (
            <polygon
              key={hsp.id}
              points={toPointsAttr(pts, w, h)}
              fill={fill}
              stroke={hsp.id === selectedId ? '#2563eb' : 'rgba(37,99,235,0.8)'}
              strokeWidth={hsp.id === selectedId ? 2.5 : 1.5}
              vectorEffect="non-scaling-stroke"
              className={cn(isEdit ? (tool === 'select' ? 'cursor-pointer' : '') : 'cursor-pointer')}
              onPointerDown={(e) => {
                if (isEdit && tool === 'select') {
                  e.stopPropagation();
                  onSelect?.(hsp.id);
                }
              }}
              onClick={() => {
                if (!isEdit) onHotspotClick?.(hsp);
              }}
            />
          );
        })}

        {/* In-progress rectangle preview */}
        {rectStart && rectEnd && (
          <polygon
            points={toPointsAttr(rectCorners([rectStart, rectEnd]), w, h)}
            fill="rgba(59,130,246,0.25)"
            stroke="#2563eb"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* In-progress polygon preview */}
        {polyPoints.length > 0 && (
          <>
            <polyline
              points={toPointsAttr(cursor ? [...polyPoints, cursor] : polyPoints, w, h)}
              fill="none"
              stroke="#2563eb"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
            {polyPoints.map(([x, y], i) => (
              <circle key={i} cx={x * w} cy={y * h} r={4} fill="#2563eb" />
            ))}
          </>
        )}
      </svg>
    </div>
  );
};
