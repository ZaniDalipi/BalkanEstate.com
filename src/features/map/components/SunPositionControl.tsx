// SunPositionControl Component
// Allows users to see building shadows at different times of day
// Includes sun compass showing cardinal directions - important for property orientation

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getTimePeriod, TimePeriod } from './Buildings3DLayer';
import { type Season, calculateSunriseSunset, getSeasonDayOfYear } from './SunArcAnimation';

interface SunPositionControlProps {
  onDateTimeChange: (dateTime: Date) => void;
  onSeasonChange?: (season: Season) => void;
  isNightMode: boolean;
  enabled: boolean;
  latitude?: number; // For accurate sun position calculation
  compact?: boolean; // For mobile compact mode
}

// Helper to format decimal hours to time string
const formatDecimalHour = (decimalHour: number): string => {
  const hours = Math.floor(decimalHour);
  const minutes = Math.round((decimalHour - hours) * 60);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Season icons and labels
const SEASONS: { id: Season; icon: string; label: string }[] = [
  { id: 'spring', icon: '🌸', label: 'Spring' },
  { id: 'summer', icon: '☀️', label: 'Summer' },
  { id: 'autumn', icon: '🍂', label: 'Autumn' },
  { id: 'winter', icon: '❄️', label: 'Winter' },
];

// Calculate sun azimuth (compass direction) based on time and approximate latitude
// This is a simplified calculation - for Balkans region (roughly 42°N latitude)
const calculateSunAzimuth = (hour: number, latitude: number = 42): number => {
  // Simplified sun position calculation
  // At solar noon (12:00), sun is due south (180°) in Northern Hemisphere
  // Morning: sun rises in east (~90°), moves through south, sets in west (~270°)

  // Hours from solar noon (assuming 12:00 is solar noon)
  const hoursFromNoon = hour - 12;

  // Sun moves approximately 15° per hour (360° / 24 hours)
  // But the path is an arc, so we use a sine curve for more realistic movement
  const sunHourAngle = hoursFromNoon * 15;

  // Base azimuth is 180° (due south) at noon
  // Add the hour angle to get current azimuth
  let azimuth = 180 + sunHourAngle;

  // Normalize to 0-360 range
  while (azimuth < 0) azimuth += 360;
  while (azimuth >= 360) azimuth -= 360;

  return azimuth;
};

// Get cardinal direction name from azimuth
const getCardinalDirection = (azimuth: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(azimuth / 45) % 8;
  return directions[index];
};

// Get full cardinal direction name
const getCardinalDirectionFull = (azimuth: number): string => {
  const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  const index = Math.round(azimuth / 45) % 8;
  return directions[index];
};

// Sun icons for different times
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

const MoonPhaseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
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

/**
 * SunCompass Component
 * Shows cardinal directions and current sun position
 */
const SunCompass: React.FC<{
  sunAzimuth: number;
  hour: number;
  isNightMode: boolean;
}> = ({ sunAzimuth, hour, isNightMode }) => {
  const isNight = hour < 6 || hour >= 20;

  return (
    <div className="relative w-24 h-24">
      {/* Compass background */}
      <div className={`
        absolute inset-0 rounded-full border
        ${isNightMode
          ? 'bg-slate-800/80 border-cyan-500/30'
          : 'bg-white/90 border-neutral-300'
        }
      `}>
        {/* Cardinal direction markers */}
        <div className={`absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-bold ${isNightMode ? 'text-red-400' : 'text-red-600'}`}>N</div>
        <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-bold ${isNightMode ? 'text-slate-400' : 'text-neutral-600'}`}>S</div>
        <div className={`absolute left-0.5 top-1/2 -translate-y-1/2 text-[9px] font-bold ${isNightMode ? 'text-slate-400' : 'text-neutral-600'}`}>W</div>
        <div className={`absolute right-0.5 top-1/2 -translate-y-1/2 text-[9px] font-bold ${isNightMode ? 'text-slate-400' : 'text-neutral-600'}`}>E</div>

        {/* Compass circle guides */}
        <div className={`absolute inset-3 rounded-full border ${isNightMode ? 'border-slate-700' : 'border-neutral-200'}`} />

        {/* Center point */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${isNightMode ? 'bg-cyan-400' : 'bg-primary'}`} />

        {/* Sun/Moon indicator - rotates based on azimuth */}
        <div
          className="absolute top-1/2 left-1/2 w-full h-full"
          style={{
            transform: `translate(-50%, -50%) rotate(${sunAzimuth - 90}deg)`,
            transformOrigin: 'center',
          }}
        >
          {/* Sun/Moon position indicator */}
          <div
            className={`
              absolute left-1/2 -translate-x-1/2
              w-5 h-5 rounded-full flex items-center justify-center text-[10px]
              transition-all duration-300
              ${isNight
                ? 'bg-indigo-900 shadow-md shadow-indigo-500/30'
                : 'bg-gradient-to-br from-yellow-300 to-orange-400 shadow-md shadow-orange-300/50'
              }
            `}
            style={{ top: '4px' }}
          >
            {isNight ? '🌙' : '☀️'}
          </div>

          {/* Direction line from center to sun */}
          <div
            className={`
              absolute left-1/2 -translate-x-1/2 w-0.5 h-7
              ${isNight
                ? 'bg-gradient-to-t from-transparent to-indigo-400/50'
                : 'bg-gradient-to-t from-transparent to-orange-400/50'
              }
            `}
            style={{ top: '22px' }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * SunPositionControl Component
 *
 * Real estate feature: See how shadows fall at different times
 * - Slider to adjust time of day
 * - Sun compass showing current sun direction (N/S/E/W)
 * - Quick buttons for sunrise, noon, sunset
 * - Play animation to see shadow movement through the day
 * - Helps buyers understand:
 *   - Sunlight exposure of properties
 *   - Window orientation (south-facing = more sun)
 *   - Morning vs afternoon sun
 */
const SunPositionControl: React.FC<SunPositionControlProps> = ({
  onDateTimeChange,
  onSeasonChange,
  isNightMode,
  enabled,
  latitude = 42, // Default to Balkans latitude
  compact = false, // Compact mode for mobile
}) => {
  const { t } = useTranslation(['search']);
  const [hour, setHour] = useState(12); // 0-23
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season>('current');
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Notify parent of season changes
  useEffect(() => {
    if (onSeasonChange) {
      onSeasonChange(selectedSeason);
    }
  }, [selectedSeason, onSeasonChange]);

  // Calculate sun position
  const sunAzimuth = useMemo(() => calculateSunAzimuth(hour, latitude), [hour, latitude]);
  const cardinalDirection = useMemo(() => getCardinalDirection(sunAzimuth), [sunAzimuth]);
  const cardinalDirectionFull = useMemo(() => getCardinalDirectionFull(sunAzimuth), [sunAzimuth]);
  const timePeriod = useMemo(() => getTimePeriod(hour), [hour]);

  // Calculate sunrise/sunset for selected season
  const sunriseSunset = useMemo(() => {
    const dayOfYear = getSeasonDayOfYear(selectedSeason);
    return calculateSunriseSunset(latitude, dayOfYear);
  }, [selectedSeason, latitude]);

  // Check if current hour is daytime
  const isCurrentlyDay = useMemo(() => {
    return hour >= sunriseSunset.sunrise && hour < sunriseSunset.sunset;
  }, [hour, sunriseSunset]);

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
      }, 4000); // Change hour every 400ms
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
    return <MoonPhaseIcon className="w-4 h-4" />;
  };

  // Get background gradient based on time period
  const getTimeGradient = () => {
    switch (timePeriod) {
      case 'dawn': return 'from-orange-400 to-pink-400';
      case 'morning': return 'from-yellow-300 to-blue-300';
      case 'noon': return 'from-yellow-300 to-sky-400';
      case 'afternoon': return 'from-amber-300 to-orange-300';
      case 'sunset': return 'from-orange-500 to-purple-500';
      case 'dusk': return 'from-purple-500 to-indigo-700';
      case 'night': return 'from-indigo-900 to-slate-900';
      default: return 'from-blue-400 to-cyan-400';
    }
  };

  // Get time period display name
  const getTimePeriodName = () => {
    const names: Record<TimePeriod, string> = {
      dawn: t('search:map.dawn', 'Dawn'),
      morning: t('search:map.morning', 'Morning'),
      noon: t('search:map.noon', 'Noon'),
      afternoon: t('search:map.afternoon', 'Afternoon'),
      sunset: t('search:map.sunset', 'Sunset'),
      dusk: t('search:map.dusk', 'Dusk'),
      night: t('search:map.night', 'Night'),
    };
    return names[timePeriod];
  };

  if (!enabled) return null;

  // Compact mode for mobile - larger UI for better touch interaction
  if (compact) {
    return (
      <div className={`
        ${isNightMode ? 'bg-slate-900/95' : 'bg-white/98'}
        backdrop-blur-lg rounded-2xl shadow-xl border
        ${isNightMode ? 'border-cyan-500/30' : 'border-neutral-200'}
        transition-all duration-300
        ${isExpanded ? 'p-3 w-[200px]' : 'p-2'}
      `}>
        {/* Compact collapsed view */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            flex items-center gap-2 w-full
            ${isNightMode ? 'text-white' : 'text-neutral-800'}
          `}
        >
          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${getTimeGradient()} flex-shrink-0`}>
            <span className="text-base">{hour >= 6 && hour < 20 ? '☀️' : '🌙'}</span>
          </div>
          <span className="text-sm font-semibold">{formatHour(hour)}</span>
          <svg
            className={`w-4 h-4 flex-shrink-0 transition-transform ml-auto ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Compact expanded view */}
        {isExpanded && (
          <div className="mt-3 space-y-3">
            {/* Time slider - larger for easier touch */}
            <div className="px-1">
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
                  w-full h-2 rounded-full appearance-none cursor-pointer
                  ${isNightMode
                    ? 'bg-slate-700 [&::-webkit-slider-thumb]:bg-cyan-400'
                    : 'bg-neutral-200 [&::-webkit-slider-thumb]:bg-primary'
                  }
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-white
                `}
              />
            </div>

            {/* Quick buttons row - larger touch targets */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTime(Math.round(sunriseSunset.sunrise))}
                className={`flex-1 p-2.5 rounded-xl text-base transition-all active:scale-95 ${timePeriod === 'dawn' ? 'bg-orange-400 text-white shadow-md' : isNightMode ? 'bg-slate-800 text-slate-300' : 'bg-neutral-100'}`}
              >
                🌅
              </button>
              <button
                onClick={() => setTime(12)}
                className={`flex-1 p-2.5 rounded-xl text-base transition-all active:scale-95 ${timePeriod === 'noon' ? 'bg-yellow-400 text-slate-800 shadow-md' : isNightMode ? 'bg-slate-800 text-slate-300' : 'bg-neutral-100'}`}
              >
                ☀️
              </button>
              <button
                onClick={() => setTime(Math.round(sunriseSunset.sunset))}
                className={`flex-1 p-2.5 rounded-xl text-base transition-all active:scale-95 ${timePeriod === 'sunset' ? 'bg-orange-500 text-white shadow-md' : isNightMode ? 'bg-slate-800 text-slate-300' : 'bg-neutral-100'}`}
              >
                🌇
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 p-2.5 rounded-xl text-base transition-all active:scale-95 ${isPlaying ? 'bg-cyan-500 text-white shadow-md' : isNightMode ? 'bg-slate-800 text-slate-300' : 'bg-neutral-100'}`}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
            </div>

            {/* Season row - larger touch targets */}
            <div className="flex items-center gap-1">
              {SEASONS.map((season) => (
                <button
                  key={season.id}
                  onClick={() => setSelectedSeason(season.id)}
                  className={`flex-1 p-2 rounded-xl text-base transition-all active:scale-95 ${
                    selectedSeason === season.id
                      ? isNightMode ? 'bg-cyan-500/30 border-2 border-cyan-500/50 shadow-md' : 'bg-primary/20 border-2 border-primary/50 shadow-md'
                      : isNightMode ? 'bg-slate-800' : 'bg-neutral-100'
                  }`}
                >
                  {season.icon}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode for desktop
  return (
    <div className={`
      w-[200px] max-w-[calc(100vw-2rem)]
      ${isNightMode ? 'bg-slate-900/95' : 'bg-white/95'}
      backdrop-blur-sm rounded-xl shadow-lg border
      ${isNightMode ? 'border-cyan-500/30' : 'border-neutral-200'}
      transition-all duration-300
      ${isExpanded ? 'p-3' : 'p-2'}
    `}>
      {/* Collapsed view - compact time and compass direction */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 w-full
          ${isNightMode ? 'text-white' : 'text-neutral-800'}
        `}
      >
        <div className={`
          p-1 rounded-md bg-gradient-to-br ${getTimeGradient()} flex-shrink-0
        `}>
          {getSunIcon()}
        </div>
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="text-xs font-semibold truncate">
            {formatHour(hour)}
          </span>
          <span className={`text-[10px] truncate ${isNightMode ? 'text-cyan-400' : 'text-primary'}`}>
            ☀️ {cardinalDirection} ({Math.round(sunAzimuth)}°)
          </span>
        </div>
        <svg
          className={`w-3 h-3 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded view - full controls with compass */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Sun Compass - smaller */}
          <div className="flex justify-center">
            <SunCompass sunAzimuth={sunAzimuth} hour={hour} isNightMode={isNightMode} />
          </div>

          {/* Sun direction info - compact */}
          <div className={`text-center p-1.5 rounded-lg ${isNightMode ? 'bg-slate-800/50' : 'bg-neutral-100'}`}>
            <p className={`text-[10px] ${isNightMode ? 'text-slate-400' : 'text-neutral-500'}`}>
              {t('search:map.sunDirection', 'Sun Direction')}
            </p>
            <p className={`text-sm font-bold ${isNightMode ? 'text-cyan-400' : 'text-primary'}`}>
              {cardinalDirectionFull} ({Math.round(sunAzimuth)}°)
            </p>
            <p className={`text-[10px] ${isNightMode ? 'text-slate-500' : 'text-neutral-400'}`}>
              {getTimePeriodName()}
            </p>
          </div>

          {/* Property orientation tip - compact */}
          <div className={`text-[10px] p-1.5 rounded-lg ${isNightMode ? 'bg-cyan-900/30 border border-cyan-500/20' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`font-medium ${isNightMode ? 'text-cyan-300' : 'text-blue-700'}`}>
              💡 {t('search:map.orientationTip', 'Tip')}:
            </p>
            <p className={`leading-tight ${isNightMode ? 'text-cyan-200/80' : 'text-blue-600'}`}>
              {hour >= 6 && hour < 12
                ? t('search:map.eastWindows', 'East-facing windows get morning sun')
                : hour >= 12 && hour < 18
                  ? t('search:map.southWindows', 'South-facing windows get the most sunlight')
                  : t('search:map.westWindows', 'West-facing windows get afternoon/evening sun')
              }
            </p>
          </div>

          {/* Time slider */}
          <div className="space-y-1">
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
                w-full h-1.5 rounded-lg appearance-none cursor-pointer
                ${isNightMode
                  ? 'bg-slate-700 [&::-webkit-slider-thumb]:bg-cyan-400'
                  : 'bg-neutral-200 [&::-webkit-slider-thumb]:bg-primary'
                }
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-md
              `}
            />
            <div className={`flex justify-between text-[9px] ${isNightMode ? 'text-slate-500' : 'text-neutral-400'}`}>
              <span>12AM</span>
              <span>6AM</span>
              <span>12PM</span>
              <span>6PM</span>
              <span>11PM</span>
            </div>
          </div>

          {/* Sunrise/Sunset times display */}
          <div className={`flex justify-between text-[10px] px-1 ${isNightMode ? 'text-cyan-300' : 'text-primary'}`}>
            <span>🌅 {formatDecimalHour(sunriseSunset.sunrise)}</span>
            <span>🌇 {formatDecimalHour(sunriseSunset.sunset)}</span>
          </div>

          {/* Quick time buttons - use actual sunrise/sunset times */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTime(Math.round(sunriseSunset.sunrise))}
              className={`
                flex-1 flex items-center justify-center p-1.5 rounded-md text-[10px] font-medium
                transition-all
                ${timePeriod === 'dawn'
                  ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white shadow-sm'
                  : isNightMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }
              `}
              title={`${t('search:map.sunrise', 'Sunrise')} - ${formatDecimalHour(sunriseSunset.sunrise)}`}
            >
              <SunriseIcon className="w-3 h-3" />
            </button>

            <button
              onClick={() => setTime(12)}
              className={`
                flex-1 flex items-center justify-center p-1.5 rounded-md text-[10px] font-medium
                transition-all
                ${timePeriod === 'noon'
                  ? 'bg-gradient-to-r from-yellow-300 to-sky-400 text-slate-800 shadow-sm'
                  : isNightMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }
              `}
              title={t('search:map.noon', 'Noon')}
            >
              <NoonIcon className="w-3 h-3" />
            </button>

            <button
              onClick={() => setTime(Math.round(sunriseSunset.sunset))}
              className={`
                flex-1 flex items-center justify-center p-1.5 rounded-md text-[10px] font-medium
                transition-all
                ${timePeriod === 'sunset'
                  ? 'bg-gradient-to-r from-orange-500 to-purple-500 text-white shadow-sm'
                  : isNightMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }
              `}
              title={`${t('search:map.sunset', 'Sunset')} - ${formatDecimalHour(sunriseSunset.sunset)}`}
            >
              <SunsetIcon className="w-3 h-3" />
            </button>

            {/* Play/Pause - compact */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`
                flex-1 flex items-center justify-center p-1.5 rounded-md
                transition-all
                ${isPlaying
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                  : isNightMode
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }
              `}
              title={isPlaying ? t('search:map.pauseAnimation', 'Pause') : t('search:map.playAnimation', 'Play')}
            >
              {isPlaying ? <PauseIcon className="w-3 h-3" /> : <PlayIcon className="w-3 h-3" />}
            </button>
          </div>

          {/* Season selector */}
          <div className="space-y-1">
            <p className={`text-[10px] ${isNightMode ? 'text-slate-400' : 'text-neutral-500'}`}>
              {t('search:map.season', 'Season')}
            </p>
            <div className="flex items-center gap-1">
              {SEASONS.map((season) => (
                <button
                  key={season.id}
                  onClick={() => setSelectedSeason(season.id)}
                  className={`
                    flex-1 flex items-center justify-center p-1.5 rounded-md text-xs
                    transition-all
                    ${selectedSeason === season.id
                      ? isNightMode
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                        : 'bg-primary/20 text-primary border border-primary/50'
                      : isNightMode
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }
                  `}
                  title={season.label}
                >
                  {season.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SunPositionControl;
