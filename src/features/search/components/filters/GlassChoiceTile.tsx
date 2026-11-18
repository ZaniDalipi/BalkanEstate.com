import React from 'react';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';

interface GlassChoiceTileProps {
  icon: SoftIconName;
  label: string;
  isOn: boolean;
  onClick: () => void;
}

/** A liquid-glass toggle tile: icon over label, a tick in the corner when on. */
const GlassChoiceTile: React.FC<GlassChoiceTileProps> = ({ icon, label, isOn, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={isOn}
    className={`glass-chip ${isOn ? 'glass-chip--on' : ''} relative min-w-0 min-h-[64px] rounded-2xl px-1.5 py-2 flex flex-col items-center justify-center gap-1 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2`}
  >
    <SoftIcon name={icon} className="w-6 h-6 flex-shrink-0" />
    <span className="text-[11px] leading-tight font-semibold text-center break-words max-w-full">{label}</span>
    {isOn && (
      <span aria-hidden="true" className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/90 text-primary flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 20 20" className="w-3 h-3" fill="currentColor">
          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
        </svg>
      </span>
    )}
  </button>
);

export default GlassChoiceTile;
