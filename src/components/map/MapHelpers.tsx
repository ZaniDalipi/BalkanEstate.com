// MapHelpers
// Helper components for map behavior and interactions

import React, { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

/**
 * FlyToController Component
 *
 * Handles flying the map to a specific location with smooth animation.
 * Calls onComplete callback when animation finishes.
 */
export const FlyToController: React.FC<{
  target: { center: [number, number]; zoom: number } | null;
  onComplete: () => void;
}> = ({ target, onComplete }) => {
  const map = useMap();

  useEffect(() => {
    if (target) {
      const onMoveEnd = () => {
        onComplete();
        map.off('moveend', onMoveEnd);
      };
      map.on('moveend', onMoveEnd);
      map.flyTo(target.center, target.zoom, {
        animate: true,
        duration: 2.5,
      });
    }
  }, [target, map, onComplete]);

  return null;
};

/**
 * MapEvents Component
 *
 * Handles map resize and movement events.
 * - Observes container size changes
 * - Invalidates map size on layout shifts
 * - Calls onMove when map bounds change
 */
export const MapEvents: React.FC<{
  onMove: (bounds: L.LatLngBounds, center: L.LatLng) => void;
  mapBounds: L.LatLngBounds | null;
  searchMode: 'manual' | 'ai';
}> = ({ onMove, mapBounds, searchMode }) => {
  const map = useMap();
  const hasInitialized = useRef(false);

  // Ensure bounds are set on initial mount - don't rely solely on 'load' event
  useEffect(() => {
    if (!hasInitialized.current && map) {
      // Set initial bounds after map is fully ready
      const timer = setTimeout(() => {
        try {
          const container = map.getContainer();
          if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
            map.invalidateSize();
            const bounds = map.getBounds();
            const center = map.getCenter();
            if (bounds && center) {
              onMove(bounds, center);
              hasInitialized.current = true;
            }
          }
        } catch (e) {
          // Map not ready yet, will be handled by load event
          console.debug('Map initialization deferred:', e);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [map, onMove]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => {
        try {
          if (map && map.getContainer()) {
            map.invalidateSize();
          }
        } catch (e) {
          // Map not fully initialized yet, ignore
        }
      }, 0);
    });

    let mapContainer: HTMLElement | null = null;
    try {
      mapContainer = map.getContainer();
      if (mapContainer) {
        resizeObserver.observe(mapContainer);
      }
    } catch (e) {
      // Map not ready yet
    }

    // Force a resize check shortly after the component mounts.
    // This helps fix layout issues where the map container size isn't computed correctly on initial render.
    const timer = setTimeout(() => {
      try {
        if (map && map.getContainer()) {
          map.invalidateSize();
        }
      } catch (e) {
        // Map not ready yet, ignore
      }
    }, 100);

    return () => {
      if (mapContainer) {
        resizeObserver.unobserve(mapContainer);
      }
      clearTimeout(timer);
    };
  }, [map]);

  useEffect(() => {
    if (mapBounds) {
      // This effect runs when the mapBounds prop changes. This happens after the parent
      // SearchPage component updates its state from the map's 'moveend' event.
      // By calling invalidateSize() in a timeout, we ensure the map re-checks its
      // container size *after* the React render cycle completes, fixing any
      // layout shifts that might occur from other components updating (like the property count).
      const timer = setTimeout(() => {
        try {
          if (map && map.getContainer()) {
            map.invalidateSize();
          }
        } catch (e) {
          // Map not ready yet, ignore
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [map, mapBounds]);

  useEffect(() => {
    // When the search mode changes (e.g., from manual to AI), the left panel's content
    // might change, causing a layout shift. We need to tell the map to re-check
    // its container size to fill the space correctly.
    const timer = setTimeout(() => {
      try {
        if (map && map.getContainer()) {
          map.invalidateSize();
        }
      } catch (e) {
        // Map not ready yet, ignore
      }
    }, 50); // A small delay to let layout settle
    return () => clearTimeout(timer);
  }, [map, searchMode]);

  useMapEvents({
    load: () => {
      // Initial load - call onMove after ensuring map is ready
      try {
        const bounds = map.getBounds();
        const center = map.getCenter();
        if (bounds && center) {
          onMove(bounds, center);
        }
      } catch (e) {
        console.debug('Map load event - bounds not ready:', e);
      }

      // Force map to invalidate size and re-render layers after a short delay
      // This ensures markers render properly on first load
      setTimeout(() => {
        try {
          if (map.getContainer()) {
            map.invalidateSize();
            // Trigger a moveend event to ensure everything updates
            map.fire('moveend');
          }
        } catch (e) {
          console.debug('Map invalidateSize deferred:', e);
        }
      }, 150);
    },
    moveend: () => {
      try {
        const bounds = map.getBounds();
        const center = map.getCenter();
        if (bounds && center) {
          onMove(bounds, center);
        }
      } catch (e) {
        console.debug('Map moveend - bounds not ready:', e);
      }
    },
  });

  return null;
};

/**
 * ZoomBasedTileSwitch Component
 *
 * Smart tile switching for maximum zoom capability:
 * - At zoom 18+: switches to satellite for better aerial detail
 * - At zoom 20+: switches to street (Google) which supports up to zoom 21
 * - Below zoom 18: switches to street for better road/label visibility
 * Night mode is excluded from auto-switching.
 */
export const ZoomBasedTileSwitch: React.FC<{
  mapType: 'street' | 'satellite' | 'night';
  setMapType: (type: 'street' | 'satellite' | 'night') => void;
}> = ({ mapType, setMapType }) => {
  const map = useMap();

  useEffect(() => {
    const handleZoomEnd = () => {
      // Don't auto-switch when in night mode - let user control it
      if (mapType === 'night') return;

      const currentZoom = map.getZoom();

      // At very high zoom (20+), use street view which supports up to 21
      // (Satellite/ESRI only goes to 19)
      if (currentZoom >= 20) {
        if (mapType !== 'street') {
          setMapType('street');
        }
      }
      // At medium-high zoom (18-19), use satellite for aerial imagery
      else if (currentZoom >= 18) {
        if (mapType !== 'satellite') {
          setMapType('satellite');
        }
      }
      // At lower zoom, use street view for better labels/roads
      else {
        if (mapType !== 'street') {
          setMapType('street');
        }
      }
    };

    map.on('zoomend', handleZoomEnd);

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, mapType, setMapType]);

  return null;
};

/**
 * ZoomBased3DBuildings Component
 *
 * Automatically enables 3D buildings when zoomed in past level 19
 * (when standard map tiles no longer show useful detail).
 * Disables when zooming out below level 18.
 * Uses hysteresis to prevent rapid toggling at threshold.
 */
export const ZoomBased3DBuildings: React.FC<{
  show3DBuildings: boolean;
  setShow3DBuildings: (show: boolean) => void;
}> = ({ show3DBuildings, setShow3DBuildings }) => {
  const map = useMap();
  // Track if user manually disabled 3D at high zoom - don't auto-enable until they zoom out
  const userDisabledAtHighZoom = React.useRef(false);
  const prevShow3DBuildings = React.useRef(show3DBuildings);

  useEffect(() => {
    // Detect manual toggle by user (not triggered by zoom)
    const currentZoom = map.getZoom();
    if (prevShow3DBuildings.current && !show3DBuildings && currentZoom >= 18) {
      // User manually turned off 3D at high zoom
      userDisabledAtHighZoom.current = true;
    } else if (show3DBuildings && !prevShow3DBuildings.current) {
      // User manually turned on 3D - reset the override
      userDisabledAtHighZoom.current = false;
    }
    prevShow3DBuildings.current = show3DBuildings;
  }, [show3DBuildings, map]);

  useEffect(() => {
    const handleZoomEnd = () => {
      const currentZoom = map.getZoom();

      // Reset user override when zooming out below threshold
      if (currentZoom < 17) {
        userDisabledAtHighZoom.current = false;
      }

      // Enable 3D buildings at zoom 19+ (only if user hasn't manually disabled)
      if (currentZoom >= 19 && !show3DBuildings && !userDisabledAtHighZoom.current) {
        setShow3DBuildings(true);
      }
      // Disable 3D buildings below zoom 18 (hysteresis to prevent rapid toggling)
      else if (currentZoom < 18 && show3DBuildings) {
        setShow3DBuildings(false);
        userDisabledAtHighZoom.current = false;
      }
    };

    // Check initial zoom level
    handleZoomEnd();

    map.on('zoomend', handleZoomEnd);

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, show3DBuildings, setShow3DBuildings]);

  return null;
};

/**
 * MapDrawEvents Component
 *
 * Handles rectangle drawing on the map for area selection.
 * - Enables drawing mode (crosshair cursor, disabled panning)
 * - Handles mouse/touch events for drawing
 * - Calls onDrawComplete with drawn bounds
 */
export const MapDrawEvents: React.FC<{
  isDrawing: boolean;
  onDrawComplete: (bounds: L.LatLngBounds | null) => void;
}> = ({ isDrawing, onDrawComplete }) => {
  const map = useMap();

  // Use refs for everything that changes or is part of the drag state
  const tempRectRef = useRef<L.Rectangle | null>(null);
  const startPosRef = useRef<L.LatLng | null>(null);
  const isDraggingRef = useRef(false);

  // Keep a ref to the latest props to avoid stale closures in event handlers
  const propsRef = useRef({ isDrawing, onDrawComplete });
  useEffect(() => {
    propsRef.current.isDrawing = isDrawing;
    propsRef.current.onDrawComplete = onDrawComplete;
  }, [isDrawing, onDrawComplete]);

  // Effect to manage map state (dragging, cursor) based on the isDrawing prop.
  useEffect(() => {
    const container = map.getContainer();
    if (propsRef.current.isDrawing) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      container.style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      container.style.cursor = '';
      // If drawing is cancelled from outside while dragging, abort the drag.
      if (isDraggingRef.current) {
        // This triggers the 'up' logic to clean up listeners and state
        window.dispatchEvent(new Event('mouseup'));
      }
    }
  }, [isDrawing, map]);

  // This main effect runs only ONCE to attach the listeners.
  useEffect(() => {
    const mapContainer = map.getContainer();

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current || !startPosRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // FIX: Calculation needs to be relative to the map container, not the viewport
      const rect = mapContainer.getBoundingClientRect();
      const point = map.containerPointToLayerPoint(
        L.point(clientX - rect.left, clientY - rect.top)
      );
      const currentPos = map.layerPointToLatLng(point);

      if (!tempRectRef.current) {
        tempRectRef.current = L.rectangle(
          L.latLngBounds(startPosRef.current, currentPos),
          {
            color: '#0252CD',
            weight: 2,
            dashArray: '5, 5',
            fillOpacity: 0.1,
          }
        ).addTo(map);
      } else {
        tempRectRef.current.setBounds(L.latLngBounds(startPosRef.current, currentPos));
      }
    };

    const handleUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      // Cleanup window listeners immediately
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);

      if (tempRectRef.current) {
        const bounds = tempRectRef.current.getBounds();
        map.removeLayer(tempRectRef.current); // Cleanup temp rectangle
        tempRectRef.current = null;

        // Use the ref'd prop to call the latest callback
        if (!bounds.getSouthWest().equals(bounds.getNorthEast())) {
          propsRef.current.onDrawComplete(bounds);
        } else {
          propsRef.current.onDrawComplete(null);
        }
      } else {
        propsRef.current.onDrawComplete(null);
      }
    };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      // Check the ref'd prop to see if we should start drawing
      if (
        !propsRef.current.isDrawing ||
        isDraggingRef.current ||
        ('button' in e && e.button !== 0)
      ) {
        return;
      }
      e.preventDefault();

      isDraggingRef.current = true;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // FIX: Calculation needs to be relative to the map container, not the viewport
      const rect = mapContainer.getBoundingClientRect();
      const point = map.containerPointToLayerPoint(
        L.point(clientX - rect.left, clientY - rect.top)
      );
      startPosRef.current = map.layerPointToLatLng(point);

      // Attach listeners to window for dragging outside the map
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    };

    // Attach the start listeners to the map container
    mapContainer.addEventListener('mousedown', handleStart);
    mapContainer.addEventListener('touchstart', handleStart, { passive: false });

    return () => {
      // Cleanup listeners when component unmounts
      mapContainer.removeEventListener('mousedown', handleStart);
      mapContainer.removeEventListener('touchstart', handleStart);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [map]); // This effect depends only on `map`, so it runs once.

  return null;
};
