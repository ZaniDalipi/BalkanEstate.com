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

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => {
        if (map && map.getContainer()) {
          map.invalidateSize();
        }
      }, 0);
    });

    const mapContainer = map.getContainer();
    if (mapContainer) {
      resizeObserver.observe(mapContainer);
    }

    // Force a resize check shortly after the component mounts.
    // This helps fix layout issues where the map container size isn't computed correctly on initial render.
    const timer = setTimeout(() => {
      if (map && map.getContainer()) {
        map.invalidateSize();
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
        if (map && map.getContainer()) {
          map.invalidateSize();
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
      if (map && map.getContainer()) {
        map.invalidateSize();
      }
    }, 50); // A small delay to let layout settle
    return () => clearTimeout(timer);
  }, [map, searchMode]);

  useMapEvents({
    load: () => {
      // Initial load - call onMove immediately to set up initial bounds
      onMove(map.getBounds(), map.getCenter());

      // Force map to invalidate size and re-render layers after a short delay
      // This ensures markers render properly on first load
      setTimeout(() => {
        map.invalidateSize();
        // Trigger a moveend event to ensure everything updates
        map.fire('moveend');
      }, 150);
    },
    moveend: () => {
      onMove(map.getBounds(), map.getCenter());
    },
  });

  return null;
};

/**
 * ZoomBasedTileSwitch Component
 *
 * Automatically switches between street and satellite view based on zoom level.
 * Switches to satellite at zoom level 18+ for better detail.
 */
export const ZoomBasedTileSwitch: React.FC<{
  mapType: 'street' | 'satellite';
  setMapType: (type: 'street' | 'satellite') => void;
}> = ({ mapType, setMapType }) => {
  const map = useMap();

  useEffect(() => {
    const handleZoomEnd = () => {
      const currentZoom = map.getZoom();

      if (currentZoom >= 18) {
        // Switch to satellite view at maximum zoom
        if (mapType !== 'satellite') {
          setMapType('satellite');
        }
      } else {
        // Switch back to street view at lower zoom levels
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
