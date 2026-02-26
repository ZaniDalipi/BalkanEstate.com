// ShadowTimelapseControl Component
// Beautiful UI for controlling shadow time-lapse animation

import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useShadowTimelapse,
  type TimelapseSpeed,
  type TimePeriod,
  SPEED_LABELS,
  formatTime,
} from '../hooks/useShadowTimelapse';

interface ShadowTimelapseControlProps {
  /** Location latitude for accurate sun calculations */
  latitude?: number;
  /** Callback when time changes - provides hour for shadow rendering */
  onTimeChange?: (hour: number) => void;
  /** Whether the control is visible/enabled */
  enabled?: boolean;
  /** Night mode styling */
  isNightMode?: boolean;
  /** Compact mode for mobile */
  compact?: boolean;
}

/**
 * Time period color gradients
 */
const PERIOD_GRADIENTS: Record<TimePeriod, string> = {
  night: 'from-indigo-900 to-slate-900',
  dawn: 'from-orange-400 to-pink-400',
  morning: 'from-yellow-300 to-blue-300',
  noon: 'from-yellow-300 to-sky-400',
  afternoon: 'from-amber-300 to-orange-300',
  sunset: 'from-orange-500 to-purple-500',
  dusk: 'from-purple-500 to-indigo-700',
};

/**
 * Time period icons
 */
const PERIOD_ICONS: Record<TimePeriod, string> = {
  night: '🌙',
  dawn: '🌅',
  morning: '🌤️',
  noon: '☀️',
  afternoon: '🌤️',
  sunset: '🌇',
  dusk: '🌆',
};

/**
 * Speed selector component
 */
const SpeedSelector: React.FC<{
  speed: TimelapseSpeed;
  onSpeedChange: (speed: TimelapseSpeed) => void;
  isNightMode: boolean;
}> = ({ speed, onSpeedChange, isNightMode }) => {
  const speeds: TimelapseSpeed[] = ['slow', 'normal', 'fast', 'ultra'];

  return (
    <div className="flex items-center gap-1">
      {speeds.map((s) => (
        <button
          key={s}
          onClick={() => onSpeedChange(s)}
          className={`
            px-2 py-1 text-[10px] font-medium rounded-md transition-all
            ${speed === s
              ? isNightMode
                ? 'bg-cyan-500 text-white'
                : 'bg-primary text-white'
              : isNightMode
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }
          `}
        >
          {SPEED_LABELS[s]}
        </button>
      ))}
    </div>
  );
};

/**
 * Timeline scrubber component
 */
const TimelineScrubber: React.FC<{
  progress: number;
  sunInfo: { sunrise: number; sunset: number };
  startHour: number;
  endHour: number;
  onSeek: (progress: number) => void;
  isNightMode: boolean;
  timePeriod: TimePeriod;
}> = ({ progress, sunInfo, startHour, endHour, onSeek, isNightMode, timePeriod }) => {
  const range = endHour - startHour;

  // Calculate marker positions
  const sunrisePosition = ((sunInfo.sunrise - startHour) / range) * 100;
  const noonPosition = ((12 - startHour) / range) * 100;
  const sunsetPosition = ((sunInfo.sunset - startHour) / range) * 100;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, percent)));
  };

  return (
    <div className="space-y-1">
      {/* Timeline track */}
      <div
        className={`
          relative h-3 rounded-full cursor-pointer overflow-hidden
          ${isNightMode ? 'bg-slate-700' : 'bg-neutral-200'}
        `}
        onClick={handleClick}
      >
        {/* Day/night gradient background */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(to right,
              #1e293b 0%,
              #1e293b ${sunrisePosition - 5}%,
              #f97316 ${sunrisePosition}%,
              #fbbf24 ${sunrisePosition + 10}%,
              #60a5fa ${noonPosition - 10}%,
              #facc15 ${noonPosition}%,
              #60a5fa ${noonPosition + 10}%,
              #fbbf24 ${sunsetPosition - 10}%,
              #f97316 ${sunsetPosition}%,
              #1e293b ${sunsetPosition + 5}%,
              #1e293b 100%
            )`,
          }}
        />

        {/* Progress fill */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${PERIOD_GRADIENTS[timePeriod]} transition-all duration-100`}
          style={{ width: `${progress}%` }}
        />

        {/* Playhead */}
        <div
          className={`
            absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-md
            border-2 border-white transition-all duration-100
            ${isNightMode ? 'bg-cyan-400' : 'bg-primary'}
          `}
          style={{ left: `calc(${progress}% - 8px)` }}
        />

        {/* Time markers */}
        <div
          className="absolute top-0 w-0.5 h-full bg-orange-400/60"
          style={{ left: `${sunrisePosition}%` }}
          title={`${t('property:map3d.sunrise', 'Sunrise')} ${formatTime(sunInfo.sunrise)}`}
        />
        <div
          className="absolute top-0 w-0.5 h-full bg-yellow-400/60"
          style={{ left: `${noonPosition}%` }}
          title={t('property:map3d.noon', 'Noon')}
        />
        <div
          className="absolute top-0 w-0.5 h-full bg-purple-400/60"
          style={{ left: `${sunsetPosition}%` }}
          title={`${t('property:map3d.sunset', 'Sunset')} ${formatTime(sunInfo.sunset)}`}
        />
      </div>

      {/* Time labels */}
      <div className={`flex justify-between text-[9px] ${isNightMode ? 'text-slate-500' : 'text-neutral-400'}`}>
        <span>{formatTime(startHour)}</span>
        <span className="text-orange-400">🌅</span>
        <span className="text-yellow-400">☀️</span>
        <span className="text-purple-400">🌇</span>
        <span>{formatTime(endHour)}</span>
      </div>
    </div>
  );
};

/**
 * ShadowTimelapseControl Component
 *
 * Provides a beautiful UI for controlling shadow time-lapse animation.
 * Features:
 * - Play/pause with smooth animation
 * - Timeline scrubber with sun position markers
 * - Speed control (0.5x to 4x)
 * - Quick jump to sunrise/noon/sunset
 * - Current time and period display
 *
 * @example
 * ```tsx
 * <ShadowTimelapseControl
 *   latitude={41.99}
 *   onTimeChange={(hour) => updateMapShadows(hour)}
 *   enabled={true}
 * />
 * ```
 */
const ShadowTimelapseControl: React.FC<ShadowTimelapseControlProps> = ({
  latitude = 42,
  onTimeChange,
  enabled = true,
  isNightMode = false,
  compact = false,
}) => {
  const { t } = useTranslation(['property']);

  // Handle time change callback
  const handleTimeChange = useCallback((hour: number) => {
    if (onTimeChange) {
      onTimeChange(hour);
    }
  }, [onTimeChange]);

  // Initialize timelapse hook
  const {
    currentTime,
    isPlaying,
    speed,
    progress,
    timePeriod,
    sunInfo,
    formattedTime,
    toggle,
    reset,
    setSpeed,
    seekToProgress,
    goToSunrise,
    goToNoon,
    goToSunset,
  } = useShadowTimelapse(latitude, handleTimeChange);

  // Calculate start/end hours
  const startHour = Math.floor(sunInfo.sunrise - 1);
  const endHour = Math.ceil(sunInfo.sunset + 1);

  if (!enabled) return null;

  // Compact mode for mobile/embedded use
  if (compact) {
    return (
      <div
        className={`
          ${isNightMode ? 'bg-slate-900/95' : 'bg-white/95'}
          backdrop-blur-sm rounded-xl shadow-lg border p-3
          ${isNightMode ? 'border-cyan-500/30' : 'border-neutral-200'}
        `}
      >
        {/* Header with play button and time */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                transition-all active:scale-95
                ${isPlaying
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : isNightMode
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-neutral-100 text-neutral-700'
                }
              `}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div>
              <div className={`text-lg font-bold ${isNightMode ? 'text-white' : 'text-neutral-800'}`}>
                {formattedTime}
              </div>
              <div className={`text-xs ${isNightMode ? 'text-cyan-400' : 'text-primary'}`}>
                {PERIOD_ICONS[timePeriod]} {t(`shadowTimelapse.periods.${timePeriod}`, timePeriod)}
              </div>
            </div>
          </div>
          <button
            onClick={reset}
            className={`
              p-2 rounded-lg transition-colors
              ${isNightMode ? 'text-slate-400 hover:bg-slate-700' : 'text-neutral-400 hover:bg-neutral-100'}
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Timeline */}
        <TimelineScrubber
          progress={progress}
          sunInfo={sunInfo}
          startHour={startHour}
          endHour={endHour}
          onSeek={seekToProgress}
          isNightMode={isNightMode}
          timePeriod={timePeriod}
        />

        {/* Speed and quick actions */}
        <div className="flex items-center justify-between mt-3">
          <SpeedSelector speed={speed} onSpeedChange={setSpeed} isNightMode={isNightMode} />
          <div className="flex items-center gap-1">
            <button onClick={goToSunrise} className={`p-1.5 rounded-md text-sm ${isNightMode ? 'hover:bg-slate-700' : 'hover:bg-neutral-100'}`}>🌅</button>
            <button onClick={goToNoon} className={`p-1.5 rounded-md text-sm ${isNightMode ? 'hover:bg-slate-700' : 'hover:bg-neutral-100'}`}>☀️</button>
            <button onClick={goToSunset} className={`p-1.5 rounded-md text-sm ${isNightMode ? 'hover:bg-slate-700' : 'hover:bg-neutral-100'}`}>🌇</button>
          </div>
        </div>
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={`
        ${isNightMode ? 'bg-slate-900/95' : 'bg-white/95'}
        backdrop-blur-sm rounded-xl shadow-lg border p-4
        ${isNightMode ? 'border-cyan-500/30' : 'border-neutral-200'}
        w-[280px]
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-sm font-bold ${isNightMode ? 'text-white' : 'text-neutral-800'}`}>
          {t('shadowTimelapse.title', 'Shadow Time-Lapse')}
        </h4>
        <button
          onClick={reset}
          className={`
            p-1.5 rounded-lg transition-colors text-xs
            ${isNightMode ? 'text-slate-400 hover:bg-slate-700' : 'text-neutral-400 hover:bg-neutral-100'}
          `}
          title={t('shadowTimelapse.reset', 'Reset')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Main display */}
      <div className={`
        rounded-lg p-3 mb-3 bg-gradient-to-r ${PERIOD_GRADIENTS[timePeriod]}
        transition-all duration-500
      `}>
        <div className="flex items-center justify-between">
          <div className="text-white">
            <div className="text-2xl font-bold">{formattedTime}</div>
            <div className="text-sm opacity-90">
              {PERIOD_ICONS[timePeriod]} {t(`shadowTimelapse.periods.${timePeriod}`, timePeriod)}
            </div>
          </div>
          <button
            onClick={toggle}
            className={`
              w-14 h-14 rounded-full flex items-center justify-center
              bg-white/20 backdrop-blur-sm border-2 border-white/40
              text-white transition-all hover:bg-white/30 active:scale-95
            `}
          >
            {isPlaying ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Timeline scrubber */}
      <div className="mb-3">
        <TimelineScrubber
          progress={progress}
          sunInfo={sunInfo}
          startHour={startHour}
          endHour={endHour}
          onSeek={seekToProgress}
          isNightMode={isNightMode}
          timePeriod={timePeriod}
        />
      </div>

      {/* Quick jump buttons */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={goToSunrise}
          className={`
            flex-1 flex flex-col items-center py-2 rounded-lg transition-all
            ${timePeriod === 'dawn'
              ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white'
              : isNightMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }
          `}
        >
          <span className="text-lg">🌅</span>
          <span className="text-[10px] font-medium">{t('shadowTimelapse.sunrise', 'Sunrise')}</span>
          <span className="text-[9px] opacity-70">{formatTime(sunInfo.sunrise)}</span>
        </button>
        <button
          onClick={goToNoon}
          className={`
            flex-1 flex flex-col items-center py-2 rounded-lg transition-all
            ${timePeriod === 'noon'
              ? 'bg-gradient-to-r from-yellow-300 to-sky-400 text-slate-800'
              : isNightMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }
          `}
        >
          <span className="text-lg">☀️</span>
          <span className="text-[10px] font-medium">{t('shadowTimelapse.noon', 'Noon')}</span>
          <span className="text-[9px] opacity-70">12:00 PM</span>
        </button>
        <button
          onClick={goToSunset}
          className={`
            flex-1 flex flex-col items-center py-2 rounded-lg transition-all
            ${timePeriod === 'sunset'
              ? 'bg-gradient-to-r from-orange-500 to-purple-500 text-white'
              : isNightMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }
          `}
        >
          <span className="text-lg">🌇</span>
          <span className="text-[10px] font-medium">{t('shadowTimelapse.sunset', 'Sunset')}</span>
          <span className="text-[9px] opacity-70">{formatTime(sunInfo.sunset)}</span>
        </button>
      </div>

      {/* Speed control */}
      <div className="space-y-1">
        <div className={`text-[10px] font-medium ${isNightMode ? 'text-slate-400' : 'text-neutral-500'}`}>
          {t('shadowTimelapse.speed', 'Speed')}
        </div>
        <SpeedSelector speed={speed} onSpeedChange={setSpeed} isNightMode={isNightMode} />
      </div>

      {/* Tip */}
      <div className={`
        mt-3 p-2 rounded-lg text-[10px]
        ${isNightMode ? 'bg-cyan-900/30 border border-cyan-500/20 text-cyan-200' : 'bg-blue-50 border border-blue-200 text-blue-600'}
      `}>
        💡 {t('shadowTimelapse.tip', 'Watch how shadows move throughout the day to understand sunlight exposure')}
      </div>
    </div>
  );
};

export default ShadowTimelapseControl;
