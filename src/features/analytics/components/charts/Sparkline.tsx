import React, { useId } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Tailwind text colour class — the line and fill use currentColor. */
  className?: string;
}

/**
 * Tiny area chart of a series, drawn in the current text colour.
 * Renders nothing for fewer than two points.
 */
const Sparkline: React.FC<SparklineProps> = ({ data, width = 96, height = 32, className = '' }) => {
  const gradientId = useId();
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const pad = 2;
  const stepX = (width - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => [pad + i * stepX, height - pad - (v / max) * (height - pad * 2)] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `M${pad},${height - pad} L${line.replace(/ /g, ' L')} L${width - pad},${height - pad} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill="currentColor" />
    </svg>
  );
};

export default Sparkline;
