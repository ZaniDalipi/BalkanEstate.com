import React from 'react';
import type { Hotspot } from '../../../types';
import { outlineOf } from '../../../hooks/usePolygonEditor';
import { PRIMARY, edgeMidpoints } from './canvasUtils';

interface VertexHandlesProps {
  hotspot: Hotspot;
  aspect: number;
  pxUnit: number;
  selectedVertex: number | null;
  /** Coarse pointer (touch): larger hit targets. */
  coarse: boolean;
  onVertexPointerDown: (e: React.PointerEvent<SVGElement>, index: number) => void;
  onInsertVertex: (edge: number) => void;
}

/**
 * Drag handles for the selected region's vertices (4 corners for a rect), plus
 * a small handle at each edge midpoint: double-click it (or tap it on touch)
 * to insert a vertex there.
 */
export const VertexHandles: React.FC<VertexHandlesProps> = ({
  hotspot,
  aspect,
  pxUnit,
  selectedVertex,
  coarse,
  onVertexPointerDown,
  onInsertVertex,
}) => {
  const outline = outlineOf(hotspot);
  const r = (coarse ? 9 : 6) * pxUnit;
  const hit = (coarse ? 22 : 10) * pxUnit;

  return (
    <g>
      {edgeMidpoints(outline).map(([x, y], i) => (
        <g
          key={`m-${i}`}
          className="cursor-copy"
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onInsertVertex(i);
          }}
          onPointerUp={(e) => {
            if (e.pointerType === 'touch') onInsertVertex(i);
          }}
        >
          <circle cx={x * aspect} cy={y} r={hit} fill="transparent" />
          <circle
            cx={x * aspect}
            cy={y}
            r={r * 0.6}
            fill="rgba(255,255,255,0.85)"
            stroke={PRIMARY}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
      {outline.map(([x, y], i) => (
        <g key={`v-${i}`} className="cursor-grab" onPointerDown={(e) => onVertexPointerDown(e, i)}>
          <circle cx={x * aspect} cy={y} r={hit} fill="transparent" />
          <circle
            cx={x * aspect}
            cy={y}
            r={r}
            fill={i === selectedVertex ? PRIMARY : '#ffffff'}
            stroke={PRIMARY}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </g>
  );
};
