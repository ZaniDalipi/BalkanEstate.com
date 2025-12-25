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
  key: string;
  label: string;
  value: number;
  color: string;
  hoverColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Interactive device distribution chart
 * Shows breakdown of views by device type with hover effects
 */
const DeviceChart: React.FC<DeviceChartProps> = ({ desktop, mobile, tablet }) => {
  const total = desktop + mobile + tablet || 1;
  const [animated, setAnimated] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const segments: DeviceSegment[] = [
    {
      key: 'desktop',
      label: 'Desktop',
      value: desktop,
      color: 'bg-blue-500',
      hoverColor: 'bg-blue-600',
      icon: ComputerDesktopIcon,
    },
    {
      key: 'mobile',
      label: 'Mobile',
      value: mobile,
      color: 'bg-green-500',
      hoverColor: 'bg-green-600',
      icon: DevicePhoneMobileIcon,
    },
    {
      key: 'tablet',
      label: 'Tablet',
      value: tablet,
      color: 'bg-purple-500',
      hoverColor: 'bg-purple-600',
      icon: GlobeAltIcon,
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`space-y-3 transform transition-all duration-500 ${
        animated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}
    >
      {/* Stacked bar with hover interaction */}
      <div className="flex h-3 rounded-full overflow-hidden bg-neutral-100 relative">
        {segments.map((seg, i) => {
          const percentage = (seg.value / total) * 100;
          const isHovered = hoveredSegment === seg.key;

          return (
            <div
              key={seg.key}
              className={`${isHovered ? seg.hoverColor : seg.color} transition-all duration-300 ease-out cursor-pointer relative group`}
              style={{
                width: animated ? `${percentage}%` : '0%',
                transitionDelay: animated ? '0ms' : `${i * 100}ms`,
                transform: isHovered ? 'scaleY(1.3)' : 'scaleY(1)',
                zIndex: isHovered ? 10 : 1,
              }}
              onMouseEnter={() => setHoveredSegment(seg.key)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none">
                  <div className="bg-neutral-800 text-white text-xs px-2 py-1.5 rounded shadow-lg whitespace-nowrap">
                    <div className="font-medium">{seg.label}</div>
                    <div className="text-neutral-300">{seg.value.toLocaleString()} views</div>
                    <div className="text-neutral-400 text-[10px]">{Math.round(percentage)}% of total</div>
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

      {/* Interactive Legend */}
      <div className="grid grid-cols-3 gap-2">
        {segments.map((seg) => {
          const Icon = seg.icon;
          const percentage = Math.round((seg.value / total) * 100);
          const isHovered = hoveredSegment === seg.key;

          return (
            <div
              key={seg.key}
              className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                isHovered ? 'bg-neutral-100 scale-105' : 'hover:bg-neutral-50'
              }`}
              onMouseEnter={() => setHoveredSegment(seg.key)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className={`p-1.5 rounded-full ${seg.color} bg-opacity-20 mb-1`}>
                <Icon className={`h-3.5 w-3.5 ${seg.color.replace('bg-', 'text-')}`} />
              </div>
              <span className={`text-xs font-medium transition-colors ${
                isHovered ? 'text-neutral-900' : 'text-neutral-600'
              }`}>
                {percentage}%
              </span>
              <span className="text-[10px] text-neutral-400">{seg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeviceChart;
