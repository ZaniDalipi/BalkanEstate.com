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
  variant?: 'orb' | 'pill';
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

  // Size configurations
  const sizeConfig = {
    sm: {
      trackHeight: 40,
      trackPadding: 4,
      orbSize: 52,
      text: 'text-xs',
      iconSize: 'w-3.5 h-3.5',
      gap: 4,
      optionMinWidth: 70,
      orbIconSize: 'w-5 h-5',
    },
    md: {
      trackHeight: 48,
      trackPadding: 5,
      orbSize: 62,
      text: 'text-sm',
      iconSize: 'w-4 h-4',
      gap: 6,
      optionMinWidth: 85,
      orbIconSize: 'w-6 h-6',
    },
    lg: {
      trackHeight: 56,
      trackPadding: 6,
      orbSize: 72,
      text: 'text-base',
      iconSize: 'w-5 h-5',
      gap: 8,
      optionMinWidth: 100,
      orbIconSize: 'w-7 h-7',
    },
  };

  const config = sizeConfig[size];

  // Calculate dimensions
  const activeOption = options[activeIndex];
  const hasIcon = !!activeOption?.icon;

  // Calculate option widths based on content
  const optionWidths = options.map(opt => {
    const baseWidth = config.optionMinWidth;
    return opt.icon ? baseWidth + 16 : baseWidth;
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
        className="absolute left-0 right-0 flex items-center rounded-full backdrop-blur-xl"
        style={{
          height: config.trackHeight,
          top: '50%',
          transform: 'translateY(-50%)',
          background: `linear-gradient(180deg,
            rgba(255,255,255,0.85) 0%,
            rgba(245,247,250,0.9) 50%,
            rgba(235,238,245,0.95) 100%
          )`,
          boxShadow: `
            0 2px 16px rgba(0,0,0,0.1),
            0 8px 32px rgba(0,0,0,0.06),
            inset 0 1px 0 rgba(255,255,255,0.8),
            inset 0 -1px 2px rgba(0,0,0,0.05)
          `,
          border: '1px solid rgba(255,255,255,0.6)',
        }}
      >
        {/* Sliding Pill Highlight (for pill variant) */}
        {variant === 'pill' && (
          <div
            className="absolute rounded-full bg-white transition-all duration-300 ease-out"
            style={{
              height: config.trackHeight - config.trackPadding * 2,
              width: optionWidths[activeIndex],
              left: getPillLeft(),
              top: config.trackPadding,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
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
                  transition-all duration-300 ease-out active:scale-95
                  ${config.text}
                  ${variant === 'orb'
                    ? (isActive ? 'text-white opacity-0' : 'text-neutral-600 hover:text-neutral-800')
                    : (isActive ? 'text-gray-900' : 'text-neutral-500 hover:text-neutral-700')
                  }
                `}
                style={{
                  width: optionWidths[index],
                  gap: config.gap,
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
                <span className="whitespace-nowrap">{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Track inner highlight */}
        <div
          className="absolute inset-x-4 top-[1px] h-[1px] pointer-events-none rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
          }}
        />
      </div>

      {/* Sliding Glass Orb - only for orb variant */}
      {variant === 'orb' && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: config.orbSize,
            height: config.orbSize,
            top: 0,
            left: getOrbLeft(),
            zIndex: 10,
            transition: 'left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Glass orb outer glow */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(120,160,255,0.3) 0%, transparent 70%)',
              filter: 'blur(8px)',
              transform: 'scale(1.1)',
            }}
          />

          {/* Main glass orb body */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              background: `
                radial-gradient(ellipse 120% 80% at 25% 20%,
                  rgba(255,255,255,0.5) 0%,
                  rgba(200,220,255,0.15) 30%,
                  rgba(100,140,220,0.25) 60%,
                  rgba(60,100,180,0.4) 100%
                )
              `,
              boxShadow: `
                0 8px 32px rgba(60,100,180,0.4),
                0 16px 48px rgba(60,100,180,0.25),
                inset 0 -8px 24px rgba(60,100,180,0.3),
                inset 0 4px 8px rgba(255,255,255,0.4)
              `,
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* Primary curved glass reflection - top */}
            <div
              className="absolute"
              style={{
                top: '8%',
                left: '15%',
                width: '70%',
                height: '40%',
                background: `
                  radial-gradient(ellipse 100% 100% at 50% 0%,
                    rgba(255,255,255,0.7) 0%,
                    rgba(255,255,255,0.4) 30%,
                    rgba(255,255,255,0.1) 60%,
                    transparent 100%
                  )
                `,
                borderRadius: '50% 50% 45% 45%',
              }}
            />

            {/* Secondary reflection - side highlight */}
            <div
              className="absolute"
              style={{
                top: '20%',
                left: '5%',
                width: '25%',
                height: '35%',
                background: `
                  radial-gradient(ellipse at 30% 30%,
                    rgba(255,255,255,0.3) 0%,
                    transparent 70%
                  )
                `,
                borderRadius: '50%',
                transform: 'rotate(-20deg)',
              }}
            />

            {/* Bottom edge reflection */}
            <div
              className="absolute"
              style={{
                bottom: '12%',
                left: '25%',
                width: '50%',
                height: '15%',
                background: 'linear-gradient(0deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
                borderRadius: '40% 40% 50% 50%',
              }}
            />
          </div>

          {/* Glass rim / border */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'transparent',
              boxShadow: `
                inset 0 0 0 1.5px rgba(255,255,255,0.4),
                inset 0 0 0 3px rgba(255,255,255,0.1)
              `,
            }}
          />

          {/* Content inside orb - icon with glow */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            {hasIcon && (
              <span
                className={`${config.orbIconSize} text-white [&>svg]:w-full [&>svg]:h-full`}
                style={{
                  filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                }}
              >
                {activeOption.icon}
              </span>
            )}
            {/* Label inside orb */}
            <span
              className={`${config.text} font-semibold text-white ml-1.5 whitespace-nowrap`}
              style={{
                textShadow: '0 0 12px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {activeOption?.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidGlassSwitch;
