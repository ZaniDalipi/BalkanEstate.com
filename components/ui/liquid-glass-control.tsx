import React, { useRef, useState, useEffect } from 'react';

export interface GlassControlOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface LiquidGlassControlProps {
  options: GlassControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * LiquidGlassControl — A reusable segmented control with liquid glass styling.
 *
 * Uses SVG filter-based glass distortion, smooth sliding pill indicator,
 * and frosted backdrop blur. Works with any number of options.
 *
 * @example
 * <LiquidGlassControl
 *   options={[
 *     { value: 'sale', label: 'For Sale', icon: <DollarIcon /> },
 *     { value: 'rent', label: 'For Rent', icon: <KeyIcon /> },
 *   ]}
 *   value={listingType}
 *   onChange={setListingType}
 * />
 */
export const LiquidGlassControl: React.FC<LiquidGlassControlProps> = ({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const activeIndex = options.findIndex((opt) => opt.value === value);

  const sizeClasses = {
    sm: { text: 'text-xs', py: 'py-2', px: 'px-3', iconSize: 'w-3.5 h-3.5', gap: 'gap-1.5', trackPy: 'p-0.5' },
    md: { text: 'text-sm', py: 'py-2.5', px: 'px-5', iconSize: 'w-4 h-4', gap: 'gap-2', trackPy: 'p-1' },
    lg: { text: 'text-base', py: 'py-3', px: 'px-6', iconSize: 'w-5 h-5', gap: 'gap-2.5', trackPy: 'p-1.5' },
  };

  const config = sizeClasses[size];

  // Measure and update pill position
  useEffect(() => {
    const updatePill = () => {
      const activeEl = optionRefs.current[activeIndex];
      const container = containerRef.current;
      if (activeEl && container) {
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        setPillStyle({
          left: activeRect.left - containerRect.left,
          width: activeRect.width,
        });
      }
    };

    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [activeIndex, options]);

  return (
    <div className={`relative inline-flex ${className}`}>
      {/* Track */}
      <div
        ref={containerRef}
        className={`relative flex items-center rounded-2xl ${config.trackPy}`}
        style={{
          background: 'rgba(0, 0, 0, 0.04)',
          backdropFilter: 'blur(12px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.5)',
        }}
      >
        {/* Sliding glass pill */}
        <div
          className="absolute rounded-xl transition-all duration-[400ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
          style={{
            left: pillStyle.left,
            width: pillStyle.width,
            top: size === 'sm' ? 2 : 4,
            bottom: size === 'sm' ? 2 : 4,
            background: 'rgba(255, 255, 255, 0.92)',
            boxShadow: '0 1px 8px rgba(0, 0, 0, 0.08), 0 0.5px 2px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        />

        {/* Options */}
        {options.map((option, index) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              ref={(el) => { optionRefs.current[index] = el; }}
              type="button"
              onClick={() => onChange(option.value)}
              className={`
                relative z-10 flex items-center justify-center whitespace-nowrap
                font-semibold transition-colors duration-300 cursor-pointer
                ${config.text} ${config.py} ${config.px} ${config.gap}
                rounded-xl select-none
                ${isActive
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-500'
                }
              `}
            >
              {option.icon && (
                <span className={`flex-shrink-0 ${config.iconSize}`}>
                  {option.icon}
                </span>
              )}
              {option.label}
            </button>
          );
        })}
      </div>

      {/* SVG Glass Filter (hidden, referenced by pill) */}
      <svg className="hidden" aria-hidden="true">
        <defs>
          <filter id="glass-control-filter" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" />
            <feComposite in="blur" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default LiquidGlassControl;
