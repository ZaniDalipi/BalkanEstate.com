/**
 * Small map markers for the terrain tool: corners, downhill arrows, slope
 * range labels and the best-place-to-build pin. They sit in panes above the
 * slope picture (a ground overlay shares the overlay layer and would
 * otherwise cover them); none of them take taps, so taps keep reaching the map.
 */
import React from 'react';
import { OverlayView, OverlayViewF } from '@react-google-maps/api';
import { House } from 'lucide-react';
import type { BuildSpot, SlopeArrow, SlopeLabel, TerrainPoint } from '../types';

const CENTRED = { transform: 'translate(-50%, -50%)' } as const;
/** Above the slope picture, below info windows. */
const ABOVE_OVERLAY = OverlayView.OVERLAY_MOUSE_TARGET;
const SOFT_SHADOW = 'shadow-[0_1px_5px_rgba(0,0,0,0.4)]';
const GLASS_PILL = 'rounded-full bg-white/90 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.25)] text-gray-900 whitespace-nowrap';

/** A corner of the area: numbered while it is being drawn, a plain dot once the result is showing. */
export const CornerDot: React.FC<{ position: TerrainPoint; number: number; plain: boolean }> = ({ position, number, plain }) => (
  <OverlayViewF position={position} mapPaneName={ABOVE_OVERLAY}>
    {plain ? (
      <div className={`pointer-events-none h-2.5 w-2.5 rounded-full bg-white ${SOFT_SHADOW}`} style={CENTRED} />
    ) : (
      <div
        className={`pointer-events-none flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white text-[11px] font-semibold tabular-nums text-gray-900 ${SOFT_SHADOW}`}
        style={CENTRED}
      >
        {number}
      </div>
    )}
  </OverlayViewF>
);

const ARROW_PATH = 'M12 5 L12 19 M12 19 L7.5 14.2 M12 19 L16.5 14.2';

/** A slim white arrow pointing downhill, on a soft dark edge so it reads on any colour. */
export const SlopeArrowMarker: React.FC<{ arrow: SlopeArrow }> = ({ arrow }) => (
  <OverlayViewF position={arrow} mapPaneName={ABOVE_OVERLAY}>
    <div className="pointer-events-none" style={CENTRED}>
      {/* Drawn pointing south, then turned: bearing 180° is "down the screen". */}
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${arrow.bearing - 180}deg)` }}>
        <path d={ARROW_PATH} fill="none" stroke="#000000" strokeOpacity="0.3" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={ARROW_PATH} fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  </OverlayViewF>
);

export const SlopeLabelMarker: React.FC<{ label: SlopeLabel }> = ({ label }) => (
  <OverlayViewF position={label} mapPaneName={ABOVE_OVERLAY}>
    <span className={`pointer-events-none flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold tabular-nums ${GLASS_PILL}`} style={CENTRED}>
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
      {label.text}
    </span>
  </OverlayViewF>
);

/** "Best spot" on a fine stem, so the label stands above the house drawn at the spot rather than on it. */
export const BuildSpotMarker: React.FC<{ spot: BuildSpot; label: string }> = ({ spot, label }) => (
  <OverlayViewF position={spot} mapPaneName={OverlayView.FLOAT_PANE}>
    <div className="pointer-events-none flex flex-col items-center" style={{ transform: 'translate(-50%, -100%)' }}>
      <span className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold tracking-tight ${GLASS_PILL}`}>
        <House aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.4} />
        {label}
      </span>
      <span className="h-6 w-px bg-white shadow-[0_0_2px_rgba(0,0,0,0.6)]" />
      <span className={`-mt-0.5 h-2 w-2 rounded-full bg-white ${SOFT_SHADOW}`} />
    </div>
  </OverlayViewF>
);
