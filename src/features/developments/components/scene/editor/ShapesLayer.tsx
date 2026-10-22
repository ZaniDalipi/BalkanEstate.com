import React, { useState } from 'react';
import type { Hotspot, UnitAvailability } from '../../../types';
import { AVAILABILITY_META, availabilityPatternId } from '../../../utils/availability';
import { polygonCentroid } from '../../../utils/polygonGeometry';
import { outlineOf } from '../../../hooks/usePolygonEditor';
import { ISSUE_STROKE, PRIMARY, toSvgPoints, type RegionPaint } from './canvasUtils';

interface ShapesLayerProps {
  hotspots: Hotspot[];
  aspect: number;
  /** SVG units per screen pixel. */
  pxUnit: number;
  hidden: ReadonlySet<string>;
  selectedId: string | null;
  issueIds: ReadonlySet<string>;
  paintOf: (h: Hotspot) => RegionPaint;
  /** Effective availability of a unit-linked region; drives the colour-blind pattern overlay. */
  stateOf?: (h: Hotspot) => UnitAvailability | undefined;
  labelOf: (h: Hotspot) => string;
  showLabels: boolean;
  /** Public look: no selection, issue or hidden styling; hover highlight only. */
  preview: boolean;
  /** Whether shapes take pointer input (select tool). */
  interactive: boolean;
  onShapePointerDown?: (e: React.PointerEvent<SVGElement>, id: string) => void;
}

/** The regions, bottom-to-top by z, with optional centred labels. */
export const ShapesLayer: React.FC<ShapesLayerProps> = ({
  hotspots,
  aspect,
  pxUnit,
  hidden,
  selectedId,
  issueIds,
  paintOf,
  stateOf,
  labelOf,
  showLabels,
  preview,
  interactive,
  onShapePointerDown,
}) => {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const ordered = [...hotspots].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  return (
    <g>
      {ordered.map((h) => {
        const outline = outlineOf(h);
        const isHidden = !preview && hidden.has(h.id);
        const isSelected = !preview && h.id === selectedId;
        const hasIssue = !preview && issueIds.has(h.id);
        const paint = paintOf(h);
        const strong = isSelected || h.id === hoverId;
        const state = stateOf?.(h);
        const pattern = state && AVAILABILITY_META[state].pattern !== 'solid' ? availabilityPatternId(state) : null;
        if (isHidden) {
          return (
            <polygon
              key={h.id}
              points={toSvgPoints(outline, aspect)}
              fill="none"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          );
        }
        return (
          <React.Fragment key={h.id}>
            <polygon
              data-hotspot-id={h.id}
              points={toSvgPoints(outline, aspect)}
              fill={strong ? paint.fillStrong : paint.fill}
              stroke={isSelected ? PRIMARY : hasIssue ? ISSUE_STROKE : 'rgba(255,255,255,0.9)'}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={hasIssue && !isSelected ? '5 3' : undefined}
              vectorEffect="non-scaling-stroke"
              className={interactive ? 'cursor-move' : preview ? 'cursor-pointer' : undefined}
              pointerEvents={interactive || preview ? 'auto' : 'none'}
              onPointerEnter={() => setHoverId(h.id)}
              onPointerLeave={() => setHoverId((cur) => (cur === h.id ? null : cur))}
              onPointerDown={(e) => interactive && onShapePointerDown?.(e, h.id)}
            />
            {pattern && (
              <polygon
                points={toSvgPoints(outline, aspect)}
                fill={`url(#${pattern})`}
                data-pattern-for={h.id}
                pointerEvents="none"
              />
            )}
          </React.Fragment>
        );
      })}

      {showLabels &&
        ordered
          .filter((h) => preview || !hidden.has(h.id))
          .map((h) => {
            const text = labelOf(h);
            if (!text) return null;
            const [cx, cy] = polygonCentroid(outlineOf(h) as [number, number][]);
            return (
              <text
                key={`l-${h.id}`}
                x={cx * aspect}
                y={cy}
                fontSize={12 * pxUnit}
                fontWeight={600}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#0f172a"
                stroke="rgba(255,255,255,0.92)"
                strokeWidth={3 * pxUnit}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {text}
              </text>
            );
          })}
    </g>
  );
};
