/**
 * Google Map Sub-components
 * Split from GoogleMapComponent.tsx for better maintainability
 */

// Components
export { default as MapPropertyPopup } from './MapPropertyPopup';
export { default as MapLegend } from './MapLegend';
export { default as ClimateRiskLegend } from './ClimateRiskLegend';

// Constants and utilities
export * from './mapConstants';

// Types
export type { ClimateRiskType, MapStyleType } from './mapConstants';
