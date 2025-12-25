import React, { useState, useEffect } from 'react';

interface MiniBarChartProps {
  data: number[];
  color?: string;
}

/**
 * Animated mini bar chart component
 * Displays a small bar chart with staggered animation
 */
const MiniBarChart: React.FC<MiniBarChartProps> = ({ data, color = 'bg-primary' }) => {
  const max = Math.max(...data, 1);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((value, i) => (
        <div
          key={i}
          className={`flex-1 ${color} rounded-t transition-all duration-500 ease-out`}
          style={{
            height: animated ? `${Math.max((value / max) * 100, 8)}%` : '0%',
            opacity: 0.4 + (i / data.length) * 0.6,
            transitionDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </div>
  );
};

export default MiniBarChart;
