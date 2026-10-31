import React from 'react';

interface GridLayerProps {
  /** Grid step in normalised units (0 hides the grid). */
  step: number;
  aspect: number;
}

/** The snap grid, drawn in the editor's 0..aspect × 0..1 viewBox. */
export const GridLayer: React.FC<GridLayerProps> = ({ step, aspect }) => {
  if (step <= 0) return null;
  return (
    <>
      <defs>
        <pattern id="be-editor-grid" width={step * aspect} height={step} patternUnits="userSpaceOnUse">
          <path
            d={`M ${step * aspect} 0 L 0 0 0 ${step}`}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </pattern>
      </defs>
      <rect width={aspect} height={1} fill="url(#be-editor-grid)" pointerEvents="none" />
    </>
  );
};
