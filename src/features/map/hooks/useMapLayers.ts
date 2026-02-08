/**
 * useMapLayers - Handles cadastre and climate overlay layers
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { getCadastreLayerForLocation, CADASTRE_MIN_ZOOM } from '@/config/cadastreLayers';
import { useRainViewer } from './useRainViewer';
import { latLngToWebMercator } from '../components/googleMapConstants';

type ClimateRiskType = 'none' | 'flood' | 'fire' | 'wind' | 'air' | 'heat';

interface UseMapLayersProps {
  map: google.maps.Map | null;
  isLoaded: boolean;
}

export const useMapLayers = ({ map, isLoaded }: UseMapLayersProps) => {
  const [showCadastre, setShowCadastre] = useState(false);
  const [selectedClimateRisk, setSelectedClimateRisk] = useState<ClimateRiskType>('none');

  // RainViewer precipitation radar (free, no API key) - for flood layer
  const { tileUrl: rainViewerTileUrl } = useRainViewer(selectedClimateRisk === 'flood');

  const cadastreLayerRef = useRef<google.maps.ImageMapType | null>(null);
  const climateLayerRef = useRef<google.maps.ImageMapType | null>(null);
  const lastCadastreZoomRef = useRef<number | null>(null);
  const cadastreInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const cadastreClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

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

    const removeClickListener = () => {
      if (cadastreClickListenerRef.current) {
        google.maps.event.removeListener(cadastreClickListenerRef.current);
        cadastreClickListenerRef.current = null;
      }
      if (cadastreInfoWindowRef.current) {
        cadastreInfoWindowRef.current.close();
      }
    };

    removeCadastreLayer();
    removeClickListener();

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
    const REQUEST_SIZE = 256;

    const getCrs = () => cadastreConfig.additionalParams?.CRS || 'EPSG:4326';

    const computeBbox = (sw: google.maps.LatLng, ne: google.maps.LatLng) => {
      const crs = getCrs();
      if (crs === 'EPSG:3857') {
        const swMerc = latLngToMercator(sw.lat(), sw.lng());
        const neMerc = latLngToMercator(ne.lat(), ne.lng());
        return `${swMerc.x},${swMerc.y},${neMerc.x},${neMerc.y}`;
      }
      return `${sw.lat()},${sw.lng()},${ne.lat()},${ne.lng()}`;
    };

    const createWmsLayer = () => {
      return new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          const minZoom = cadastreConfig.minZoom || CADASTRE_MIN_ZOOM;
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
            CRS: getCrs(),
            BBOX: computeBbox(sw, ne),
          });

          return `${cadastreConfig.wmsUrl}?${params.toString()}`;
        },
        tileSize: new google.maps.Size(TILE_SIZE, TILE_SIZE),
        opacity: 0.7,
        name: 'Cadastre',
      });
    };

    const wmsLayer = createWmsLayer();
    map.overlayMapTypes.push(wmsLayer);
    cadastreLayerRef.current = wmsLayer;

    // Click handler - WMS GetFeatureInfo
    if (!cadastreInfoWindowRef.current) {
      cadastreInfoWindowRef.current = new google.maps.InfoWindow();
    }
    const infoWindow = cadastreInfoWindowRef.current;

    const handleCadastreClick = async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const zoom = map.getZoom();
      const minZoom = cadastreConfig.minZoom || CADASTRE_MIN_ZOOM;
      if (!zoom || zoom < minZoom) return;

      const mapDiv = map.getDiv();
      const mapWidth = mapDiv.offsetWidth;
      const mapHeight = mapDiv.offsetHeight;
      const bounds = map.getBounds();
      if (!bounds) return;

      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      if (!sw || !ne) return;

      const lngRange = ne.lng() - sw.lng();
      const latRange = ne.lat() - sw.lat();
      const i = Math.round(((e.latLng.lng() - sw.lng()) / lngRange) * mapWidth);
      const j = Math.round(((ne.lat() - e.latLng.lat()) / latRange) * mapHeight);

      const crs = getCrs();
      const bbox = computeBbox(sw, ne);

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: cadastreConfig.version || '1.3.0',
        REQUEST: 'GetFeatureInfo',
        LAYERS: cadastreConfig.layers,
        QUERY_LAYERS: cadastreConfig.layers,
        INFO_FORMAT: 'application/json',
        FEATURE_COUNT: '1',
        I: String(i),
        J: String(j),
        WIDTH: String(mapWidth),
        HEIGHT: String(mapHeight),
        CRS: crs,
        BBOX: bbox,
      });

      infoWindow.setContent('<div style="padding:8px;font-family:system-ui,sans-serif;font-size:13px;color:#666;">Loading parcel info...</div>');
      infoWindow.setPosition(e.latLng);
      infoWindow.open(map);

      try {
        // Use backend proxy to avoid CORS issues with government WMS servers
        const wmsUrl = `${cadastreConfig.wmsUrl}?${params.toString()}`;
        const proxyUrl = `/api/cadastre/feature-info?url=${encodeURIComponent(wmsUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentType = response.headers.get('content-type') || '';
        let features: any[] = [];

        if (contentType.includes('json')) {
          const data = await response.json();
          features = data.features || [];
        } else {
          const text = await response.text();
          if (!text.includes('numberReturned="0"')) {
            const idMatch = text.match(/(?:nationalCadastralReference|inspireId|gml:id|PARCEL_ID|fid)(?:>|=")([^<"]+)/);
            const areaMatch = text.match(/(?:areaValue|area|AREA|surface)>([^<]+)/);
            const labelMatch = text.match(/(?:label|LABEL|name|NAME)>([^<]+)/);
            const municMatch = text.match(/(?:administrativeUnit|municipality|MUNICIPALITY|KO_NAME)>([^<]+)/);
            if (idMatch || areaMatch) {
              features = [{
                properties: {
                  ...(idMatch ? { id: idMatch[1] } : {}),
                  ...(areaMatch ? { area: areaMatch[1] } : {}),
                  ...(labelMatch ? { label: labelMatch[1] } : {}),
                  ...(municMatch ? { municipality: municMatch[1] } : {}),
                }
              }];
            }
          }
        }

        if (features.length > 0) {
          const props = features[0].properties || {};
          const parcelId = props.nationalCadastralReference || props.inspireId || props.id || props.ID || props.gml_id || props.PARCEL_ID || props.parcel_id || props.fid || '';
          const area = props.areaValue || props.area || props.AREA || props.Area || props.surface || props.SURFACE || '';
          const label = props.label || props.LABEL || props.name || props.NAME || '';
          const municipality = props.administrativeUnit || props.municipality || props.MUNICIPALITY || props.KO_NAME || props.cadastralZoning || '';

          const areaStr = area ? `${Number(area).toLocaleString()} m²` : '';
          const rows = [
            parcelId && `<tr><td style="color:#888;padding:2px 8px 2px 0;white-space:nowrap;">Parcel ID</td><td style="font-weight:600;">${parcelId}</td></tr>`,
            areaStr && `<tr><td style="color:#888;padding:2px 8px 2px 0;white-space:nowrap;">Area</td><td style="font-weight:600;">${areaStr}</td></tr>`,
            label && `<tr><td style="color:#888;padding:2px 8px 2px 0;white-space:nowrap;">Label</td><td style="font-weight:600;">${label}</td></tr>`,
            municipality && `<tr><td style="color:#888;padding:2px 8px 2px 0;white-space:nowrap;">Municipality</td><td style="font-weight:600;">${municipality}</td></tr>`,
          ].filter(Boolean);

          const shownKeys = new Set(['nationalCadastralReference', 'inspireId', 'id', 'ID', 'gml_id', 'PARCEL_ID', 'parcel_id', 'fid', 'areaValue', 'area', 'AREA', 'Area', 'surface', 'SURFACE', 'label', 'LABEL', 'name', 'NAME', 'administrativeUnit', 'municipality', 'MUNICIPALITY', 'KO_NAME', 'cadastralZoning', 'bbox', 'geometry']);
          const extraRows = Object.entries(props)
            .filter(([key]) => !shownKeys.has(key))
            .slice(0, 6)
            .map(([key, val]) => `<tr><td style="color:#888;padding:2px 8px 2px 0;white-space:nowrap;text-transform:capitalize;">${key.replace(/_/g, ' ')}</td><td style="font-weight:600;">${val}</td></tr>`);

          const html = `
            <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;min-width:200px;">
              <div style="font-weight:700;font-size:15px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #e5720e;color:#333;">
                Cadastre Parcel
              </div>
              ${[...rows, ...extraRows].length > 0 ? `<table style="border-collapse:collapse;">${[...rows, ...extraRows].join('')}</table>` : '<div style="color:#888;">No details available for this location</div>'}
              <div style="margin-top:8px;font-size:11px;color:#999;">${cadastreConfig.attribution}</div>
            </div>`;
          infoWindow.setContent(html);
        } else {
          infoWindow.setContent('<div style="padding:8px;font-family:system-ui,sans-serif;font-size:13px;color:#888;">No parcel found at this location</div>');
        }
      } catch {
        infoWindow.setContent('<div style="padding:8px;font-family:system-ui,sans-serif;font-size:13px;color:#888;">Could not load parcel info</div>');
      }
    };

    cadastreClickListenerRef.current = map.addListener('click', handleCadastreClick);

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
      removeClickListener();
      removeCadastreLayer();
    };
  }, [map, isLoaded, showCadastre]);

  // Climate risk layer effect
  // Sources: RainViewer (flood), NASA FIRMS (fire), OWM (wind/heat), AQICN (air)
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

    const owmKey = import.meta.env.VITE_OWM_API_KEY || '';
    let tileUrl: string | null = null;
    let layerOpacity = 0.6;
    let layerName = '';
    let isWms = false;

    switch (selectedClimateRisk) {
      case 'flood':
        tileUrl = rainViewerTileUrl;
        layerOpacity = 0.7;
        layerName = 'Precipitation Radar (RainViewer)';
        break;
      case 'fire':
        isWms = true;
        layerOpacity = 0.7;
        layerName = 'Fire Danger (EFFIS Copernicus)';
        break;
      case 'wind':
        if (owmKey) tileUrl = `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${owmKey}`;
        layerOpacity = 0.5;
        layerName = 'Wind Speed (OWM)';
        break;
      case 'air':
        tileUrl = 'https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png';
        layerOpacity = 0.6;
        layerName = 'Air Quality (AQICN)';
        break;
      case 'heat':
        if (owmKey) tileUrl = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${owmKey}`;
        layerOpacity = 0.5;
        layerName = 'Temperature (OWM)';
        break;
    }

    if (!tileUrl && !isWms) return;

    let climateLayer: google.maps.ImageMapType;

    if (isWms) {
      climateLayer = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          const proj = map.getProjection();
          if (!proj) return '';

          const tileSize = 256;
          const scale = Math.pow(2, zoom);
          const sw = proj.fromPointToLatLng(new google.maps.Point(
            (coord.x * tileSize) / scale,
            ((coord.y + 1) * tileSize) / scale
          ));
          const ne = proj.fromPointToLatLng(new google.maps.Point(
            ((coord.x + 1) * tileSize) / scale,
            (coord.y * tileSize) / scale
          ));
          if (!sw || !ne) return '';

          const swMerc = latLngToWebMercator(sw.lat(), sw.lng());
          const neMerc = latLngToWebMercator(ne.lat(), ne.lng());
          const bbox = `${swMerc.x},${swMerc.y},${neMerc.x},${neMerc.y}`;

          const firmsKey = import.meta.env.VITE_FIRMS_MAP_KEY || '';
          if (firmsKey) {
            return `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${firmsKey}/?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=fires_viirs_24&STYLES=&FORMAT=image/png&TRANSPARENT=true&SRS=EPSG:3857&BBOX=${bbox}&WIDTH=256&HEIGHT=256`;
          }
          const today = new Date().toISOString().split('T')[0];
          return `https://maps.effis.emergency.copernicus.eu/effis?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=ecmwf007.fwi&STYLES=&FORMAT=image/png&TRANSPARENT=true&SRS=EPSG:3857&BBOX=${bbox}&WIDTH=256&HEIGHT=256&TIME=${today}`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: layerOpacity,
        name: layerName,
      });
    } else {
      const url = tileUrl!;
      climateLayer = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          return url
            .replace('{z}', zoom.toString())
            .replace('{x}', coord.x.toString())
            .replace('{y}', coord.y.toString());
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: layerOpacity,
        name: layerName,
      });
    }

    map.overlayMapTypes.push(climateLayer);
    climateLayerRef.current = climateLayer;

    return () => {
      if (climateLayerRef.current) {
        map.overlayMapTypes.forEach((overlay, index) => {
          if (overlay === climateLayerRef.current) {
            map.overlayMapTypes.removeAt(index);
          }
        });
        climateLayerRef.current = null;
      }
    };
  }, [map, isLoaded, selectedClimateRisk, rainViewerTileUrl]);

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
