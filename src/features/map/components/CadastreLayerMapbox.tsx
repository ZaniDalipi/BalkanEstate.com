// CadastreLayerMapbox Component
// Renders WMS cadastral parcel layers on Mapbox GL map

import React, { useEffect, useState, useMemo } from 'react';
import { useMap, Source, Layer } from 'react-map-gl';
import { getCadastreLayerForLocation, CADASTRE_MIN_ZOOM, type CadastreLayerConfig } from '@/config/cadastreLayers';

interface CadastreLayerMapboxProps {
  enabled: boolean;
  opacity?: number;
  minZoom?: number;
}

/**
 * CadastreLayerMapbox Component
 *
 * Renders WMS cadastral parcel layers from various Balkan country cadastre agencies.
 * Uses Mapbox's raster source type to display WMS tiles.
 */
export const CadastreLayerMapbox: React.FC<CadastreLayerMapboxProps> = ({
  enabled,
  opacity = 1,
  minZoom = CADASTRE_MIN_ZOOM,
}) => {
  const { current: mapRef } = useMap();
  const [currentZoom, setCurrentZoom] = useState(7);
  const [currentLayer, setCurrentLayer] = useState<CadastreLayerConfig | undefined>(undefined);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 41.5, lng: 22 });

  // Update state on map move
  useEffect(() => {
    if (!mapRef) return;

    const updateState = () => {
      const map = mapRef.getMap();
      setCurrentZoom(map.getZoom());
      const center = map.getCenter();
      setMapCenter({ lat: center.lat, lng: center.lng });
    };

    const map = mapRef.getMap();
    updateState();

    map.on('moveend', updateState);
    map.on('zoomend', updateState);

    return () => {
      map.off('moveend', updateState);
      map.off('zoomend', updateState);
    };
  }, [mapRef]);

  // Update current cadastre layer based on map center
  useEffect(() => {
    const layer = getCadastreLayerForLocation(mapCenter.lat, mapCenter.lng);
    if (layer?.wmsUrl !== currentLayer?.wmsUrl || layer?.layers !== currentLayer?.layers) {
      setCurrentLayer(layer);
    }
  }, [mapCenter, currentLayer?.wmsUrl, currentLayer?.layers]);

  // Build WMS tile URL
  const tileUrl = useMemo(() => {
    if (!currentLayer) return null;

    const params = new URLSearchParams({
      service: 'WMS',
      request: 'GetMap',
      layers: currentLayer.layers,
      format: currentLayer.format || 'image/png',
      transparent: String(currentLayer.transparent !== false),
      version: currentLayer.version || '1.3.0',
      width: '256',
      height: '256',
      crs: 'EPSG:3857',
      bbox: '{bbox-epsg-3857}',
    });

    // Add any additional params
    if (currentLayer.additionalParams) {
      Object.entries(currentLayer.additionalParams).forEach(([key, value]) => {
        params.append(key, String(value));
      });
    }

    return `${currentLayer.wmsUrl}?${params.toString()}`;
  }, [currentLayer]);

  // Don't render if disabled, zoom too low, or no layer config
  if (!enabled || currentZoom < minZoom || !currentLayer || !tileUrl) {
    return null;
  }

  return (
    <Source
      id="cadastre-wms"
      type="raster"
      tiles={[tileUrl]}
      tileSize={256}
    >
      <Layer
        id="cadastre-layer"
        type="raster"
        paint={{
          'raster-opacity': opacity,
          'raster-resampling': 'linear'
        }}
      />
    </Source>
  );
};

export default CadastreLayerMapbox;
