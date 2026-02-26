// CinematicPropertyMap Component
// Immersive map experience with dramatic flythrough animation and shadow timelapse

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useCinematicFlythrough, type FlythroughPhase } from '../hooks/useCinematicFlythrough';
import { useShadowTimelapse, type TimePeriod } from '../hooks/useShadowTimelapse';
import { MAP_TILE_LAYERS } from '@/config/mapStyles';

/**
 * 3D tilt configurations for different animation phases
 * Creates an immersive perspective effect during flythrough
 */
const PHASE_TILT_CONFIG: Record<FlythroughPhase, { tilt: number; scale: number }> = {
  idle: { tilt: 0, scale: 1 },
  starting: { tilt: 15, scale: 1.02 },
  zooming_out: { tilt: 25, scale: 1.05 },
  panning: { tilt: 35, scale: 1.08 },
  zooming_in: { tilt: 20, scale: 1.03 },
  orbiting: { tilt: 30, scale: 1.05 },
  complete: { tilt: 0, scale: 1 },
};

// Fix for default icon issue with bundlers
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

/**
 * Props for CinematicPropertyMap
 */
interface CinematicPropertyMapProps {
  /** Property latitude */
  lat: number;
  /** Property longitude */
  lng: number;
  /** Property address for display */
  address: string;
  /** Property title (optional) */
  title?: string;
  /** Callback when user wants to go to full search map */
  onNavigateToMap?: () => void;
  /** Auto-play animation on mount */
  autoPlay?: boolean;
  /** Custom height for the map container */
  height?: string;
  /** Enable shadow timelapse feature */
  enableShadowTimelapse?: boolean;
}

/**
 * Time period gradient backgrounds
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
 * Shadow Timelapse Panel Component
 */
const ShadowTimelapsePanel: React.FC<{
  latitude: number;
  isVisible: boolean;
  onClose: () => void;
}> = ({ latitude, isVisible, onClose }) => {
  const { t } = useTranslation(['property']);

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
  } = useShadowTimelapse(latitude);

  const startHour = Math.floor(sunInfo.sunrise - 1);
  const endHour = Math.ceil(sunInfo.sunset + 1);
  const range = endHour - startHour;

  // Calculate marker positions
  const sunrisePos = ((sunInfo.sunrise - startHour) / range) * 100;
  const noonPos = ((12 - startHour) / range) * 100;
  const sunsetPos = ((sunInfo.sunset - startHour) / range) * 100;

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-20 left-4 right-4 z-[1000] max-w-sm mx-auto">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className={`p-3 bg-gradient-to-r ${PERIOD_GRADIENTS[timePeriod]} transition-all duration-500`}>
          <div className="flex items-center justify-between">
            <div className="text-white">
              <div className="text-xl font-bold">{formattedTime}</div>
              <div className="text-sm opacity-90">
                {PERIOD_ICONS[timePeriod]} {t(`property:shadowTimelapse.periods.${timePeriod}`, timePeriod)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm border-2 border-white/40 text-white transition-all hover:bg-white/30 active:scale-95"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-3 space-y-2">
          {/* Progress bar */}
          <div
            className="relative h-2 bg-neutral-200 rounded-full cursor-pointer overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = ((e.clientX - rect.left) / rect.width) * 100;
              seekToProgress(Math.max(0, Math.min(100, percent)));
            }}
          >
            {/* Day/night gradient */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background: `linear-gradient(to right,
                  #1e293b 0%, #1e293b ${sunrisePos - 5}%,
                  #f97316 ${sunrisePos}%, #facc15 ${noonPos}%,
                  #f97316 ${sunsetPos}%, #1e293b ${sunsetPos + 5}%, #1e293b 100%
                )`,
              }}
            />
            {/* Progress */}
            <div
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${PERIOD_GRADIENTS[timePeriod]} transition-all duration-100`}
              style={{ width: `${progress}%` }}
            />
            {/* Playhead */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-white shadow"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>

          {/* Quick actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {(['slow', 'normal', 'fast', 'ultra'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                    speed === s ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {s === 'slow' ? '0.5x' : s === 'normal' ? '1x' : s === 'fast' ? '2x' : '4x'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={goToSunrise} className="p-1.5 rounded hover:bg-neutral-100 text-sm" title={t('property:map3d.sunrise', 'Sunrise')}>🌅</button>
              <button onClick={goToNoon} className="p-1.5 rounded hover:bg-neutral-100 text-sm" title={t('property:map3d.noon', 'Noon')}>☀️</button>
              <button onClick={goToSunset} className="p-1.5 rounded hover:bg-neutral-100 text-sm" title={t('property:map3d.sunset', 'Sunset')}>🌇</button>
              <button onClick={reset} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500" title={t('property:map3d.reset', 'Reset')}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tip */}
          <div className="text-[10px] text-neutral-500 text-center">
            💡 {t('property:shadowTimelapse.tip', 'Watch how shadows move to understand sunlight exposure')}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Inner component that has access to map instance
 */
const MapController: React.FC<{
  lat: number;
  lng: number;
  onMapReady: (map: L.Map) => void;
}> = ({ lat, lng, onMapReady }) => {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  return null;
};

/**
 * Phase indicator component - shows current animation phase
 */
const PhaseIndicator: React.FC<{
  phase: FlythroughPhase;
  progress: number;
}> = ({ phase, progress }) => {
  const { t } = useTranslation(['property']);

  const phaseLabels: Record<FlythroughPhase, string> = {
    idle: '',
    starting: t('property:cinematicMap.phases.starting', 'Preparing journey...'),
    zooming_out: t('property:cinematicMap.phases.zoomingOut', 'Rising above...'),
    panning: t('property:cinematicMap.phases.panning', 'Traveling to location...'),
    zooming_in: t('property:cinematicMap.phases.zoomingIn', 'Approaching property...'),
    orbiting: t('property:cinematicMap.phases.orbiting', 'Exploring surroundings...'),
    complete: t('property:cinematicMap.phases.complete', 'Arrived!'),
  };

  if (phase === 'idle') return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
      <div className="bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg">
        <div className="flex items-center gap-3">
          {phase !== 'complete' && (
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 border-2 border-white/30 rounded-full" />
              <div
                className="absolute inset-0 border-2 border-white rounded-full animate-spin"
                style={{
                  borderTopColor: 'transparent',
                  borderRightColor: 'transparent',
                }}
              />
            </div>
          )}
          {phase === 'complete' && (
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span className="text-sm font-medium">{phaseLabels[phase]}</span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Control buttons for the flythrough
 */
const FlythroughControls: React.FC<{
  phase: FlythroughPhase;
  hasPlayed: boolean;
  onStart: () => void;
  onSkip: () => void;
  onReplay: () => void;
  onNavigateToMap?: () => void;
  onToggleShadowTimelapse?: () => void;
  showShadowTimelapseButton?: boolean;
}> = ({ phase, hasPlayed, onStart, onSkip, onReplay, onNavigateToMap, onToggleShadowTimelapse, showShadowTimelapseButton }) => {
  const { t } = useTranslation(['property']);
  const isAnimating = phase !== 'idle' && phase !== 'complete';

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
      {/* Play button - show when idle and not played */}
      {phase === 'idle' && !hasPlayed && (
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {t('property:cinematicMap.controls.play', 'Fly to Property')}
        </button>
      )}

      {/* Skip button - show during animation */}
      {isAnimating && (
        <button
          onClick={onSkip}
          className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm text-neutral-700 font-medium rounded-full shadow-md hover:bg-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          {t('property:cinematicMap.controls.skip', 'Skip')}
        </button>
      )}

      {/* Replay, Shadow Timelapse, and Navigate buttons - show when complete */}
      {phase === 'complete' && (
        <>
          <button
            onClick={onReplay}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm text-neutral-700 font-medium rounded-full shadow-md hover:bg-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('property:cinematicMap.controls.replay', 'Replay')}
          </button>
          {showShadowTimelapseButton && onToggleShadowTimelapse && (
            <button
              onClick={onToggleShadowTimelapse}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-full shadow-md hover:shadow-lg transition-all"
            >
              <span className="text-sm">☀️</span>
              {t('property:shadowTimelapse.title', 'Shadow Time-Lapse')}
            </button>
          )}
          {onNavigateToMap && (
            <button
              onClick={onNavigateToMap}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-full shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              {t('property:cinematicMap.controls.exploreMap', 'Explore Map')}
            </button>
          )}
        </>
      )}

      {/* Show play button when idle and has played (replay state) */}
      {phase === 'idle' && hasPlayed && (
        <>
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm text-neutral-700 font-medium rounded-full shadow-md hover:bg-white transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {t('property:cinematicMap.controls.play', 'Fly to Property')}
          </button>
          {showShadowTimelapseButton && onToggleShadowTimelapse && (
            <button
              onClick={onToggleShadowTimelapse}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-full shadow-md hover:shadow-lg transition-all"
            >
              <span className="text-sm">☀️</span>
              {t('property:shadowTimelapse.title', 'Shadow Time-Lapse')}
            </button>
          )}
          {onNavigateToMap && (
            <button
              onClick={onNavigateToMap}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-full shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              {t('property:cinematicMap.controls.exploreMap', 'Explore Map')}
            </button>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Property marker with pulse animation
 */
const PropertyMarker: React.FC<{
  lat: number;
  lng: number;
  address: string;
  isVisible: boolean;
}> = ({ lat, lng, address, isVisible }) => {
  if (!isVisible) return null;

  // Custom pulsing marker icon
  const pulseIcon = L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div class="relative">
        <div class="absolute -inset-4 bg-blue-500/30 rounded-full animate-ping"></div>
        <div class="absolute -inset-2 bg-blue-500/50 rounded-full animate-pulse"></div>
        <div class="relative w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full border-2 border-white shadow-lg"></div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  return <Marker position={[lat, lng]} icon={pulseIcon} />;
};

/**
 * CinematicPropertyMap Component
 *
 * An immersive map component that provides a cinematic flythrough experience
 * when viewing a property's location. Features:
 * - Dramatic zoom out and pan animation
 * - Smooth zoom into property location
 * - Optional orbit around property
 * - Progress indicator
 * - Skip/replay controls
 *
 * @example
 * ```tsx
 * <CinematicPropertyMap
 *   lat={41.9981}
 *   lng={21.4254}
 *   address="123 Main Street, Skopje"
 *   onNavigateToMap={() => navigateToFullMap()}
 *   autoPlay={true}
 * />
 * ```
 */
const CinematicPropertyMap: React.FC<CinematicPropertyMapProps> = ({
  lat,
  lng,
  address,
  title,
  onNavigateToMap,
  autoPlay = false,
  height = '400px',
  enableShadowTimelapse = true,
}) => {
  const { t } = useTranslation(['property']);
  const [map, setMap] = useState<L.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showShadowTimelapse, setShowShadowTimelapse] = useState(false);
  const hasAutoPlayedRef = useRef(false);

  // Validate coordinates
  const isValidCoordinates = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  // Initialize flythrough hook
  const {
    phase,
    isAnimating,
    progress,
    startFlythrough,
    stopFlythrough,
    skipToEnd,
    replay,
    hasPlayed,
  } = useCinematicFlythrough(map, lat, lng, {
    startZoom: 6,
    endZoom: 17,
    zoomOutDuration: 1200,
    panDuration: 1800,
    zoomInDuration: 2200,
    enableOrbit: true,
    orbitDuration: 3000,
  });

  // Handle map ready
  const handleMapReady = useCallback((mapInstance: L.Map) => {
    setMap(mapInstance);
    setIsMapReady(true);
  }, []);

  // Auto-play on mount if enabled
  useEffect(() => {
    if (autoPlay && isMapReady && map && !hasAutoPlayedRef.current && phase === 'idle') {
      hasAutoPlayedRef.current = true;
      // Small delay to ensure map is fully rendered
      const timer = setTimeout(() => {
        startFlythrough();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, isMapReady, map, phase, startFlythrough]);

  // Show error state if coordinates are invalid
  if (!isValidCoordinates) {
    return (
      <div
        className="bg-neutral-100 rounded-xl flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center text-neutral-500">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="font-medium">{t('property:cinematicMap.errors.noLocation', 'Location data unavailable')}</p>
        </div>
      </div>
    );
  }

  // Calculate initial center (slightly offset for dramatic entry)
  const initialCenter: [number, number] = hasPlayed ? [lat, lng] : [lat + 2, lng + 2];
  const initialZoom = hasPlayed ? 17 : 6;

  // Show marker only when animation is complete or skipped
  const showMarker = phase === 'complete' || phase === 'idle';

  // Calculate 3D tilt transform based on current phase
  const tiltConfig = PHASE_TILT_CONFIG[phase];
  const mapTransformStyle = useMemo(() => ({
    transform: `perspective(1000px) rotateX(${tiltConfig.tilt}deg) scale(${tiltConfig.scale})`,
    transformOrigin: 'center bottom',
    transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
  }), [tiltConfig.tilt, tiltConfig.scale]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg" style={{ height, perspective: '1000px' }}>
      {/* Gradient overlay for cinematic effect */}
      {isAnimating && (
        <div className="absolute inset-0 pointer-events-none z-[999] bg-gradient-to-b from-black/20 via-transparent to-black/30" />
      )}

      {/* Horizon fade effect for 3D tilt - appears when tilted */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-[998] transition-all duration-800"
        style={{
          height: tiltConfig.tilt > 0 ? `${Math.min(tiltConfig.tilt * 2, 40)}%` : '0%',
          background: 'linear-gradient(to bottom, rgba(135, 206, 235, 0.6), rgba(135, 206, 235, 0.3) 40%, transparent)',
          opacity: tiltConfig.tilt > 0 ? 1 : 0,
          transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* 3D tilt container */}
      <div className="w-full h-full" style={mapTransformStyle}>
      {/* Map container */}
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={!isAnimating}
        dragging={!isAnimating}
        className="w-full h-full"
        preferCanvas={true}
        zoomControl={false}
        attributionControl={false}
      >
        <MapController lat={lat} lng={lng} onMapReady={handleMapReady} />

        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={MAP_TILE_LAYERS.voyager.url}
          maxZoom={21}
        />

        <PropertyMarker lat={lat} lng={lng} address={address} isVisible={showMarker} />
      </MapContainer>
      </div>

      {/* Phase indicator */}
      <PhaseIndicator phase={phase} progress={progress} />

      {/* Control buttons */}
      {!showShadowTimelapse && (
        <FlythroughControls
          phase={phase}
          hasPlayed={hasPlayed}
          onStart={startFlythrough}
          onSkip={skipToEnd}
          onReplay={replay}
          onNavigateToMap={onNavigateToMap}
          onToggleShadowTimelapse={() => setShowShadowTimelapse(true)}
          showShadowTimelapseButton={enableShadowTimelapse && (phase === 'complete' || (phase === 'idle' && hasPlayed))}
        />
      )}

      {/* Shadow Timelapse Panel */}
      {enableShadowTimelapse && (
        <ShadowTimelapsePanel
          latitude={lat}
          isVisible={showShadowTimelapse}
          onClose={() => setShowShadowTimelapse(false)}
        />
      )}

      {/* Address label */}
      {(phase === 'complete' || (phase === 'idle' && hasPlayed)) && (
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md max-w-[200px]">
            {title && <p className="font-semibold text-sm text-neutral-800 truncate">{title}</p>}
            <p className="text-xs text-neutral-600 truncate">{address}</p>
          </div>
        </div>
      )}

      {/* Inject pulse animation styles */}
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ping {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .custom-marker-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default CinematicPropertyMap;
