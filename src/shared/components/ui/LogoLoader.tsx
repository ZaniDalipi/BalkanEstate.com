import React from 'react';

interface LogoLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const LogoLoader: React.FC<LogoLoaderProps> = ({ size = 'md', showText = true }) => {
  const sizeMap = {
    sm: 80,
    md: 120,
    lg: 160,
  };
  const px = sizeMap[size];

  return (
    <div className="flex flex-col items-center gap-3">
      <style>{`
        @keyframes be-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes be-building-left {
          0%, 100% { transform: translateY(0px) scaleY(1); }
          50% { transform: translateY(-8px) scaleY(1.03); }
        }
        @keyframes be-building-right {
          0%, 100% { transform: translateY(0px) scaleY(1); }
          50% { transform: translateY(-14px) scaleY(1.04); }
        }
        @keyframes be-glow {
          0%, 100% { filter: drop-shadow(0 4px 12px rgba(96,165,250,0.3)); }
          50% { filter: drop-shadow(0 8px 24px rgba(96,165,250,0.6)); }
        }
        @keyframes be-text-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .be-logo-wrap {
          animation: be-glow 1.8s ease-in-out infinite;
        }
        .be-building-left {
          transform-origin: bottom center;
          animation: be-building-left 1.8s ease-in-out infinite;
        }
        .be-building-right {
          transform-origin: bottom center;
          animation: be-building-right 1.8s ease-in-out infinite 0.15s;
        }
        .be-text-anim {
          animation: be-text-pulse 1.8s ease-in-out infinite;
        }
      `}</style>

      <div className="be-logo-wrap" style={{ width: px, height: px }}>
        <svg
          viewBox="0 0 200 200"
          width={px}
          height={px}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Left building gradient */}
            <linearGradient id="be-grad-left-face" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
            <linearGradient id="be-grad-left-side" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
            <linearGradient id="be-grad-left-top" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BFDBFE" />
              <stop offset="100%" stopColor="#93C5FD" />
            </linearGradient>

            {/* Right building gradient */}
            <linearGradient id="be-grad-right-face" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
            <linearGradient id="be-grad-right-side" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
            <linearGradient id="be-grad-right-top" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BFDBFE" />
              <stop offset="100%" stopColor="#93C5FD" />
            </linearGradient>
          </defs>

          {/* Left building (shorter) */}
          <g className="be-building-left">
            {/* Front face */}
            <rect x="48" y="95" width="62" height="82" rx="8" fill="url(#be-grad-left-face)" />
            {/* Right side face (3D depth) */}
            <polygon points="110,95 124,82 124,164 110,177" fill="url(#be-grad-left-side)" />
            {/* Top face */}
            <polygon points="48,95 62,82 124,82 110,95" fill="url(#be-grad-left-top)" />
            {/* Top rounding highlights */}
            <ellipse cx="79" cy="82" rx="31" ry="6" fill="#BFDBFE" opacity="0.5" />
          </g>

          {/* Right building (taller) */}
          <g className="be-building-right">
            {/* Front face */}
            <rect x="96" y="48" width="62" height="129" rx="8" fill="url(#be-grad-right-face)" />
            {/* Right side face (3D depth) */}
            <polygon points="158,48 172,35 172,164 158,177" fill="url(#be-grad-right-side)" />
            {/* Top face */}
            <polygon points="96,48 110,35 172,35 158,48" fill="url(#be-grad-right-top)" />
            {/* Top rounding highlights */}
            <ellipse cx="127" cy="35" rx="31" ry="6" fill="#BFDBFE" opacity="0.5" />
          </g>
        </svg>
      </div>

      {showText && (
        <span
          className="be-text-anim font-bold tracking-widest text-blue-400"
          style={{ fontSize: px * 0.12, letterSpacing: '0.15em' }}
        >
          BALKANESTATE
        </span>
      )}
    </div>
  );
};
