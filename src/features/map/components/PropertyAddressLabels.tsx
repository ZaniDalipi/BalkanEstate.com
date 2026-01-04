// PropertyAddressLabels Component
// Displays house numbers/addresses on buildings when map tiles aren't detailed enough
// Shows at zoom 19+ when standard tiles lose useful detail

import React, { useMemo } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Property } from '@/types';

interface PropertyAddressLabelsProps {
  properties: Property[];
  enabled: boolean;
  minZoom?: number;
}

/**
 * Extract house number from an address string
 * Handles various formats like "123 Main St", "Main St 123", "Nr. 45", etc.
 */
const extractHouseNumber = (address: string): string | null => {
  if (!address) return null;

  // Common patterns for house numbers in Balkan countries
  // Pattern 1: Number at start "123 Main Street"
  const startMatch = address.match(/^(\d+[a-zA-Z]?)\s/);
  if (startMatch) return startMatch[1];

  // Pattern 2: Number at end "Main Street 123" or "Main Street 123A"
  const endMatch = address.match(/\s(\d+[a-zA-Z]?)$/);
  if (endMatch) return endMatch[1];

  // Pattern 3: "Nr." or "No." prefix
  const nrMatch = address.match(/(?:nr\.?|no\.?)\s*(\d+[a-zA-Z]?)/i);
  if (nrMatch) return nrMatch[1];

  // Pattern 4: Slash format "12/3"
  const slashMatch = address.match(/\s(\d+\/\d+)/);
  if (slashMatch) return slashMatch[1];

  // Pattern 5: Number anywhere in address (less reliable, used as fallback)
  const anyMatch = address.match(/\b(\d{1,4}[a-zA-Z]?)\b/);
  if (anyMatch) return anyMatch[1];

  return null;
};

/**
 * Create a label icon for displaying house numbers on the map
 */
const createAddressLabelIcon = (houseNumber: string, propertyType: string): L.DivIcon => {
  // Colors based on property type for easy identification
  const bgColors: Record<string, string> = {
    house: 'rgba(2, 82, 205, 0.9)',
    apartment: 'rgba(40, 167, 69, 0.9)',
    villa: 'rgba(111, 66, 193, 0.9)',
    other: 'rgba(108, 117, 125, 0.9)',
  };

  const bgColor = bgColors[propertyType] || bgColors.other;

  const html = `
    <div style="
      background: ${bgColor};
      color: white;
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 6px;
      border-radius: 4px;
      border: 2px solid rgba(255,255,255,0.9);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      white-space: nowrap;
      text-align: center;
      min-width: 20px;
      pointer-events: none;
      transform: translateY(-100%);
    ">
      ${houseNumber}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'property-address-label',
    iconSize: [40, 24],
    iconAnchor: [20, 24],
  });
};

/**
 * PropertyAddressLabels Component
 *
 * Renders house number labels for properties when zoomed in far enough
 * that standard map tiles no longer show useful detail.
 * This helps identify specific buildings/parcels when viewing 3D buildings
 * or cadastral data.
 */
const PropertyAddressLabels: React.FC<PropertyAddressLabelsProps> = ({
  properties,
  enabled,
  minZoom = 19,
}) => {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = React.useState(map.getZoom());
  const markersRef = React.useRef<L.Marker[]>([]);

  // Track zoom changes
  useMapEvents({
    zoomend: () => {
      setCurrentZoom(map.getZoom());
    },
  });

  // Should labels be visible?
  const shouldShow = enabled && currentZoom >= minZoom;

  // Extract properties with valid house numbers
  const propertiesWithNumbers = useMemo(() => {
    if (!shouldShow) return [];

    return properties
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        ...p,
        houseNumber: extractHouseNumber(p.address),
      }))
      .filter((p) => p.houseNumber !== null);
  }, [properties, shouldShow]);

  // Create and manage label markers
  React.useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach((marker) => {
      try {
        map.removeLayer(marker);
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    markersRef.current = [];

    if (!shouldShow) return;

    // Get current map bounds for visibility filtering
    const bounds = map.getBounds();

    // Add new markers for visible properties
    propertiesWithNumbers.forEach((prop) => {
      // Only add labels for properties in view
      if (!bounds.contains([prop.lat, prop.lng])) return;

      const icon = createAddressLabelIcon(
        prop.houseNumber!,
        prop.propertyType || 'other'
      );

      const marker = L.marker([prop.lat, prop.lng], {
        icon,
        interactive: false, // Labels shouldn't interfere with map interaction
        zIndexOffset: 500, // Above buildings but below property markers
      });

      marker.addTo(map);
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((marker) => {
        try {
          map.removeLayer(marker);
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      markersRef.current = [];
    };
  }, [map, propertiesWithNumbers, shouldShow]);

  return null;
};

export default PropertyAddressLabels;

// Export helper for use elsewhere
export { extractHouseNumber };
