import React, { useState, useEffect } from 'react';

interface HourlyHeatmapProps {
  data: number[];
}

/**
 * Interactive Hourly Activity Heatmap
 * Shows view distribution across 24 hours with hover effects and animations
 */
export const HourlyHeatmap: React.FC<HourlyHeatmapProps> = ({ data }) => {
  const [animated, setAnimated] = useState(false);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const maxViews = Math.max(...data, 1);
  const totalViews = data.reduce((sum, v) => sum + v, 0);
  const peakHour = data.indexOf(Math.max(...data));

  // Find quiet hours (lowest activity)
  const minViews = Math.min(...data.filter(v => v > 0));
  const quietHours = data.map((v, i) => v === minViews ? i : -1).filter(i => i !== -1);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Get intensity level (0-5) based on view count
  const getIntensityLevel = (count: number): number => {
    if (count === 0) return 0;
    const intensity = count / maxViews;
    if (intensity < 0.2) return 1;
    if (intensity < 0.4) return 2;
    if (intensity < 0.6) return 3;
    if (intensity < 0.8) return 4;
    return 5;
  };

  // Get color class based on intensity level
  const getColorClass = (level: number, isHovered: boolean): string => {
    const colors = [
      'bg-neutral-100',
      'bg-primary/20',
      'bg-primary/40',
      'bg-primary/60',
      'bg-primary/80',
      'bg-primary',
    ];
    const hoverColors = [
      'bg-neutral-200',
      'bg-primary/30',
      'bg-primary/50',
      'bg-primary/70',
      'bg-primary/90',
      'bg-primary',
    ];
    return isHovered ? hoverColors[level] : colors[level];
  };

  // Format hour for display
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    if (hour < 12) return `${hour}am`;
    return `${hour - 12}pm`;
  };

  // Get time period label
  const getTimePeriod = (hour: number): string => {
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night';
  };

  // Calculate period totals
  const periodTotals = {
    morning: data.slice(5, 12).reduce((s, v) => s + v, 0),
    afternoon: data.slice(12, 17).reduce((s, v) => s + v, 0),
    evening: data.slice(17, 21).reduce((s, v) => s + v, 0),
    night: [...data.slice(21), ...data.slice(0, 5)].reduce((s, v) => s + v, 0),
  };

  return (
    <div className={`space-y-3 transition-all duration-500 ${animated ? 'opacity-100' : 'opacity-0'}`}>
      {/* Heatmap grid */}
      <div className="grid grid-cols-12 gap-1">
        {data.map((count, hour) => {
          const level = getIntensityLevel(count);
          const isHovered = hoveredHour === hour;
          const isSelected = selectedHour === hour;
          const isPeak = hour === peakHour && count > 0;

          return (
            <div
              key={hour}
              className={`
                relative h-8 rounded cursor-pointer
                transition-all duration-200 ease-out
                ${getColorClass(level, isHovered || isSelected)}
                ${isPeak ? 'ring-2 ring-primary ring-offset-1' : ''}
                ${isHovered ? 'scale-110 z-10 shadow-md' : ''}
                ${isSelected ? 'scale-105 z-10 ring-2 ring-primary' : ''}
              `}
              style={{
                transitionDelay: animated ? '0ms' : `${hour * 20}ms`,
                transform: animated ? undefined : 'scaleY(0)',
              }}
              onMouseEnter={() => setHoveredHour(hour)}
              onMouseLeave={() => setHoveredHour(null)}
              onClick={() => setSelectedHour(selectedHour === hour ? null : hour)}
            >
              {/* Peak indicator */}
              {isPeak && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-white shadow-sm" />
              )}

              {/* Tooltip on hover */}
              {(isHovered || isSelected) && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none">
                  <div className="bg-neutral-800 text-white text-xs px-2.5 py-1.5 rounded shadow-lg whitespace-nowrap">
                    <div className="font-medium">{formatHour(hour)}</div>
                    <div className="text-neutral-300">{count} views</div>
                    <div className="text-neutral-400 text-[10px]">{getTimePeriod(hour)}</div>
                    {isPeak && <div className="text-yellow-400 text-[10px] font-medium">Peak Hour</div>}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-neutral-800" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hour labels */}
      <div className="grid grid-cols-12 gap-1">
        {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((hour) => (
          <div
            key={hour}
            className={`text-[10px] text-center transition-colors ${
              hoveredHour === hour || hoveredHour === hour + 1
                ? 'text-neutral-700 font-medium'
                : 'text-neutral-400'
            }`}
          >
            {formatHour(hour)}
          </div>
        ))}
      </div>

      {/* Time period breakdown */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-100">
        {[
          { label: 'Morning', value: periodTotals.morning, hours: '5am-12pm', color: 'bg-amber-100 text-amber-700' },
          { label: 'Afternoon', value: periodTotals.afternoon, hours: '12pm-5pm', color: 'bg-blue-100 text-blue-700' },
          { label: 'Evening', value: periodTotals.evening, hours: '5pm-9pm', color: 'bg-purple-100 text-purple-700' },
          { label: 'Night', value: periodTotals.night, hours: '9pm-5am', color: 'bg-indigo-100 text-indigo-700' },
        ].map((period) => {
          const percentage = totalViews > 0 ? Math.round((period.value / totalViews) * 100) : 0;
          const isMax = period.value === Math.max(periodTotals.morning, periodTotals.afternoon, periodTotals.evening, periodTotals.night);

          return (
            <div
              key={period.label}
              className={`text-center p-1.5 rounded-lg transition-all cursor-default ${
                isMax ? period.color : 'hover:bg-neutral-50'
              }`}
            >
              <div className={`text-[10px] ${isMax ? '' : 'text-neutral-500'}`}>{period.label}</div>
              <div className={`text-sm font-bold ${isMax ? '' : 'text-neutral-700'}`}>{percentage}%</div>
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
            Peak: <span className="font-medium text-neutral-700">{formatHour(peakHour)}</span>
          </span>
        </div>
        <span>
          Total: <span className="font-medium text-neutral-700">{totalViews.toLocaleString()} views</span>
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-400">
        <span>Less</span>
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`w-4 h-4 rounded ${getColorClass(level, false)} transition-transform hover:scale-110 cursor-pointer`}
            title={level === 0 ? 'No views' : `${level * 20}%+ of peak`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};
