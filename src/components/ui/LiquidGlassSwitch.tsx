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
  variant?: 'orb' | 'pill'; // 'orb' shows the blue ball, 'pill' just highlights active with white background
}

/**
 * LiquidGlassSwitch Component
 *
 * A beautiful toggle switch with liquid glass styling.
 * - variant='orb': Shows a circular glass orb indicator (default)
 * - variant='pill': Shows a clean pill highlight without the orb
 */
export const LiquidGlassSwitch: React.FC<LiquidGlassSwitchProps> = ({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
  variant = 'orb',
}) => {
  const activeIndex = options.findIndex((opt) => opt.value === value);

  // Size configurations with generous padding for multi-language support
  const sizeConfig = {
    sm: {
      trackHeight: 40,
      trackPadding: 6,
      orbSize: 48,
      text: 'text-xs',
      iconSize: 'w-3.5 h-3.5',
      gap: 6,
      optionMinWidth: 75,
      optionPaddingX: 16, // Horizontal padding per option
      orbIconSize: 'w-4 h-4',
    },
    md: {
      trackHeight: 48,
      trackPadding: 8,
      orbSize: 56,
      text: 'text-sm',
      iconSize: 'w-4 h-4',
      gap: 8,
      optionMinWidth: 90,
      optionPaddingX: 20, // Horizontal padding per option
      orbIconSize: 'w-5 h-5',
    },
    lg: {
      trackHeight: 56,
      trackPadding: 10,
      orbSize: 68,
      text: 'text-base',
      iconSize: 'w-5 h-5',
      gap: 10,
      optionMinWidth: 110,
      optionPaddingX: 24, // Horizontal padding per option
      orbIconSize: 'w-6 h-6',
    },
  };

  const config = sizeConfig[size];

  // Calculate dimensions
  const activeOption = options[activeIndex];
  const hasIcon = !!activeOption?.icon;

  // Calculate option widths based on content with generous padding for all languages
  // Use character count as rough estimate for text width + fixed padding
  const optionWidths = options.map(opt => {
    // Base width calculation: character count * approximate char width + padding
    const charWidth = size === 'sm' ? 7 : size === 'md' ? 8 : 9;
    const estimatedTextWidth = opt.label.length * charWidth;
    const iconWidth = opt.icon ? (size === 'sm' ? 18 : size === 'md' ? 22 : 26) : 0;
    const calculatedWidth = estimatedTextWidth + iconWidth + config.optionPaddingX * 2;

    // Use the larger of calculated width or minimum width
    return Math.max(calculatedWidth, config.optionMinWidth);
  });

  const trackWidth = optionWidths.reduce((a, b) => a + b, 0) + config.trackPadding * 2;

  // Calculate orb position (for orb variant)
  const getOrbLeft = () => {
    let left = config.trackPadding;
    for (let i = 0; i < activeIndex; i++) {
      left += optionWidths[i];
    }
    // Center the orb over the option
    const optionCenter = left + optionWidths[activeIndex] / 2;
    return optionCenter - config.orbSize / 2;
  };

  // Calculate pill position (for pill variant)
  const getPillLeft = () => {
    let left = config.trackPadding;
    for (let i = 0; i < activeIndex; i++) {
      left += optionWidths[i];
    }
    return left;
  };

  // For pill variant, use a simpler container height
  const containerHeight = variant === 'pill' ? config.trackHeight : config.orbSize;

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      style={{
        width: trackWidth,
        height: containerHeight,
      }}
    >
      {/* Track / Pill container */}
      <div
        className="absolute left-0 right-0 flex items-center rounded-full bg-gradient-to-b from-neutral-100/98 to-neutral-200/95 backdrop-blur-xl border border-white/40"
        style={{
          height: config.trackHeight,
          top: '50%',
          transform: 'translateY(-50%)',
          boxShadow: `
            0 2px 12px rgba(0,0,0,0.08),
            0 4px 20px rgba(0,0,0,0.04),
            inset 0 2px 6px rgba(0,0,0,0.06),
            inset 0 -2px 4px rgba(255,255,255,0.9)
          `,
        }}
      >
        {/* Sliding Pill Highlight (for pill variant) */}
        {variant === 'pill' && (
          <div
            className="absolute rounded-full bg-white shadow-md transition-all duration-300 ease-out"
            style={{
              height: config.trackHeight - config.trackPadding * 2,
              width: optionWidths[activeIndex],
              left: getPillLeft(),
              top: config.trackPadding,
            }}
          />
        )}

        {/* Option labels inside track */}
        <div
          className="flex items-center w-full relative z-10"
          style={{ padding: `0 ${config.trackPadding}px` }}
        >
          {options.map((option, index) => {
            const isActive = option.value === value;

            return (
              <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={`
                  relative z-20 flex items-center justify-center font-semibold
                  transition-all duration-300 ease-out
                  ${config.text}
                  ${variant === 'orb'
                    ? (isActive ? 'opacity-0' : 'text-neutral-500 hover:text-neutral-600')
                    : (isActive ? 'text-gray-900' : 'text-neutral-500 hover:text-neutral-700')
                  }
                `}
                style={{
                  width: optionWidths[index],
                  gap: config.gap,
                  paddingLeft: config.optionPaddingX / 2,
                  paddingRight: config.optionPaddingX / 2,
                }}
              >
                {option.icon && (
                  <span
                    className={`flex-shrink-0 ${config.iconSize} transition-all duration-300`}
                    style={{ color: 'inherit' }}
                  >
                    {option.icon}
                  </span>
                )}
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Track inner highlight */}
        <div className="absolute inset-x-3 top-[1px] h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none rounded-full" />
      </div>

      {/* Sliding Glass Orb - only for orb variant */}
      {variant === 'orb' && (
        <div
          className="absolute pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            width: config.orbSize,
            height: config.orbSize,
            top: 0,
            left: getOrbLeft(),
            zIndex: 10,
          }}
        >
          {/* Main orb body with 3D glass effect */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              background: `
                linear-gradient(145deg,
                  rgba(99,130,255,0.95) 0%,
                  rgba(59,130,246,0.98) 50%,
                  rgba(37,99,235,1) 100%
                )
              `,
              boxShadow: `
                0 6px 24px rgba(59,130,246,0.55),
                0 12px 40px rgba(59,130,246,0.35),
                0 2px 8px rgba(0,0,0,0.2),
                inset 0 2px 4px rgba(255,255,255,0.25),
                inset 0 -3px 6px rgba(0,0,0,0.15)
              `,
            }}
          >
            {/* Glass shine - top curved reflection */}
            <div
              className="absolute"
              style={{
                top: '6%',
                left: '12%',
                width: '76%',
                height: '45%',
                background: `
                  radial-gradient(ellipse 100% 100% at 50% 0%,
                    rgba(255,255,255,0.45) 0%,
                    rgba(255,255,255,0.15) 40%,
                    transparent 70%
                  )
                `,
                borderRadius: '50% 50% 40% 40%',
              }}
            />

            {/* Secondary reflection - bottom edge */}
            <div
              className="absolute"
              style={{
                bottom: '8%',
                left: '20%',
                width: '60%',
                height: '20%',
                background: 'linear-gradient(0deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
                borderRadius: '40% 40% 50% 50%',
              }}
            />
          </div>

          {/* Outer rim highlight */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: '1.5px solid rgba(255,255,255,0.25)',
              background: 'transparent',
            }}
          />

          {/* Content inside orb - icon with glow */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            {hasIcon && (
              <span
                className={`${config.orbIconSize} text-white [&>svg]:w-full [&>svg]:h-full`}
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                }}
              >
                {activeOption.icon}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidGlassSwitch;
