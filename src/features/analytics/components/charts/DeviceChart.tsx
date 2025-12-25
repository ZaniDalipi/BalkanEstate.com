import React, { useState, useEffect } from 'react';
import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
} from '../../../../../constants';

interface DeviceChartProps {
  desktop: number;
  mobile: number;
  tablet: number;
}

interface DeviceSegment {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Animated device distribution chart
 * Shows breakdown of views by device type
 */
const DeviceChart: React.FC<DeviceChartProps> = ({ desktop, mobile, tablet }) => {
  const total = desktop + mobile + tablet || 1;
  const [animated, setAnimated] = useState(false);

  const segments: DeviceSegment[] = [
    { label: 'Desktop', value: desktop, color: 'bg-blue-500', icon: ComputerDesktopIcon },
    { label: 'Mobile', value: mobile, color: 'bg-green-500', icon: DevicePhoneMobileIcon },
    { label: 'Tablet', value: tablet, color: 'bg-purple-500', icon: GlobeAltIcon },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`space-y-2 transform transition-all duration-500 ${
        animated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}
    >
      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-neutral-100">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`${seg.color} transition-all duration-700 ease-out`}
            style={{
              width: animated ? `${(seg.value / total) * 100}%` : '0%',
              transitionDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-between text-[10px]">
        {segments.map((seg, i) => {
          const Icon = seg.icon;
          return (
            <div key={i} className="flex items-center gap-1 text-neutral-500">
              <Icon className="h-3 w-3" />
              <span>{Math.round((seg.value / total) * 100)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeviceChart;
