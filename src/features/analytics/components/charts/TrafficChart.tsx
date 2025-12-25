import React, { useState, useEffect } from 'react';
import {
  GlobeAltIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
} from '../../../../../constants';

interface TrafficChartProps {
  direct: number;
  search: number;
  social: number;
  email: number;
  other?: number;
}

interface TrafficSource {
  key: string;
  label: string;
  value: number;
  color: string;
  hoverColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

/**
 * Interactive traffic sources chart
 * Shows breakdown of views by traffic source with hover effects
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
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);

  const sources: TrafficSource[] = [
    {
      key: 'direct',
      label: 'Direct',
      value: direct,
      color: 'bg-blue-500',
      hoverColor: 'bg-blue-600',
      icon: GlobeAltIcon,
      description: 'Direct URL visits',
    },
    {
      key: 'search',
      label: 'Search',
      value: search,
      color: 'bg-green-500',
      hoverColor: 'bg-green-600',
      icon: MagnifyingGlassIcon,
      description: 'Google, Bing, etc.',
    },
    {
      key: 'social',
      label: 'Social',
      value: social,
      color: 'bg-pink-500',
      hoverColor: 'bg-pink-600',
      icon: ChatBubbleLeftRightIcon,
      description: 'Facebook, Instagram, etc.',
    },
    {
      key: 'email',
      label: 'Email',
      value: email,
      color: 'bg-amber-500',
      hoverColor: 'bg-amber-600',
      icon: EnvelopeIcon,
      description: 'Newsletter, campaigns',
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Find the top source
  const topSource = sources.reduce((max, s) => (s.value > max.value ? s : max), sources[0]);

  return (
    <div
      className={`space-y-2 transform transition-all duration-500 ${
        animated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}
    >
      {sources.map((source, i) => {
        const Icon = source.icon;
        const percentage = Math.round((source.value / total) * 100);
        const isHovered = hoveredSource === source.key;
        const isTop = source.key === topSource.key && source.value > 0;

        return (
          <div
            key={source.key}
            className={`relative flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
              isHovered ? 'bg-neutral-100' : 'hover:bg-neutral-50'
            }`}
            onMouseEnter={() => setHoveredSource(source.key)}
            onMouseLeave={() => setHoveredSource(null)}
          >
            {/* Icon */}
            <div className={`p-1 rounded ${source.color} bg-opacity-20`}>
              <Icon className={`h-3 w-3 ${source.color.replace('bg-', 'text-')}`} />
            </div>

            {/* Label */}
            <span className={`text-xs w-12 transition-colors ${
              isHovered ? 'text-neutral-900 font-medium' : 'text-neutral-500'
            }`}>
              {source.label}
            </span>

            {/* Progress bar */}
            <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden relative">
              <div
                className={`h-full ${isHovered ? source.hoverColor : source.color} rounded-full transition-all duration-300 ease-out`}
                style={{
                  width: animated ? `${percentage}%` : '0%',
                  transitionDelay: animated ? '0ms' : `${i * 80}ms`,
                }}
              />

              {/* Animated pulse on hover */}
              {isHovered && percentage > 0 && (
                <div
                  className={`absolute top-0 h-full ${source.color} opacity-30 animate-pulse rounded-full`}
                  style={{ width: `${percentage}%` }}
                />
              )}
            </div>

            {/* Percentage + Badge */}
            <div className="flex items-center gap-1">
              <span className={`text-xs font-medium w-8 text-right transition-colors ${
                isHovered ? 'text-neutral-900' : 'text-neutral-600'
              }`}>
                {percentage}%
              </span>
              {isTop && (
                <span className="text-[8px] bg-yellow-100 text-yellow-700 px-1 rounded font-medium">
                  TOP
                </span>
              )}
            </div>

            {/* Tooltip on hover */}
            {isHovered && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <div className="bg-neutral-800 text-white text-xs px-2.5 py-1.5 rounded shadow-lg whitespace-nowrap">
                  <div className="font-medium">{source.value.toLocaleString()} views</div>
                  <div className="text-neutral-400 text-[10px]">{source.description}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Summary footer */}
      <div className="pt-2 mt-1 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400">
        <span>Total: {total.toLocaleString()} views</span>
        <span>Top: {topSource.label} ({Math.round((topSource.value / total) * 100)}%)</span>
      </div>
    </div>
  );
};

export default TrafficChart;
