import React from 'react';

interface HourlyHeatmapProps {
  data: number[];
}

/**
 * Hourly Activity Heatmap
 * Shows view distribution across 24 hours
 */
export const HourlyHeatmap: React.FC<HourlyHeatmapProps> = ({ data }) => {
  const maxViews = Math.max(...data, 1);

  // Get intensity class based on view count
  const getIntensityClass = (count: number): string => {
    if (count === 0) return 'bg-neutral-100';
    const intensity = count / maxViews;
    if (intensity < 0.2) return 'bg-primary/20';
    if (intensity < 0.4) return 'bg-primary/40';
    if (intensity < 0.6) return 'bg-primary/60';
    if (intensity < 0.8) return 'bg-primary/80';
    return 'bg-primary';
  };

  // Format hour for display
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    if (hour < 12) return `${hour}am`;
    return `${hour - 12}pm`;
  };

  // Find peak hours
  const peakHour = data.indexOf(Math.max(...data));
  const totalViews = data.reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-3">
      {/* Heatmap grid */}
      <div className="grid grid-cols-12 gap-1">
        {data.map((count, hour) => (
          <div
            key={hour}
            className={`
              relative h-8 rounded transition-all duration-300
              ${getIntensityClass(count)}
              ${hour === peakHour && count > 0 ? 'ring-2 ring-primary ring-offset-1' : ''}
              hover:scale-110 cursor-pointer group
            `}
            title={`${formatHour(hour)}: ${count} views`}
          >
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {formatHour(hour)}: {count} views
            </div>
          </div>
        ))}
      </div>

      {/* Hour labels */}
      <div className="grid grid-cols-12 gap-1">
        {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((hour) => (
          <div key={hour} className="text-[10px] text-neutral-400 text-center">
            {formatHour(hour)}
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
        <span>
          Peak: <span className="font-medium text-neutral-700">{formatHour(peakHour)}</span>
        </span>
        <span>
          Total: <span className="font-medium text-neutral-700">{totalViews} views</span>
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-400">
        <span>Less</span>
        <div className="w-3 h-3 rounded bg-neutral-100" />
        <div className="w-3 h-3 rounded bg-primary/20" />
        <div className="w-3 h-3 rounded bg-primary/40" />
        <div className="w-3 h-3 rounded bg-primary/60" />
        <div className="w-3 h-3 rounded bg-primary/80" />
        <div className="w-3 h-3 rounded bg-primary" />
        <span>More</span>
      </div>
    </div>
  );
};
