// useCinematicFlythrough Hook
// Manages cinematic map flythrough animation state and logic

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Map as LeafletMap } from 'leaflet';

/**
 * Animation phase enum for type-safe state machine
 */
export type FlythroughPhase =
  | 'idle'
  | 'starting'
  | 'zooming_out'
  | 'panning'
  | 'zooming_in'
  | 'orbiting'
  | 'complete';

/**
 * Configuration for the flythrough animation
 */
export interface FlythroughConfig {
  /** Starting zoom level (country/region view) */
  startZoom: number;
  /** Final zoom level (property close-up) */
  endZoom: number;
  /** Duration for zoom out animation in ms */
  zoomOutDuration: number;
  /** Duration for pan animation in ms */
  panDuration: number;
  /** Duration for zoom in animation in ms */
  zoomInDuration: number;
  /** Whether to enable 3D orbit at the end */
  enableOrbit: boolean;
  /** Orbit animation duration in ms */
  orbitDuration: number;
}

/**
 * Default configuration for cinematic flythrough
 */
export const DEFAULT_FLYTHROUGH_CONFIG: FlythroughConfig = {
  startZoom: 5,
  endZoom: 17,
  zoomOutDuration: 1500,
  panDuration: 2000,
  zoomInDuration: 2500,
  enableOrbit: true,
  orbitDuration: 4000,
};

/**
 * Hook return type
 */
export interface UseCinematicFlythroughReturn {
  /** Current animation phase */
  phase: FlythroughPhase;
  /** Whether animation is currently running */
  isAnimating: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Start the flythrough animation */
  startFlythrough: () => void;
  /** Stop/reset the animation */
  stopFlythrough: () => void;
  /** Skip to the end state */
  skipToEnd: () => void;
  /** Replay the animation */
  replay: () => void;
  /** Has the animation been played at least once */
  hasPlayed: boolean;
}

/**
 * useCinematicFlythrough Hook
 *
 * Manages the state machine for a cinematic map flythrough animation.
 * The animation consists of phases:
 * 1. Zoom out to show region/country
 * 2. Pan to property location
 * 3. Zoom in dramatically to property
 * 4. (Optional) Orbit around the property
 *
 * @param map - Leaflet map instance
 * @param targetLat - Property latitude
 * @param targetLng - Property longitude
 * @param config - Animation configuration
 */
export function useCinematicFlythrough(
  map: LeafletMap | null,
  targetLat: number,
  targetLng: number,
  config: Partial<FlythroughConfig> = {}
): UseCinematicFlythroughReturn {
  const mergedConfig: FlythroughConfig = { ...DEFAULT_FLYTHROUGH_CONFIG, ...config };

  const [phase, setPhase] = useState<FlythroughPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbitAngleRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Calculate total animation duration
   */
  const getTotalDuration = useCallback(() => {
    const { zoomOutDuration, panDuration, zoomInDuration, enableOrbit, orbitDuration } = mergedConfig;
    return zoomOutDuration + panDuration + zoomInDuration + (enableOrbit ? orbitDuration : 0);
  }, [mergedConfig]);

  /**
   * Update progress based on elapsed time
   */
  const updateProgress = useCallback((elapsed: number) => {
    const total = getTotalDuration();
    const newProgress = Math.min((elapsed / total) * 100, 100);
    setProgress(newProgress);
  }, [getTotalDuration]);

  /**
   * Execute orbit animation (subtle rotation effect)
   */
  const executeOrbit = useCallback(() => {
    if (!map || !mergedConfig.enableOrbit) {
      setPhase('complete');
      return;
    }

    setPhase('orbiting');
    const startTime = performance.now();
    const duration = mergedConfig.orbitDuration;
    const orbitRadius = 0.001; // Small radius for subtle effect

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Eased orbit angle
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const angle = easeProgress * Math.PI * 2;

      // Calculate offset position
      const offsetLat = targetLat + Math.sin(angle) * orbitRadius;
      const offsetLng = targetLng + Math.cos(angle) * orbitRadius;

      try {
        map.setView([offsetLat, offsetLng], map.getZoom(), { animate: false });
      } catch {
        // Map might be destroyed
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Return to exact center
        try {
          map.setView([targetLat, targetLng], mergedConfig.endZoom, { animate: true, duration: 0.5 });
        } catch {
          // Map might be destroyed
        }
        setPhase('complete');
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [map, mergedConfig, targetLat, targetLng]);

  /**
   * Execute zoom in animation
   */
  const executeZoomIn = useCallback(() => {
    if (!map) return;

    setPhase('zooming_in');

    try {
      map.flyTo([targetLat, targetLng], mergedConfig.endZoom, {
        animate: true,
        duration: mergedConfig.zoomInDuration / 1000,
        easeLinearity: 0.1,
      });
    } catch {
      setPhase('complete');
      return;
    }

    timeoutRef.current = setTimeout(() => {
      if (mergedConfig.enableOrbit) {
        executeOrbit();
      } else {
        setPhase('complete');
      }
    }, mergedConfig.zoomInDuration);
  }, [map, mergedConfig, targetLat, targetLng, executeOrbit]);

  /**
   * Execute pan animation
   */
  const executePan = useCallback(() => {
    if (!map) return;

    setPhase('panning');

    try {
      map.flyTo([targetLat, targetLng], mergedConfig.startZoom + 2, {
        animate: true,
        duration: mergedConfig.panDuration / 1000,
        easeLinearity: 0.25,
      });
    } catch {
      setPhase('complete');
      return;
    }

    timeoutRef.current = setTimeout(() => {
      executeZoomIn();
    }, mergedConfig.panDuration);
  }, [map, mergedConfig, targetLat, targetLng, executeZoomIn]);

  /**
   * Execute zoom out animation
   */
  const executeZoomOut = useCallback(() => {
    if (!map) return;

    setPhase('zooming_out');

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    // Only zoom out if we're already zoomed in
    if (currentZoom > mergedConfig.startZoom + 3) {
      try {
        map.flyTo([currentCenter.lat, currentCenter.lng], mergedConfig.startZoom, {
          animate: true,
          duration: mergedConfig.zoomOutDuration / 1000,
          easeLinearity: 0.5,
        });
      } catch {
        executePan();
        return;
      }

      timeoutRef.current = setTimeout(() => {
        executePan();
      }, mergedConfig.zoomOutDuration);
    } else {
      // Skip zoom out if already zoomed out
      executePan();
    }
  }, [map, mergedConfig, executePan]);

  /**
   * Start the flythrough animation
   */
  const startFlythrough = useCallback(() => {
    if (!map || phase !== 'idle') return;

    setPhase('starting');
    setHasPlayed(true);
    startTimeRef.current = performance.now();

    // Small delay before starting
    timeoutRef.current = setTimeout(() => {
      executeZoomOut();

      // Progress tracking
      const trackProgress = () => {
        const elapsed = performance.now() - startTimeRef.current;
        updateProgress(elapsed);

        if ((phase as string) !== 'complete' && (phase as string) !== 'idle') {
          animationFrameRef.current = requestAnimationFrame(trackProgress);
        }
      };
      animationFrameRef.current = requestAnimationFrame(trackProgress);
    }, 300);
  }, [map, phase, executeZoomOut, updateProgress]);

  /**
   * Stop the animation and reset
   */
  const stopFlythrough = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setPhase('idle');
    setProgress(0);
  }, []);

  /**
   * Skip to the end state
   */
  const skipToEnd = useCallback(() => {
    stopFlythrough();

    if (map) {
      try {
        map.flyTo([targetLat, targetLng], mergedConfig.endZoom, {
          animate: true,
          duration: 0.8,
        });
      } catch {
        // Map might be destroyed
      }
    }

    setPhase('complete');
    setProgress(100);
    setHasPlayed(true);
  }, [map, mergedConfig.endZoom, targetLat, targetLng, stopFlythrough]);

  /**
   * Replay the animation
   */
  const replay = useCallback(() => {
    stopFlythrough();

    // Reset to initial state then start
    if (map) {
      try {
        const bounds = map.getBounds();
        const center = bounds.getCenter();
        map.setView([center.lat, center.lng], mergedConfig.startZoom, { animate: false });
      } catch {
        // Map might be destroyed
      }
    }

    // Small delay before replay
    timeoutRef.current = setTimeout(() => {
      setPhase('idle');
      setProgress(0);
      startFlythrough();
    }, 100);
  }, [map, mergedConfig.startZoom, stopFlythrough, startFlythrough]);

  const isAnimating = phase !== 'idle' && phase !== 'complete';

  return {
    phase,
    isAnimating,
    progress,
    startFlythrough,
    stopFlythrough,
    skipToEnd,
    replay,
    hasPlayed,
  };
}

export default useCinematicFlythrough;
