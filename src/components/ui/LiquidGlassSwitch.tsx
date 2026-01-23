// LiquidGlassSwitch Component
// Beautiful liquid glass style toggle switch inspired by Dribbble design
// https://dribbble.com/shots/26295473-Liquid-Glass-Switch

import React from 'react';

interface SwitchOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface LiquidGlassSwitchProps {
  options: SwitchOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * LiquidGlassSwitch Component
 *
 * A beautiful toggle switch with liquid glass styling.
 *
 * Features:
 * - Frosted glass container effect
 * - Smooth sliding pill indicator
 * - Subtle shadows and highlights
 * - Responsive sizing
 *
 * Usage:
 * ```tsx
 * <LiquidGlassSwitch
 *   options={[
 *     { value: 'photos', label: 'Photos' },
 *     { value: 'street', label: 'Street', icon: <StreetIcon /> },
 *   ]}
 *   value={viewMode}
 *   onChange={setViewMode}
 * />
 * ```
 */
export const LiquidGlassSwitch: React.FC<LiquidGlassSwitchProps> = ({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}) => {
  const activeIndex = options.findIndex((opt) => opt.value === value);

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'p-1 gap-0.5',
      button: 'px-3 py-1.5 text-xs',
      iconSize: 'w-3 h-3',
    },
    md: {
      container: 'p-1.5 gap-1',
      button: 'px-4 py-2 text-sm',
      iconSize: 'w-4 h-4',
    },
    lg: {
      container: 'p-2 gap-1',
      button: 'px-5 py-2.5 text-base',
      iconSize: 'w-5 h-5',
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={`
        relative inline-flex items-center rounded-full
        bg-gradient-to-b from-white/95 to-neutral-100/95
        backdrop-blur-xl
        shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)]
        border border-white/60
        ${config.container}
        ${className}
      `}
      style={{
        // Extra glass effect with subtle inner glow
        boxShadow: `
          0 2px 8px rgba(0,0,0,0.08),
          0 8px 24px rgba(0,0,0,0.06),
          inset 0 1px 1px rgba(255,255,255,0.9),
          inset 0 -1px 1px rgba(0,0,0,0.03)
        `,
      }}
    >
      {/* Sliding indicator pill */}
      <div
        className="absolute top-1.5 bottom-1.5 rounded-full bg-primary transition-all duration-300 ease-out"
        style={{
          width: `calc(${100 / options.length}% - 6px)`,
          left: `calc(${(activeIndex / options.length) * 100}% + 3px)`,
          boxShadow: `
            0 4px 12px rgba(59, 130, 246, 0.4),
            0 2px 4px rgba(59, 130, 246, 0.2),
            inset 0 1px 1px rgba(255,255,255,0.2)
          `,
        }}
      />

      {/* Glass highlight overlay on indicator */}
      <div
        className="absolute top-1.5 rounded-full pointer-events-none transition-all duration-300 ease-out overflow-hidden"
        style={{
          width: `calc(${100 / options.length}% - 6px)`,
          left: `calc(${(activeIndex / options.length) * 100}% + 3px)`,
          height: '50%',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
      </div>

      {/* Option buttons */}
      {options.map((option, index) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              relative z-10 flex items-center justify-center gap-1.5 rounded-full font-semibold
              transition-colors duration-200
              ${config.button}
              ${isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-700'}
            `}
          >
            {option.icon && (
              <span className={`flex-shrink-0 ${config.iconSize} [&>svg]:w-full [&>svg]:h-full`}>
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}

      {/* Subtle top highlight for glass effect */}
      <div className="absolute inset-x-0 top-0 h-[1px] rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
    </div>
  );
};

export default LiquidGlassSwitch;
