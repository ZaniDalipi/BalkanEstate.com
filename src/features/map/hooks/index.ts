// Map feature hooks barrel export

export {
  useCinematicFlythrough,
  DEFAULT_FLYTHROUGH_CONFIG,
  type FlythroughPhase,
  type FlythroughConfig,
  type UseCinematicFlythroughReturn,
} from './useCinematicFlythrough';

export {
  useShadowTimelapse,
  DEFAULT_TIMELAPSE_CONFIG,
  SPEED_MULTIPLIERS,
  SPEED_LABELS,
  calculateSunriseSunset,
  getTimePeriod,
  formatTime,
  type TimelapseSpeed,
  type TimePeriod,
  type TimelapseConfig,
  type SunInfo,
  type UseShadowTimelapseReturn,
} from './useShadowTimelapse';
