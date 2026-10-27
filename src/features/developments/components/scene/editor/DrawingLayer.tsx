import React from 'react';
import { rectToPolygon, type Point } from '../../../utils/polygonGeometry';
import { PRIMARY, toSvgPoints } from './canvasUtils';

interface DrawingLayerProps {
  aspect: number;
  pxUnit: number;
  /** Polygon vertices placed so far. */
  drawing: Point[] | null;
  /** Live cursor while drawing a polygon. */
  cursor: Point | null;
  /** In-progress rectangle corners. */
  rect: [Point, Point] | null;
  /** Whether the cursor is close enough to the first point to close the polygon. */
  canClose: boolean;
}

/** Preview of the shape being drawn: dashed outline, placed vertices, close target. */
export const DrawingLayer: React.FC<DrawingLayerProps> = ({ aspect, pxUnit, drawing, cursor, rect, canClose }) => (
  <g pointerEvents="none">
    {rect && (
      <polygon
        points={toSvgPoints(rectToPolygon(rect), aspect)}
        fill="rgba(2,82,205,0.2)"
        stroke={PRIMARY}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    )}
    {drawing && drawing.length > 0 && (
      <>
        <polyline
          points={toSvgPoints(cursor ? [...drawing, cursor] : drawing, aspect)}
          fill="rgba(2,82,205,0.12)"
          stroke={PRIMARY}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
        {drawing.map(([x, y], i) => (
          <circle
            key={i}
            cx={x * aspect}
            cy={y}
            r={(i === 0 && canClose ? 9 : 5) * pxUnit}
            fill={i === 0 ? '#ffffff' : PRIMARY}
            stroke={PRIMARY}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </>
    )}
  </g>
);
