/**
 * useMapLayers - Handles cadastre and climate overlay layers
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { getCadastreLayerForLocation, CADASTRE_MIN_ZOOM } from '@/config/cadastreLayers';

type ClimateRiskType = 'none' | 'flood' | 'fire' | 'wind' | 'air' | 'heat';

interface UseMapLayersProps {
  map: google.maps.Map | null;
  isLoaded: boolean;
}

export const useMapLayers = ({ map, isLoaded }: UseMapLayersProps) => {
  const [showCadastre, setShowCadastre] = useState(false);
  const [selectedClimateRisk, setSelectedClimateRisk] = useState<ClimateRiskType>('none');

  const cadastreLayerRef = useRef<google.maps.ImageMapType | null>(null);
  const climateLayerRef = useRef<google.maps.ImageMapType | null>(null);
  const lastCadastreZoomRef = useRef<number | null>(null);

  // Cadastre layer effect
  useEffect(() => {
    if (!map || !isLoaded) return;

    const removeCadastreLayer = () => {
      if (cadastreLayerRef.current) {
        const overlays = map.overlayMapTypes;
        for (let i = overlays.getLength() - 1; i >= 0; i--) {
          if (overlays.getAt(i) === cadastreLayerRef.current) {
            overlays.removeAt(i);
          }
        }
        cadastreLayerRef.current = null;
      }
    };

    removeCadastreLayer();

    if (!showCadastre) {
      lastCadastreZoomRef.current = null;
      return;
    }

    const mapCenter = map.getCenter();
    if (!mapCenter) return;

    const cadastreConfig = getCadastreLayerForLocation(mapCenter.lat(), mapCenter.lng());
    if (!cadastreConfig) return;

    lastCadastreZoomRef.current = map.getZoom() || null;

    const latLngToMercator = (lat: number, lng: number): { x: number; y: number } => {
      const x = lng * 20037508.34 / 180;
      let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
      y = y * 20037508.34 / 180;
      return { x, y };
    };

    const TILE_SIZE = 256;
    const REQUEST_SIZE = 512;

    const createWmsLayer = () => {
      return new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          const minZoom = Math.max(cadastreConfig.minZoom || CADASTRE_MIN_ZOOM, 17);
          if (zoom < minZoom) return '';

          const proj = map.getProjection();
          if (!proj) return '';

          const zfactor = Math.pow(2, zoom);
          const topLeft = new google.maps.Point(
            (coord.x * TILE_SIZE) / zfactor,
            (coord.y * TILE_SIZE) / zfactor
          );
          const bottomRight = new google.maps.Point(
            ((coord.x + 1) * TILE_SIZE) / zfactor,
            ((coord.y + 1) * TILE_SIZE) / zfactor
          );

          const sw = proj.fromPointToLatLng(new google.maps.Point(topLeft.x, bottomRight.y));
          const ne = proj.fromPointToLatLng(new google.maps.Point(bottomRight.x, topLeft.y));

          if (!sw || !ne) return '';

          let bbox: string;
          const crs = cadastreConfig.additionalParams?.CRS || 'EPSG:4326';

          if (crs === 'EPSG:3857') {
            const swMerc = latLngToMercator(sw.lat(), sw.lng());
            const neMerc = latLngToMercator(ne.lat(), ne.lng());
            bbox = `${swMerc.x},${swMerc.y},${neMerc.x},${neMerc.y}`;
          } else {
            bbox = `${sw.lat()},${sw.lng()},${ne.lat()},${ne.lng()}`;
          }

          const params = new URLSearchParams({
            SERVICE: 'WMS',
            VERSION: cadastreConfig.version || '1.3.0',
            REQUEST: 'GetMap',
            LAYERS: cadastreConfig.layers,
            STYLES: '',
            FORMAT: cadastreConfig.format || 'image/png',
            TRANSPARENT: 'true',
            WIDTH: String(REQUEST_SIZE),
            HEIGHT: String(REQUEST_SIZE),
            CRS: crs,
            BBOX: bbox,
          });

          return `${cadastreConfig.wmsUrl}?${params.toString()}`;
        },
        tileSize: new google.maps.Size(TILE_SIZE, TILE_SIZE),
        opacity: 0.55,
        name: 'Cadastre',
      });
    };

    const wmsLayer = createWmsLayer();
    map.overlayMapTypes.push(wmsLayer);
    cadastreLayerRef.current = wmsLayer;

    const handleZoomChange = () => {
      const newZoom = map.getZoom();
      if (newZoom !== undefined && lastCadastreZoomRef.current !== newZoom) {
        lastCadastreZoomRef.current = newZoom;
        removeCadastreLayer();
        requestAnimationFrame(() => {
          if (showCadastre) {
            const newLayer = createWmsLayer();
            map.overlayMapTypes.push(newLayer);
            cadastreLayerRef.current = newLayer;
          }
        });
      }
    };

    const handleIdle = () => {
      const newCenter = map.getCenter();
      if (!newCenter) return;
      const newConfig = getCadastreLayerForLocation(newCenter.lat(), newCenter.lng());
      if (newConfig?.countryCode !== cadastreConfig.countryCode) {
        setShowCadastre(false);
        setTimeout(() => setShowCadastre(true), 100);
      }
    };

    const zoomListener = map.addListener('zoom_changed', handleZoomChange);
    const idleListener = map.addListener('idle', handleIdle);

    return () => {
      google.maps.event.removeListener(zoomListener);
      google.maps.event.removeListener(idleListener);
      removeCadastreLayer();
    };
  }, [map, isLoaded, showCadastre]);

  // Climate risk layer effect
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (climateLayerRef.current) {
      map.overlayMapTypes.forEach((overlay, index) => {
        if (overlay === climateLayerRef.current) {
          map.overlayMapTypes.removeAt(index);
        }
      });
      climateLayerRef.current = null;
    }

    if (selectedClimateRisk === 'none') return;

    // Climate risk layer configuration would go here
    // This is a placeholder for actual climate data integration

  }, [map, isLoaded, selectedClimateRisk]);

  const toggleCadastre = useCallback(() => {
    setShowCadastre(prev => !prev);
  }, []);

  const setClimateRisk = useCallback((risk: ClimateRiskType) => {
    setSelectedClimateRisk(risk);
  }, []);

  return {
    showCadastre,
    setShowCadastre,
    toggleCadastre,
    selectedClimateRisk,
    setClimateRisk,
  };
};
