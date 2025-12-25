import React, { useState, useEffect } from 'react';

interface TrafficChartProps {
  direct: number;
  search: number;
  social: number;
  email: number;
  other?: number;
}

interface TrafficSource {
  label: string;
  value: number;
  color: string;
}

/**
 * Animated traffic sources chart
 * Shows breakdown of views by traffic source
 */
const TrafficChart: React.FC<TrafficChartProps> = ({
  direct,
  search,
  social,
  email,
  other = 0,
}) => {
  const total = direct + search + social + email + other || 1;
  const [animated, setAnimated] = useState(false);

  const sources: TrafficSource[] = [
    { label: 'Direct', value: direct, color: 'bg-blue-500' },
    { label: 'Search', value: search, color: 'bg-green-500' },
    { label: 'Social', value: social, color: 'bg-pink-500' },
    { label: 'Email', value: email, color: 'bg-amber-500' },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`space-y-1.5 transform transition-all duration-500 ${
        animated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}
    >
      {sources.map((source, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500 w-12">{source.label}</span>
          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${source.color} rounded-full transition-all duration-700 ease-out`}
              style={{
                width: animated ? `${(source.value / total) * 100}%` : '0%',
                transitionDelay: `${i * 80}ms`,
              }}
            />
          </div>
          <span className="text-[10px] font-medium text-neutral-600 w-8 text-right">
            {Math.round((source.value / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
};

export default TrafficChart;
