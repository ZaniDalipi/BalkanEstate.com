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
          background: 'rgba(0, 0, 0, 0.05)',
          backdropFilter: 'blur(16px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.8)',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 0 rgba(255, 255, 255, 0.5)',
        }}
      >
        {/* Sliding liquid glass pill */}
        <div
          className="absolute rounded-xl transition-all duration-700 overflow-hidden"
          style={{
            left: pillStyle.left,
            width: pillStyle.width,
            top: size === 'sm' ? 2 : 4,
            bottom: size === 'sm' ? 2 : 4,
            background: 'rgba(255, 255, 255, 0.6)',
            boxShadow: '0 6px 6px rgba(0, 0, 0, 0.08), 0 0 20px rgba(0, 0, 0, 0.04)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 2.2)',
          }}
        >
          {/* Glass distortion layer */}
          <div
            className="absolute inset-0 z-0 overflow-hidden rounded-xl"
            style={{
              backdropFilter: 'blur(3px)',
              filter: 'url(#liquid-glass-distortion)',
              isolation: 'isolate',
            }}
          />
          {/* Frosted overlay */}
          <div
            className="absolute inset-0 z-[1] rounded-xl"
            style={{ background: 'rgba(255, 255, 255, 0.25)' }}
          />
          {/* Inset specular highlight */}
          <div
            className="absolute inset-0 z-[2] rounded-xl"
            style={{
              boxShadow:
                'inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5)',
            }}
          />
        </div>

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

      {/* Glass distortion filter is provided globally by LiquidGlassFilter in App.tsx */}
    </div>
  );
};

export default LiquidGlassControl;
