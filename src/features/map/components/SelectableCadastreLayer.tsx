import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getCadastreLayerForLocation, CADASTRE_MIN_ZOOM, type CadastreLayerConfig } from '../../config/cadastreLayers';

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
      const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

      const wfsParams = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName: currentLayer.layers,
        outputFormat: 'application/json',
        srsName: 'EPSG:4326',
        bbox: bbox,
        maxFeatures: '100',
      });

      const response = await fetch(`${currentLayer.wfsUrl}?${wfsParams}`);
      
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

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (selectedParcel) {
      setSelectedParcel(null);
      if (parcelsLayerRef.current) {
        parcelsLayerRef.current.eachLayer((layer: any) => {
          layer.setStyle({
            color: '#0252CD',
            weight: 2,
            fillColor: '#0252CD',
            fillOpacity: 0.1,
          });
        });
      }
    }
  };

  const createParcelPopup = (feature: any) => {
    const props = feature.properties;
    return `
      <div class="p-2 min-w-[200px]">
        <h3 class="font-bold text-lg mb-2">Cadastre Parcel</h3>
        <div class="space-y-1 text-sm">
          ${props.id ? `<div><strong>ID:</strong> ${props.id}</div>` : ''}
          ${props.area ? `<div><strong>Area:</strong> ${props.area} m²</div>` : ''}
          ${props.cadastre_number ? `<div><strong>Cadastre No:</strong> ${props.cadastre_number}</div>` : ''}
          ${props.municipality ? `<div><strong>Municipality:</strong> ${props.municipality}</div>` : ''}
        </div>
        <button 
          onclick="event.stopPropagation(); window.dispatchEvent(new CustomEvent('parcel-details', { detail: ${JSON.stringify(feature)} }))"
          class="mt-2 w-full bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700 text-sm"
        >
          View Details
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