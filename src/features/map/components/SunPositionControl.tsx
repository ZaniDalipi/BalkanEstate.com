// SunPositionControl Component
// Allows users to see building shadows at different times of day
// Great for real estate - helps buyers understand sunlight exposure

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface SunPositionControlProps {
  onDateTimeChange: (dateTime: Date) => void;
  isNightMode: boolean;
  enabled: boolean;
}

// Sun/Moon icons for different times
const SunriseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m3.343-5.657L5.636 5.636m12.728 0l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707" />
    <circle cx="12" cy="12" r="4" />
    <path strokeLinecap="round" d="M12 19v3M5 19l1.5 2M19 19l-1.5 2" />
  </svg>
);

const NoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const SunsetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m3.343-5.657L5.636 5.636m12.728 0l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707" />
    <path d="M12 16a4 4 0 100-8" />
    <path strokeLinecap="round" d="M3 19h18" />
  </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" d="M12 6v6l4 2" />
  </svg>
);

/**
 * SunPositionControl Component
 *
 * Real estate feature: See how shadows fall at different times
 * - Slider to adjust time of day
 * - Quick buttons for sunrise, noon, sunset
 * - Play animation to see shadow movement through the day
 * - Helps buyers understand sunlight exposure of properties
 */
const SunPositionControl: React.FC<SunPositionControlProps> = ({
  onDateTimeChange,
  isNightMode,
  enabled,
}) => {
  const { t } = useTranslation(['search']);
  const [hour, setHour] = useState(12); // 0-23
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Create date with current date but specified hour
  const createDateTime = useCallback((h: number) => {
    const date = new Date();
    date.setHours(h, 0, 0, 0);
    return date;
  }, []);

  // Update parent when hour changes
  useEffect(() => {
    if (enabled) {
      onDateTimeChange(createDateTime(hour));
    }
  }, [hour, enabled, onDateTimeChange, createDateTime]);

  // Animation: cycle through hours
  useEffect(() => {
    if (isPlaying && enabled) {
      animationRef.current = setInterval(() => {
        setHour((prev) => (prev + 1) % 24);
      }, 500); // Change hour every 500ms
    } else {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying, enabled]);

  // Quick time presets
  const setTime = (h: number) => {
    setIsPlaying(false);
    setHour(h);
  };

  // Format hour for display
  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:00 ${period}`;
  };

  // Get sun icon based on time
  const getSunIcon = () => {
    if (hour >= 5 && hour < 8) return <SunriseIcon className="w-4 h-4" />;
    if (hour >= 8 && hour < 17) return <NoonIcon className="w-4 h-4" />;
    if (hour >= 17 && hour < 20) return <SunsetIcon className="w-4 h-4" />;
    return <ClockIcon className="w-4 h-4" />; // Night
  };

  // Get background gradient based on time
  const getTimeGradient = () => {
    if (hour >= 5 && hour < 8) return 'from-orange-400 to-yellow-300'; // Sunrise
    if (hour >= 8 && hour < 17) return 'from-yellow-300 to-blue-400'; // Day
    if (hour >= 17 && hour < 20) return 'from-orange-500 to-purple-500'; // Sunset
    return 'from-indigo-900 to-slate-900'; // Night
  };

  if (!enabled) return null;

  return (
    <div className={`
      ${isNightMode ? 'bg-slate-900/95' : 'bg-white/95'}
      backdrop-blur-sm rounded-xl shadow-lg border
      ${isNightMode ? 'border-cyan-500/30' : 'border-neutral-200'}
      transition-all duration-300
      ${isExpanded ? 'p-4' : 'p-2'}
    `}>
      {/* Collapsed view - just show current time and toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 w-full
          ${isNightMode ? 'text-white' : 'text-neutral-800'}
        `}
      >
        <div className={`
          p-1.5 rounded-lg bg-gradient-to-br ${getTimeGradient()}
        `}>
          {getSunIcon()}
        </div>
        <span className="text-sm font-medium">
          {formatHour(hour)}
        </span>
        <svg
          className={`w-4 h-4 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded view - full controls */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Description */}
          <p className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-neutral-500'}`}>
            {t('search:map.sunPositionDesc', 'See how shadows fall at different times of day')}
          </p>

          {/* Time slider */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="23"
              value={hour}
              onChange={(e) => {
                setIsPlaying(false);
                setHour(parseInt(e.target.value));
              }}
              className={`
                w-full h-2 rounded-lg appearance-none cursor-pointer
                ${isNightMode
                  ? 'bg-slate-700 [&::-webkit-slider-thumb]:bg-cyan-400'
                  : 'bg-neutral-200 [&::-webkit-slider-thumb]:bg-primary'
                }
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-md
              `}
            />
            <div className={`flex justify-between text-xs ${isNightMode ? 'text-slate-500' : 'text-neutral-400'}`}>
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </div>

          {/* Quick time buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTime(6)}
              className={`
                flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium
                transition-all
                ${hour >= 5 && hour < 8
                  ? 'bg-gradient-to-r from-orange-400 to-yellow-300 text-white shadow-md'
                  : isNightMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }
              `}
              title={t('search:map.sunrise', 'Sunrise')}
            >
              <SunriseIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('search:map.sunrise', 'Sunrise')}</span>
            </button>

            <button
              onClick={() => setTime(12)}
              className={`
                flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium
                transition-all
                ${hour >= 11 && hour < 14
                  ? 'bg-gradient-to-r from-yellow-300 to-blue-400 text-white shadow-md'
                  : isNightMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }
              `}
              title={t('search:map.noon', 'Noon')}
            >
              <NoonIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('search:map.noon', 'Noon')}</span>
            </button>

            <button
              onClick={() => setTime(18)}
              className={`
                flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium
                transition-all
                ${hour >= 17 && hour < 20
                  ? 'bg-gradient-to-r from-orange-500 to-purple-500 text-white shadow-md'
                  : isNightMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }
              `}
              title={t('search:map.sunset', 'Sunset')}
            >
              <SunsetIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('search:map.sunset', 'Sunset')}</span>
            </button>
          </div>

          {/* Play/Pause animation button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`
              w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              transition-all
              ${isPlaying
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                : isNightMode
                  ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              }
            `}
          >
            {isPlaying ? (
              <>
                <PauseIcon className="w-4 h-4" />
                {t('search:map.pauseAnimation', 'Pause')}
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4" />
                {t('search:map.playAnimation', 'Animate Day Cycle')}
              </>
            )}
          </button>

          {/* Info text */}
          <p className={`text-[10px] text-center ${isNightMode ? 'text-slate-500' : 'text-neutral-400'}`}>
            {t('search:map.shadowInfo', 'Watch building shadows to understand sunlight exposure')}
          </p>
        </div>
      )}
    </div>
  );
};

export default SunPositionControl;
