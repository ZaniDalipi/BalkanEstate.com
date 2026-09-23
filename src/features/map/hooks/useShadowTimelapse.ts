// useShadowTimelapse Hook
// Manages smooth shadow/sun time-lapse animation for property maps

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * Animation speed presets
 */
export type TimelapseSpeed = 'slow' | 'normal' | 'fast' | 'ultra';

/**
 * Time period of day
 */
export type TimePeriod = 'night' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'dusk';

/**
 * Configuration for the timelapse animation
 */
export interface TimelapseConfig {
  /** Starting hour (0-23) */
  startHour: number;
  /** Ending hour (0-23) */
  endHour: number;
  /** Minutes per animation frame */
  minutesPerFrame: number;
  /** Frame rate (fps) */
  frameRate: number;
  /** Loop the animation */
  loop: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_TIMELAPSE_CONFIG: TimelapseConfig = {
  startHour: 5,
  endHour: 21,
  minutesPerFrame: 5,
  frameRate: 30,
  loop: false,
};

/**
 * Speed multipliers for different presets
 */
export const SPEED_MULTIPLIERS: Record<TimelapseSpeed, number> = {
  slow: 0.5,
  normal: 1,
  fast: 2,
  ultra: 4,
};

/**
 * Speed labels for UI
 */
export const SPEED_LABELS: Record<TimelapseSpeed, string> = {
  slow: '0.5x',
  normal: '1x',
  fast: '2x',
  ultra: '4x',
};

/**
 * Sunrise/sunset info for a location
 */
export interface SunInfo {
  sunrise: number;
  sunset: number;
  dayLength: number;
  /** Clock hour of solar noon, when known (defaults to 12). */
  solarNoon?: number;
}

/**
 * Get current day of year (1-365)
 */
function getCurrentDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

/**
 * Calculate sunrise and sunset hours based on latitude and day of year
 */
export function calculateSunriseSunset(latitude: number, dayOfYear: number = getCurrentDayOfYear()): SunInfo {
  const DEG_TO_RAD = Math.PI / 180;
  const RAD_TO_DEG = 180 / Math.PI;

  // Solar declination
  const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const latRad = latitude * DEG_TO_RAD;
  const decRad = declination * DEG_TO_RAD;
  const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);

  // Handle polar day/night
  if (cosHourAngle < -1) {
    return { sunrise: 0, sunset: 24, dayLength: 24 };
  }
  if (cosHourAngle > 1) {
    return { sunrise: 12, sunset: 12, dayLength: 0 };
  }

  const daylightHours = (2 * Math.acos(cosHourAngle) * RAD_TO_DEG) / 15;
  const sunrise = 12 - (daylightHours / 2);
  const sunset = 12 + (daylightHours / 2);

  return {
    sunrise,
    sunset,
    dayLength: daylightHours,
  };
}

/**
 * Get time period based on hour
 */
export function getTimePeriod(hour: number, sunInfo?: SunInfo): TimePeriod {
  const sunrise = sunInfo?.sunrise ?? 6;
  const sunset = sunInfo?.sunset ?? 20;

  if (hour < sunrise - 1) return 'night';
  if (hour < sunrise + 1) return 'dawn';
  if (hour < 11) return 'morning';
  if (hour < 14) return 'noon';
  if (hour < sunset - 1) return 'afternoon';
  if (hour < sunset + 1) return 'sunset';
  if (hour < sunset + 2) return 'dusk';
  return 'night';
}

/**
 * Format time for display
 */
export function formatTime(hour: number): string {
  // Round to whole minutes first so 6:59.7 becomes 7:00, not "6:60"
  const totalMinutes = Math.round(hour * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Hook return type
 */
export interface UseShadowTimelapseReturn {
  /** Current time in decimal hours (e.g., 14.5 = 2:30 PM) */
  currentTime: number;
  /** Is animation currently playing */
  isPlaying: boolean;
  /** Current speed setting */
  speed: TimelapseSpeed;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current time period (dawn, morning, etc.) */
  timePeriod: TimePeriod;
  /** Sun information for the location */
  sunInfo: SunInfo;
  /** Formatted current time string */
  formattedTime: string;
  /** Start or resume playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Toggle play/pause */
  toggle: () => void;
  /** Stop and reset to start */
  reset: () => void;
  /** Set playback speed */
  setSpeed: (speed: TimelapseSpeed) => void;
  /** Seek to specific time (0-23 hours) */
  seekTo: (hour: number) => void;
  /** Seek to specific progress (0-100) */
  seekToProgress: (progress: number) => void;
  /** Jump to sunrise */
  goToSunrise: () => void;
  /** Jump to noon */
  goToNoon: () => void;
  /** Jump to sunset */
  goToSunset: () => void;
  /** Is at the start of animation */
  isAtStart: boolean;
  /** Is at the end of animation */
  isAtEnd: boolean;
}

/**
 * useShadowTimelapse Hook
 *
 * Provides smooth time-lapse animation for shadow simulation on maps.
 * Features:
 * - Smooth minute-by-minute progression
 * - Variable speed control
 * - Sunrise/sunset awareness based on latitude
 * - Play, pause, seek controls
 *
 * @param latitude - Location latitude for accurate sun calculations
 * @param onTimeChange - Callback fired on each time update
 * @param config - Animation configuration
 * @param sunInfoOverride - Precomputed sun times (e.g. for a chosen date and
 *   the property's time zone); replaces the latitude-only estimate
 */
export function useShadowTimelapse(
  latitude: number = 42, // Default to Balkans
  onTimeChange?: (hour: number, period: TimePeriod) => void,
  config: Partial<TimelapseConfig> = {},
  sunInfoOverride?: SunInfo
): UseShadowTimelapseReturn {
  const mergedConfig: TimelapseConfig = { ...DEFAULT_TIMELAPSE_CONFIG, ...config };

  // Calculate sun info for this latitude
  const sunInfo = useMemo(
    () => sunInfoOverride ?? calculateSunriseSunset(latitude),
    [sunInfoOverride, latitude]
  );

  // Adjust start/end to sun times if not specified
  const effectiveStart = config.startHour ?? Math.max(0, Math.floor(sunInfo.sunrise - 1));
  const effectiveEnd = config.endHour ?? Math.min(24, Math.ceil(sunInfo.sunset + 1));

  // Start at noon so shadows are immediately visible
  const [currentTime, setCurrentTimeState] = useState(12);
  // Mirror of currentTime the animation loop can read synchronously
  const timeRef = useRef(12);
  const setCurrentTime = useCallback((hour: number) => {
    timeRef.current = hour;
    setCurrentTimeState(hour);
  }, []);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<TimelapseSpeed>('normal');

  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Calculate derived values
  const progress = useMemo(() => {
    const range = effectiveEnd - effectiveStart;
    return ((currentTime - effectiveStart) / range) * 100;
  }, [currentTime, effectiveStart, effectiveEnd]);

  const timePeriod = useMemo(() => getTimePeriod(currentTime, sunInfo), [currentTime, sunInfo]);
  const formattedTime = useMemo(() => formatTime(currentTime), [currentTime]);
  const isAtStart = currentTime <= effectiveStart;
  const isAtEnd = currentTime >= effectiveEnd;

  // Notify parent of time changes
  useEffect(() => {
    if (onTimeChange) {
      onTimeChange(currentTime, timePeriod);
    }
  }, [currentTime, timePeriod, onTimeChange]);

  // Latest values for the animation loop, read through a ref so the loop is
  // started once per play and never restarted by the re-renders it causes.
  // (Restarting it every frame reset the frame clock, so time advanced in
  // uneven jumps and the sun and shadows stuttered.)
  const loopStateRef = useRef({ speed, config: mergedConfig, start: effectiveStart, end: effectiveEnd });
  loopStateRef.current = { speed, config: mergedConfig, start: effectiveStart, end: effectiveEnd };

  // Animation loop: advance by real elapsed time every display frame, so the
  // motion is continuous at any refresh rate. The average rate is unchanged:
  // minutesPerFrame × frameRate simulated minutes per second at 1x.
  useEffect(() => {
    if (!isPlaying) return;
    lastFrameTimeRef.current = 0;

    const tick = (timestamp: number) => {
      const last = lastFrameTimeRef.current || timestamp;
      lastFrameTimeRef.current = timestamp;
      // Clamp so a backgrounded tab doesn't leap hours on return
      const seconds = Math.min(0.1, (timestamp - last) / 1000);
      const { speed: s, config, start, end } = loopStateRef.current;
      const hoursPerSecond = (config.minutesPerFrame * config.frameRate * SPEED_MULTIPLIERS[s]) / 60;

      const next = timeRef.current + seconds * hoursPerSecond;
      if (next >= end) {
        setCurrentTime(config.loop ? start : end);
        if (!config.loop) {
          setIsPlaying(false);
          return;
        }
      } else {
        setCurrentTime(next);
      }
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [isPlaying, setCurrentTime]);

  // Control functions
  const play = useCallback(() => {
    if (isAtEnd) {
      setCurrentTime(effectiveStart);
    }
    setIsPlaying(true);
  }, [isAtEnd, effectiveStart]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(effectiveStart);
  }, [effectiveStart]);

  const seekTo = useCallback((hour: number) => {
    const clamped = Math.max(effectiveStart, Math.min(effectiveEnd, hour));
    setCurrentTime(clamped);
  }, [effectiveStart, effectiveEnd]);

  const seekToProgress = useCallback((progressPercent: number) => {
    const range = effectiveEnd - effectiveStart;
    const hour = effectiveStart + (progressPercent / 100) * range;
    seekTo(hour);
  }, [effectiveStart, effectiveEnd, seekTo]);

  const goToSunrise = useCallback(() => {
    seekTo(sunInfo.sunrise);
  }, [sunInfo.sunrise, seekTo]);

  const goToNoon = useCallback(() => {
    seekTo(sunInfo.solarNoon ?? 12);
  }, [sunInfo.solarNoon, seekTo]);

  const goToSunset = useCallback(() => {
    seekTo(sunInfo.sunset);
  }, [sunInfo.sunset, seekTo]);

  return {
    currentTime,
    isPlaying,
    speed,
    progress,
    timePeriod,
    sunInfo,
    formattedTime,
    play,
    pause,
    toggle,
    reset,
    setSpeed,
    seekTo,
    seekToProgress,
    goToSunrise,
    goToNoon,
    goToSunset,
    isAtStart,
    isAtEnd,
  };
}

export default useShadowTimelapse;
