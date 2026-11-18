import React from 'react';

/** The iOS "xmark" glyph: two rounded strokes, no circle. Inherits the text colour. */
const XmarkIcon: React.FC<{ className?: string; strokeWidth?: number }> = ({ className = 'h-4 w-4', strokeWidth = 2.5 }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export default XmarkIcon;
