/**
 * Small map markers for the terrain tool: numbered corners, downhill arrows,
 * slope range labels and the best-place-to-build pin. None of them take taps, so taps keep
 * reaching the map.
 */
import React from 'react';
import { OverlayView, OverlayViewF } from '@react-google-maps/api';
import { SoftIcon } from '@/src/shared/illustrations';
import type { BuildSpot, SlopeArrow, SlopeLabel, TerrainPoint } from '../types';

const CENTRED = { transform: 'translate(-50%, -50%)' } as const;

export const CornerDot: React.FC<{ position: TerrainPoint; number: number }> = ({ position, number }) => (
  <OverlayViewF position={position} mapPaneName={OverlayView.OVERLAY_LAYER}>
    <div
      className="pointer-events-none flex items-center justify-center w-6 h-6 rounded-full bg-white border-[3px] border-emerald-500 text-[10px] font-bold text-emerald-700 shadow"
      style={CENTRED}
    >
      {number}
    </div>
  </OverlayViewF>
);

const ARROW_PATH = 'M12 3 L12 20 M12 3 L6.5 9 M12 3 L17.5 9';

export const SlopeArrowMarker: React.FC<{ arrow: SlopeArrow }> = ({ arrow }) => (
  <OverlayViewF position={arrow} mapPaneName={OverlayView.OVERLAY_LAYER}>
    <div className="pointer-events-none" style={CENTRED}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{ transform: `rotate(${arrow.bearing}deg)` }}
      >
        {/* Points up (north) before rotating to the downhill bearing; the white halo keeps it readable on any shade. */}
        <path d={ARROW_PATH} fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={ARROW_PATH} fill="none" stroke="#1e1b4b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  </OverlayViewF>
);

export const SlopeLabelMarker: React.FC<{ label: SlopeLabel }> = ({ label }) => (
  <OverlayViewF position={label} mapPaneName={OverlayView.OVERLAY_LAYER}>
    <span
      className="pointer-events-none flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/90 shadow text-[11px] font-bold text-gray-900 tabular-nums whitespace-nowrap"
      style={CENTRED}
    >
      <span aria-hidden="true" className="w-2 h-2 rounded-sm" style={{ backgroundColor: label.color }} />
      {label.text}
    </span>
  </OverlayViewF>
);

export const BuildSpotMarker: React.FC<{ spot: BuildSpot; label: string }> = ({ spot, label }) => (
  <OverlayViewF position={spot} mapPaneName={OverlayView.OVERLAY_LAYER}>
    <div className="pointer-events-none flex flex-col items-center" style={{ transform: 'translate(-50%, -100%)' }}>
      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-white shadow-lg border border-emerald-200 text-[11px] font-bold text-emerald-800 whitespace-nowrap">
        <SoftIcon name="home" className="w-4 h-4" />
        {label}
      </span>
      <span className="w-2.5 h-2.5 -mt-0.5 rotate-45 bg-white border-r border-b border-emerald-200" />
    </div>
  </OverlayViewF>
);
