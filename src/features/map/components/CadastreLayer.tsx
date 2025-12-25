import React, { useEffect, useState, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getCadastreLayerForLocation, CADASTRE_MIN_ZOOM, type CadastreLayerConfig } from '../../config/cadastreLayers';

interface CadastreLayerProps {
  /**
   * Whether cadastre layers are enabled/visible
   */
  enabled: boolean;

  /**
   * Opacity of the cadastre layer (0-1)
   */
  opacity?: number;

  /**
   * Override the minimum zoom level
   */
  minZoom?: number;
}

/**
 * CadastreLayer Component
 *
 * Renders WMS cadastral parcel layers from various Balkan country cadastre agencies.
 * Uses native Leaflet WMS layer to avoid CRS issues with react-leaflet's WMSTileLayer.
 */
export const CadastreLayer: React.FC<CadastreLayerProps> = ({
  enabled,
  opacity = 1,
  minZoom = CADASTRE_MIN_ZOOM,
}) => {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());
  const [currentLayer, setCurrentLayer] = useState<CadastreLayerConfig | undefined>(undefined);
  const [isMapReady, setIsMapReady] = useState(false);
  const tileLayerRef = useRef<L.TileLayer.WMS | null>(null);

  // Track map events to update layer visibility
  useMapEvents({
    zoomend: () => {
      setCurrentZoom(map.getZoom());
    },
    moveend: () => {
      updateCurrentLayer();
    },
    load: () => {
      setIsMapReady(true);
    }
  });

  // Update the current cadastre layer based on map center
  const updateCurrentLayer = () => {
    const center = map.getCenter();
    const layer = getCadastreLayerForLocation(center.lat, center.lng);
    
    // Only update if layer changed
    if (layer?.wmsUrl !== currentLayer?.wmsUrl || layer?.layers !== currentLayer?.layers) {
      setCurrentLayer(layer);
    }
  };

  // Initialize current layer on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMapReady(true);
      updateCurrentLayer();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Effect to manage WMS layer
  useEffect(() => {
    if (!isMapReady || !map) return;

    // Remove existing layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    // Don't add layer if disabled or zoom is too low or no layer config
    if (!enabled || currentZoom < minZoom || !currentLayer) {
      return;
    }

    try {
      // Build WMS parameters with white text styling
      const wmsParams: Record<string, any> = {
        layers: currentLayer.layers,
        format: currentLayer.format || 'image/png',
        transparent: currentLayer.transparent !== false,
        version: currentLayer.version || '1.3.0',
        // Try various parameters for white text
        styles: 'default',
        color: '0xFFFFFF',
        textColor: '0xFFFFFF',
        fontColor: '0xFFFFFF',
        ...currentLayer.additionalParams,
      };

      // Create native Leaflet WMS layer
      const tileLayer = L.tileLayer.wms(currentLayer.wmsUrl, {
        ...wmsParams,
        opacity: opacity,
        attribution: currentLayer.attribution,
        maxZoom: currentLayer.maxZoom,
        minZoom: currentLayer.minZoom,
      });

      // Add CSS filter for white text (fallback method)
      tileLayer.on('tileload', function(e: any) {
        const img = e.tile as HTMLImageElement;
        if (img && img.complete) {
          img.style.filter = 'invert(1) hue-rotate(180deg) brightness(1.2) contrast(1.1)';
        }
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

    } catch (error) {
      console.warn('Failed to create WMS layer:', error);
    }

    // Cleanup function
    return () => {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
    };
  }, [enabled, opacity, currentZoom, minZoom, currentLayer, isMapReady, map]);

  // This component doesn't render anything directly
  return null;
};

export default CadastreLayer;