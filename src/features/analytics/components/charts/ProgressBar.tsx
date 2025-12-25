import React, { useState, useEffect } from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  animate?: boolean;
}

/**
 * Animated progress bar component
 * Displays a horizontal bar that fills based on value/max ratio
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  color = 'bg-primary',
  animate = true,
}) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const [width, setWidth] = useState(animate ? 0 : percentage);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setWidth(percentage), 100);
      return () => clearTimeout(timer);
    }
  }, [percentage, animate]);

  return (
    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

export default ProgressBar;
