import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getCadastreLayerForLocation, CADASTRE_MIN_ZOOM, type CadastreLayerConfig } from '@/config/cadastreLayers';

export interface SelectableCadastreLayerProps {
  enabled: boolean;
  opacity?: number;
  minZoom?: number;
  onParcelSelect?: (parcelData: any) => void;
}

/**
 * Interactive cadastre layer that uses WFS for selectable parcels
 * Falls back to WMS if WFS is not available
 */
export const SelectableCadastreLayer: React.FC<SelectableCadastreLayerProps> = ({
  enabled,
  opacity = 1,
  minZoom = CADASTRE_MIN_ZOOM,
  onParcelSelect,
}) => {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());
  const [currentLayer, setCurrentLayer] = useState<CadastreLayerConfig | undefined>(undefined);
  const [selectedParcel, setSelectedParcel] = useState<any>(null);
  const parcelsLayerRef = useRef<L.GeoJSON | null>(null);
  const wmsLayerRef = useRef<L.TileLayer.WMS | null>(null);

  // Track map events
  useMapEvents({
    zoomend: () => {
      setCurrentZoom(map.getZoom());
    },
    moveend: () => {
      updateCurrentLayer();
      if (enabled && currentZoom >= minZoom) {
        loadParcelsForBounds();
      }
    },
    click: (e) => {
      handleMapClick(e);
    },
  });

  const updateCurrentLayer = () => {
    const center = map.getCenter();
    const layer = getCadastreLayerForLocation(center.lat, center.lng);
    setCurrentLayer(layer);
  };

  const loadParcelsForBounds = useCallback(async () => {
    if (!currentLayer?.wfsUrl || !enabled) {
      createWMSLayer();
      return;
    }

    try {
      const bounds = map.getBounds();
      // INSPIRE WFS uses lat,lon order for EPSG:4326
      const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},EPSG:4326`;

      // Try different WFS parameter combinations for INSPIRE compatibility
      const wfsParams = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: currentLayer.layers, // INSPIRE uses typeNames (plural)
        outputFormat: 'application/json',
        srsName: 'EPSG:4326',
        bbox: bbox,
        count: '100', // INSPIRE uses count instead of maxFeatures
      });

      // Also add typeName for backwards compatibility
      wfsParams.append('typeName', currentLayer.layers);

      const response = await fetch(`${currentLayer.wfsUrl}?${wfsParams}`, {
        headers: {
          'Accept': 'application/json, application/geo+json, */*',
        },
      });

      if (!response.ok) throw new Error(`WFS request failed: ${response.status}`);

      const geojson = await response.json();
      
      // Clear existing parcels layer
      if (parcelsLayerRef.current) {
        map.removeLayer(parcelsLayerRef.current);
      }

      // Create interactive GeoJSON layer
      const parcelsLayer = L.geoJSON(geojson, {
        style: {
          color: '#0252CD',
          weight: 2,
          opacity: 0.8,
          fillColor: '#0252CD',
          fillOpacity: 0.1,
        },
        onEachFeature: (feature, layer) => {
          layer.on('click', (e) => {
            e.originalEvent.stopPropagation();
            handleParcelSelect(feature, layer);
          });

          layer.on('mouseover', () => {
            layer.setStyle({
              weight: 3,
              fillOpacity: 0.2,
            });
          });

          layer.on('mouseout', () => {
            if (selectedParcel?.properties?.id !== feature.properties?.id) {
              layer.setStyle({
                weight: 2,
                fillOpacity: 0.1,
              });
            }
          });
        },
      });

      parcelsLayer.addTo(map);
      parcelsLayerRef.current = parcelsLayer;

    } catch (error) {
      console.warn('Failed to load WFS parcels, falling back to WMS:', error);
      createWMSLayer();
    }
  }, [currentLayer, enabled, map, selectedParcel]);

  const createWMSLayer = useCallback(() => {
    if (!currentLayer || !enabled) return;

    if (wmsLayerRef.current) {
      map.removeLayer(wmsLayerRef.current);
    }

    const wmsParams = {
      layers: currentLayer.layers,
      format: 'image/png',
      transparent: true,
      version: '1.3.0',
      styles: 'default',
    };

    const wmsLayer = L.tileLayer.wms(currentLayer.wmsUrl, {
      ...wmsParams,
      opacity: opacity,
      attribution: currentLayer.attribution,
    });

    wmsLayer.addTo(map);
    wmsLayerRef.current = wmsLayer;
  }, [currentLayer, enabled, map, opacity]);

  const handleParcelSelect = (feature: any, layer: L.Layer) => {
    setSelectedParcel(feature);
    
    // Highlight selected parcel
    if (parcelsLayerRef.current) {
      parcelsLayerRef.current.eachLayer((parcelLayer: any) => {
        const parcelFeature = parcelLayer.feature;
        if (parcelFeature.properties.id === feature.properties.id) {
          parcelLayer.setStyle({
            color: '#FF0000',
            weight: 3,
            fillColor: '#FF0000',
            fillOpacity: 0.3,
          });
        } else {
          parcelLayer.setStyle({
            color: '#0252CD',
            weight: 2,
            fillColor: '#0252CD',
            fillOpacity: 0.1,
          });
        }
      });
    }

    onParcelSelect?.({
      properties: feature.properties,
      geometry: feature.geometry,
      bounds: layer.getBounds(),
    });

    const popupContent = createParcelPopup(feature);
    layer.bindPopup(popupContent).openPopup();
  };

  const handleMapClick = async (e: L.LeafletMouseEvent) => {
    // If we have WFS parcels, just deselect
    if (parcelsLayerRef.current) {
      if (selectedParcel) {
        setSelectedParcel(null);
        parcelsLayerRef.current.eachLayer((layer: any) => {
          layer.setStyle({
            color: '#0252CD',
            weight: 2,
            fillColor: '#0252CD',
            fillOpacity: 0.1,
          });
        });
      }
      return;
    }

    // If we only have WMS layer, use GetFeatureInfo for parcel selection
    if (wmsLayerRef.current && currentLayer && enabled) {
      try {
        const point = map.latLngToContainerPoint(e.latlng);
        const size = map.getSize();
        const bounds = map.getBounds();

        // Build GetFeatureInfo URL
        const params = new URLSearchParams({
          service: 'WMS',
          version: currentLayer.version || '1.3.0',
          request: 'GetFeatureInfo',
          layers: currentLayer.layers,
          query_layers: currentLayer.layers,
          info_format: 'application/json',
          feature_count: '1',
          i: Math.round(point.x).toString(),
          j: Math.round(point.y).toString(),
          width: size.x.toString(),
          height: size.y.toString(),
          crs: 'EPSG:4326',
          bbox: `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`,
        });

        const response = await fetch(`${currentLayer.wmsUrl}?${params}`);
        if (!response.ok) throw new Error('GetFeatureInfo failed');

        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const feature = data.features[0];

          // Create a temporary marker/popup for the selected parcel
          const popup = L.popup()
            .setLatLng(e.latlng)
            .setContent(createParcelPopup(feature))
            .openOn(map);

          setSelectedParcel(feature);
          onParcelSelect?.({
            properties: feature.properties,
            geometry: feature.geometry,
            clickLatLng: e.latlng,
          });
        }
      } catch (error) {
        console.warn('GetFeatureInfo failed:', error);
      }
    }
  };

  const createParcelPopup = (feature: any) => {
    const props = feature.properties || {};

    // INSPIRE and various cadastre systems use different property names
    const parcelId = props.nationalCadastralReference || props.inspireId || props.id || props.ID || props.gml_id || props.PARCEL_ID || props.parcel_id || 'N/A';
    const area = props.areaValue || props.area || props.AREA || props.Area || props.surface || props.SURFACE;
    const label = props.label || props.LABEL || props.name || props.NAME;
    const municipality = props.administrativeUnit || props.municipality || props.MUNICIPALITY || props.KO_NAME || props.cadastralZoning;

    // Format area if available
    const areaStr = area ? `${Number(area).toLocaleString()} m²` : null;

    return `
      <div class="p-2 min-w-[180px]">
        <h3 class="font-bold text-base mb-2">Cadastre Parcel</h3>
        <div class="space-y-1 text-sm">
          <div><strong>ID:</strong> ${parcelId}</div>
          ${areaStr ? `<div><strong>Area:</strong> ${areaStr}</div>` : ''}
          ${label ? `<div><strong>Label:</strong> ${label}</div>` : ''}
          ${municipality ? `<div><strong>Municipality:</strong> ${municipality}</div>` : ''}
        </div>
        <button
          onclick="event.stopPropagation(); window.dispatchEvent(new CustomEvent('parcel-details', { detail: ${JSON.stringify(props).replace(/"/g, '&quot;')} }))"
          class="mt-2 w-full bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700 text-sm"
        >
          Select Parcel
        </button>
      </div>
    `;
  };

  // Initialize
  useEffect(() => {
    updateCurrentLayer();
  }, []);

  // Load parcels when dependencies change
  useEffect(() => {
    if (enabled && currentZoom >= minZoom && currentLayer) {
      loadParcelsForBounds();
    } else {
      // Cleanup when disabled
      if (parcelsLayerRef.current) {
        map.removeLayer(parcelsLayerRef.current);
        parcelsLayerRef.current = null;
      }
      if (wmsLayerRef.current) {
        map.removeLayer(wmsLayerRef.current);
        wmsLayerRef.current = null;
      }
      setSelectedParcel(null);
    }
  }, [enabled, currentZoom, minZoom, currentLayer, loadParcelsForBounds, map]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (parcelsLayerRef.current) map.removeLayer(parcelsLayerRef.current);
      if (wmsLayerRef.current) map.removeLayer(wmsLayerRef.current);
    };
  }, [map]);

  return null;
};

export default SelectableCadastreLayer;