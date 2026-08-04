/**
 * useMapMarkers - Handles marker creation, clustering, and hover states
 */
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { Property } from '@/types';
import { VILLA_GOLD, buildEmeraldBeacon } from '@/shared/map/villaMarker';

// Property type colors
const PROPERTY_TYPE_COLORS: Record<string, string> = {
  house: '#0252CD',
  apartment: '#28a745',
  villa: '#6f42c1',
  'luxury-villa': '#FFA500', // Gilded gold — exclusive to the Luxury Villas tab
  land: '#8B4513',
  other: '#0D9488', // Teal — friendlier than the old gray, distinct from the other types
};

// Promotion tier colors
const PROMOTION_TIER_COLORS: Record<string, string> = {
  premium: '#FFB800',
  highlight: '#0EA5E9',
  featured: '#7C3AED',
  standard: '#9ca3af',
};

/** Inject the emerald-beacon + gold-sheen keyframes once (Google map path). */
const injectVillaMarkerStyles = (): void => {
  if (typeof document === 'undefined') return;
  const id = 'villa-google-marker-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    @keyframes villaEmeraldPulseG {
      0%, 100% { opacity: 0.55; transform: scale(0.92); }
      50%      { opacity: 1;    transform: scale(1.18); }
    }
    .villa-g-halo { transform-box: fill-box; transform-origin: center; animation: villaEmeraldPulseG 2.2s ease-in-out infinite; }
    @keyframes villaSheenG {
      0% { opacity: 0; transform: translateX(-60%); }
      45% { opacity: 0.55; }
      100% { opacity: 0; transform: translateX(60%); }
    }
    .villa-g-sheen { transform-box: fill-box; transform-origin: center; animation: villaSheenG 4.5s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
};

/**
 * Build a gilded villa marker (dynamic width) as an SVG string for the
 * Google AdvancedMarkerElement. Gold gabled house, animated sheen, price in
 * the body, crowned with the emerald beacon and anchored on a pin tip.
 */
const buildLuxuryVillaSVG = (price: string, uid: string): string => {
  const W = Math.max(64, price.length * 7 + 22);
  const H = 58;
  const cx = W / 2;
  const scale = 0.82; // display px per viewBox unit
  const gid = `lvG_${uid}`;    // gilded gold gradient (body + roof)
  const clip = `lvClipM_${uid}`;
  const beacon = buildEmeraldBeacon(cx, 9, 4.5, uid, 'villa-g-halo');
  return `<svg width="${Math.round(W * scale)}" height="${Math.round(H * scale)}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 0 8px rgba(232,184,32,0.9)) drop-shadow(0 0 16px rgba(200,150,0,0.55)) drop-shadow(0 2px 5px rgba(0,0,0,0.45));display:block;">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${VILLA_GOLD.light}"/><stop offset="52%" stop-color="${VILLA_GOLD.mid}"/><stop offset="100%" stop-color="${VILLA_GOLD.deep}"/></linearGradient>
      <clipPath id="${clip}"><rect x="4" y="30" width="${W - 8}" height="18" rx="2"/></clipPath>
    </defs>
    <path d="M${cx} ${H} L${cx - 8} 48 H${cx + 8} Z" fill="${VILLA_GOLD.deep}"/>
    <rect x="4" y="30" width="${W - 8}" height="18" rx="2" fill="url(#${gid})" stroke="${VILLA_GOLD.edge}" stroke-width="1.25"/>
    <path class="villa-g-sheen" clip-path="url(#${clip})" d="M${cx - 3} 30 L${cx + 5} 30 L${cx + 1} 48 L${cx - 7} 48 Z" fill="#FFFFFF" opacity="0.5"/>
    <path d="M4 30 L${cx} 15 L${W - 4} 30 Z" fill="url(#${gid})" stroke="${VILLA_GOLD.edge}" stroke-width="1.25" stroke-linejoin="round"/>
    <path d="M${cx - 10} 27 L${cx} 18 L${cx + 10} 27" stroke="${VILLA_GOLD.light}" stroke-width="1" opacity="0.7" fill="none" stroke-linecap="round"/>
    ${beacon}
    <text x="${cx}" y="40" font-family="Inter,sans-serif" font-size="10.5" font-weight="800" fill="${VILLA_GOLD.ink}" text-anchor="middle" dominant-baseline="middle">${price}</text>
  </svg>`;
};

const formatMarkerPrice = (property: Property): string => {
  // Properties listed by negotiation have no fixed price - never show €0
  if (property.isNegotiable || !property.price || property.price <= 0) {
    return 'Negotiable';
  }
  const price = property.price;
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

    injectVillaMarkerStyles();
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

        const price = formatMarkerPrice(property);
        const isActivelyPromoted = property.isPromoted && property.promotionEndDate && property.promotionEndDate > Date.now();
        const isLuxuryVilla = property.propertyType === 'luxury-villa';

        if (isLuxuryVilla) {
          // Gilded villa marker — anchored on its pin tip, no pill chrome
          markerDiv.classList.add('luxury-villa-marker');
          markerDiv.style.cssText = `cursor:pointer;user-select:none;transform-origin:bottom center;transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);`;
          markerDiv.innerHTML = buildLuxuryVillaSVG(price, `${property.id}`.slice(-6) || String(i));

          markerDiv.onmouseenter = () => {
            markerDiv.style.transform = 'scale(1.18) translateY(-2px)';
            markerDiv.style.zIndex = '1000';
          };
          markerDiv.onmouseleave = () => {
            markerDiv.style.transform = '';
            markerDiv.style.zIndex = isActivelyPromoted ? '100' : '2';
          };
        } else {
          const color = PROPERTY_TYPE_COLORS[property.propertyType || 'other'] || PROPERTY_TYPE_COLORS.other;
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
        }

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
      // Villa markers carry their own soft drop-shadow via the SVG filter —
      // a rectangular box-shadow on the transparent wrapper would look wrong.
      const isVilla = div.classList.contains('luxury-villa-marker');
      if (id === hoveredPropertyId) {
        div.style.transform = isVilla ? 'scale(1.18) translateY(-2px)' : 'scale(1.2) translateY(-2px)';
        if (!isVilla) div.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
        div.style.zIndex = '1000';
      } else {
        div.style.transform = isVilla ? '' : 'scale(1)';
        if (!isVilla) div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
        const prop = validProperties.find(p => p.id === id);
        const isPromoted = prop?.isPromoted && prop?.promotionEndDate && prop.promotionEndDate > Date.now();
        div.style.zIndex = isPromoted ? '100' : (isVilla ? '2' : '1');
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
