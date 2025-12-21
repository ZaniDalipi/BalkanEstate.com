// PropertyMapLink Component
// Navigate to search map focused on property location

import React from 'react';
import { Property } from '../../../types';
import { MapPinIcon } from '../../../constants';

interface PropertyMapLinkProps {
  property: Property;
  onNavigateToMap: () => void;
}

/**
 * PropertyMapLink Component
 *
 * Card with button to view property location on search map.
 * When clicked, navigates to search view with map centered on property.
 *
 * Usage:
 * ```tsx
 * <PropertyMapLink
 *   property={property}
 *   onNavigateToMap={() => {
 *     dispatch({ type: 'UPDATE_SEARCH_PAGE_STATE', payload: { focusMapOnProperty: {...} } });
 *     dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
 *   }}
 * />
 * ```
 */
export const PropertyMapLink: React.FC<PropertyMapLinkProps> = ({
  property,
  onNavigateToMap,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200">
      <h3 className="text-lg sm:text-xl font-bold text-neutral-800 mb-4">View on Map</h3>
      <p className="text-neutral-600 mb-4">Want to explore the area around this property?</p>
      <button
        onClick={onNavigateToMap}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors"
      >
        <MapPinIcon className="w-5 h-5" />
        View on Search Map
      </button>
    </div>
  );
};
