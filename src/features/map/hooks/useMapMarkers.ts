/**
 * useMapMarkers - Handles marker creation, clustering, and hover states
 */
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { Property } from '@/types';

// Property type colors
const PROPERTY_TYPE_COLORS: Record<string, string> = {
  house: '#0252CD',
  apartment: '#28a745',
  villa: '#6f42c1',
  land: '#8B4513',
  other: '#6c757d',
};

// Promotion tier colors
const PROMOTION_TIER_COLORS: Record<string, string> = {
  premium: '#FFB800',
  highlight: '#0EA5E9',
  featured: '#7C3AED',
  standard: '#9ca3af',
};

const formatMarkerPrice = (price: number): string => {
  if (price >= 1000000) {
    const millions = price / 1000000;
    if (millions >= 10) {
      return `€${Math.round(millions)}M`;
    }
    return `€${millions.toFixed(1).replace('.0', '')}M`;
  }
  if (price >= 1000) {
    return `€${Math.round(price / 1000)}K`;
  }
  return `€${price}`;
};

interface UseMapMarkersProps {
  map: google.maps.Map | null;
  isLoaded: boolean;
  properties: Property[];
  showOnlyPromoted: boolean;
  hoveredPropertyId?: string | null;
  onPropertyClick: (property: Property) => void;
}

export const useMapMarkers = ({
  map,
  isLoaded,
  properties,
  showOnlyPromoted,
  hoveredPropertyId,
  onPropertyClick,
}: UseMapMarkersProps) => {
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const markerDivsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Filter valid properties
  const validProperties = useMemo(() => {
    let filtered = properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng)
    );

    if (showOnlyPromoted) {
      filtered = filtered.filter(
        (p) => p.isPromoted && p.promotionEndDate && p.promotionEndDate > Date.now()
      );
    }

    return filtered;
  }, [properties, showOnlyPromoted]);

  // Compute offsets for co-located properties
  const colocatedOffsets = useMemo(() => {
    const offsets = new Map<string, { lat: number; lng: number }>();
    const PRECISION = 5;
    const OFFSET_RADIUS = 0.00015;
    const groups = new Map<string, Property[]>();
    for (const prop of validProperties) {
      if (prop.lat == null || prop.lng == null) continue;
      const key = `${prop.lat.toFixed(PRECISION)},${prop.lng.toFixed(PRECISION)}`;
      const group = groups.get(key);
      if (group) group.push(prop);
      else groups.set(key, [prop]);
    }
    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      const step = (2 * Math.PI) / group.length;
      for (let i = 0; i < group.length; i++) {
        const angle = i * step;
        offsets.set(group[i].id, {
          lat: OFFSET_RADIUS * Math.cos(angle),
          lng: OFFSET_RADIUS * Math.sin(angle),
        });
      }
    }
    return offsets;
  }, [validProperties]);

  // Count promoted properties
  const promotedCount = useMemo(() => {
    return properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng) &&
             p.isPromoted && p.promotionEndDate && p.promotionEndDate > Date.now()
    ).length;
  }, [properties]);

  // Initialize clusterer
  const initializeClusterer = useCallback((mapInstance: google.maps.Map) => {
    const clusterer = new MarkerClusterer({
      map: mapInstance,
      algorithm: new SuperClusterAlgorithm({
        radius: 100,
        maxZoom: 15,
      }),
      renderer: {
        render: ({ count, position }) => {
          const div = document.createElement('div');
          div.className = 'cluster-marker';
          const size = count < 10 ? 28 : count < 50 ? 32 : count < 100 ? 36 : 40;
          div.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(135deg, #0252CD 0%, #0066FF 100%);
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${count < 100 ? 11 : 10}px;
            font-family: Inter, system-ui, sans-serif;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(2, 82, 205, 0.4), 0 1px 3px rgba(0,0,0,0.2);
            transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
          `;
          div.textContent = String(count);
          div.addEventListener('mouseenter', () => {
            div.style.transform = 'scale(1.15)';
            div.style.boxShadow = '0 4px 12px rgba(2, 82, 205, 0.5), 0 2px 4px rgba(0,0,0,0.3)';
          });
          div.addEventListener('mouseleave', () => {
            div.style.transform = 'scale(1)';
            div.style.boxShadow = '0 2px 8px rgba(2, 82, 205, 0.4), 0 1px 3px rgba(0,0,0,0.2)';
          });

          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: div,
          });
        },
      },
    });

    clustererRef.current = clusterer;
    return clusterer;
  }, []);

  // Inject CSS for promoted marker animations
  useEffect(() => {
    const styleId = 'promoted-marker-glow-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes promotedGlow {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.85; transform: scale(1.08); }
      }
      .promoted-marker-premium {
        animation: promotedGlow 2s ease-in-out infinite;
        box-shadow: 0 0 12px 3px rgba(255, 184, 0, 0.7), 0 0 20px 6px rgba(255, 184, 0, 0.4), 0 1px 4px rgba(0,0,0,0.25) !important;
      }
      .promoted-marker-highlight {
        animation: promotedGlow 2s ease-in-out infinite;
        box-shadow: 0 0 12px 3px rgba(14, 165, 233, 0.7), 0 0 20px 6px rgba(14, 165, 233, 0.4), 0 1px 4px rgba(0,0,0,0.25) !important;
      }
      .promoted-marker-featured {
        animation: promotedGlow 2s ease-in-out infinite;
        box-shadow: 0 0 12px 3px rgba(124, 58, 237, 0.7), 0 0 20px 6px rgba(124, 58, 237, 0.4), 0 1px 4px rgba(0,0,0,0.25) !important;
      }
      .promoted-marker-standard {
        animation: promotedGlow 2.5s ease-in-out infinite;
        box-shadow: 0 0 8px 2px rgba(156, 163, 175, 0.6), 0 0 14px 4px rgba(156, 163, 175, 0.3), 0 1px 4px rgba(0,0,0,0.25) !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  // Update markers when properties change
  useEffect(() => {
    if (!map || !clustererRef.current || !isLoaded) return;

    clustererRef.current.clearMarkers();
    markersRef.current.clear();
    markerDivsRef.current.clear();

    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    const BATCH_SIZE = 100;
    let currentIndex = 0;

    const createMarkerBatch = () => {
      const endIndex = Math.min(currentIndex + BATCH_SIZE, validProperties.length);

      for (let i = currentIndex; i < endIndex; i++) {
        const property = validProperties[i];
        const markerDiv = document.createElement('div');
        markerDiv.className = 'property-marker';

        const price = formatMarkerPrice(property.price);
        const color = PROPERTY_TYPE_COLORS[property.propertyType || 'other'] || PROPERTY_TYPE_COLORS.other;
        const isActivelyPromoted = property.isPromoted && property.promotionEndDate && property.promotionEndDate > Date.now();
        let borderColor = 'white';
        let borderWidth = 2;
        if (isActivelyPromoted && property.promotionTier) {
          borderColor = PROMOTION_TIER_COLORS[property.promotionTier] || PROMOTION_TIER_COLORS.standard;
          borderWidth = 3;
          markerDiv.classList.add(`promoted-marker-${property.promotionTier}`);
        }

        markerDiv.style.cssText = `
          padding: 2px 6px;
          background: ${color};
          border: ${borderWidth}px solid ${borderColor};
          border-radius: 999px;
          color: white;
          font-weight: 700;
          font-size: 10px;
          font-family: Inter, system-ui, sans-serif;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          white-space: nowrap;
          user-select: none;
        `;
        markerDiv.textContent = price;

        markerDiv.onmouseenter = () => {
          markerDiv.style.transform = 'scale(1.25) translateY(-2px)';
          markerDiv.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)';
          markerDiv.style.zIndex = '1000';
        };
        markerDiv.onmouseleave = () => {
          markerDiv.style.transform = '';
          markerDiv.style.boxShadow = '';
          markerDiv.style.zIndex = isActivelyPromoted ? '100' : '1';
        };

        markerDiv.onclick = (e) => {
          e.stopPropagation();
          onPropertyClick(property);
        };

        const posOffset = colocatedOffsets.get(property.id);
        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: {
            lat: posOffset ? property.lat + posOffset.lat : property.lat,
            lng: posOffset ? property.lng + posOffset.lng : property.lng,
          },
          content: markerDiv,
          zIndex: isActivelyPromoted ? 100 : 1,
        });

        markers.push(marker);
        markersRef.current.set(property.id, marker);
        markerDivsRef.current.set(property.id, markerDiv);
      }

      currentIndex = endIndex;

      if (currentIndex < validProperties.length) {
        requestAnimationFrame(createMarkerBatch);
      } else {
        clustererRef.current?.addMarkers(markers);
      }
    };

    if (validProperties.length > 0) {
      createMarkerBatch();
    }
  }, [validProperties, map, isLoaded, onPropertyClick, colocatedOffsets]);

  // Handle hover state changes
  useEffect(() => {
    markerDivsRef.current.forEach((div, id) => {
      if (id === hoveredPropertyId) {
        div.style.transform = 'scale(1.2) translateY(-2px)';
        div.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
        div.style.zIndex = '1000';
      } else {
        div.style.transform = 'scale(1)';
        div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
        const prop = validProperties.find(p => p.id === id);
        const isPromoted = prop?.isPromoted && prop?.promotionEndDate && prop.promotionEndDate > Date.now();
        div.style.zIndex = isPromoted ? '100' : '1';
      }
    });
  }, [hoveredPropertyId, validProperties]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    markersRef.current.clear();
    markerDivsRef.current.clear();
  }, []);

  return {
    clustererRef,
    validProperties,
    promotedCount,
    initializeClusterer,
    cleanup,
  };
};
