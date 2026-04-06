import React, { useState, useEffect } from 'react';

interface MiniBarChartProps {
  data: number[];
  color?: string;
  labels?: string[];
}

/**
 * Interactive mini bar chart component
 * Displays a small bar chart with hover tooltips and animations
 */
const MiniBarChart: React.FC<MiniBarChartProps> = ({
  data,
  color = 'bg-primary',
  labels
}) => {
  const max = Math.max(...data, 1);
  const [animated, setAnimated] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Generate day labels if not provided
  const dayLabels = labels || data.map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (data.length - 1 - i));
    return date.toLocaleDateString('en-GB', { weekday: 'short' });
  });

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-end gap-0.5 h-8 relative">
      {data.map((value, i) => (
        <div
          key={i}
          className="flex-1 relative group cursor-pointer"
          style={{ height: '100%' }}
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Bar */}
          <div
            className={`absolute bottom-0 left-0 right-0 ${color} rounded-t transition-all duration-300 ease-out ${
              hoveredIndex === i ? 'scale-x-110 brightness-110' : ''
            }`}
            style={{
              height: animated ? `${Math.max((value / max) * 100, 8)}%` : '0%',
              opacity: hoveredIndex === i ? 1 : 0.4 + (i / data.length) * 0.6,
              transitionDelay: animated ? '0ms' : `${i * 50}ms`,
            }}
          />

          {/* Tooltip */}
          {hoveredIndex === i && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none">
              <div className="bg-neutral-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap animate-fade-in">
                <div className="font-medium">{value} views</div>
                <div className="text-neutral-400 text-[10px]">{dayLabels[i]}</div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-neutral-800" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MiniBarChart;
